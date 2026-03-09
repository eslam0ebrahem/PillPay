import mongoose, { ClientSession, Types } from 'mongoose';
import { connectDB } from '@/lib/db/connection';
import Batch from '@/lib/models/Batch';
import InventoryAuditSession from '@/lib/models/InventoryAuditSession';
import Product from '@/lib/models/Product';
import { logAction } from '@/lib/services/audit.service';
import type { IAuditCount, StockLocation } from '@/lib/types';

interface CountUpdateInput {
    productId: string;
    location: StockLocation;
    actualQty: number;
}

function getLocationField(location: StockLocation) {
    return location === 'floor' ? 'floorQty' : 'warehouseQty';
}

async function applyDiscrepancyToBatches(
    productId: Types.ObjectId,
    location: StockLocation,
    discrepancy: number,
    session: ClientSession
) {
    if (discrepancy === 0) {
        return;
    }

    const field = getLocationField(location);
    const batches = await Batch.find({ productId })
        .sort({ expirationDate: discrepancy > 0 ? 1 : -1, createdAt: 1 })
        .session(session);

    if (discrepancy > 0) {
        if (batches.length > 0) {
            const batch = batches[0];
            batch[field] += discrepancy;
            await batch.save({ session });
            return;
        }

        const batchNumber = `AUDIT-${Date.now()}`;
        await Batch.create(
            [
                {
                    productId,
                    batchNumber,
                    expirationDate: new Date('2099-12-31T00:00:00.000Z'),
                    purchasePrice: 0,
                    warehouseQty: location === 'warehouse' ? discrepancy : 0,
                    floorQty: location === 'floor' ? discrepancy : 0,
                },
            ],
            { session }
        );
        return;
    }

    let remaining = Math.abs(discrepancy);

    for (const batch of batches) {
        if (remaining <= 0) {
            break;
        }

        const available = batch[field];
        if (available <= 0) {
            continue;
        }

        const deduction = Math.min(available, remaining);
        batch[field] -= deduction;
        remaining -= deduction;
        await batch.save({ session });
    }

    if (remaining > 0) {
        throw new Error('لا يمكن اعتماد الجرد لأن الكمية الفعلية أقل من المخزون المسجل بشكل غير منطقي');
    }
}

export async function listInventoryAudits() {
    await connectDB();

    return InventoryAuditSession.find()
        .sort({ startedAt: -1 })
        .populate('startedBy', 'name')
        .lean();
}

export async function startInventoryAudit(userId: string) {
    await connectDB();

    const existing = await InventoryAuditSession.findOne({ status: 'in_progress' });
    if (existing) {
        throw new Error('يوجد جرد مفتوح بالفعل');
    }

    const [products, stock] = await Promise.all([
        Product.find({ isActive: true })
            .select('_id')
            .lean<Array<{ _id: Types.ObjectId }>>(),
        Batch.aggregate([
            {
                $group: {
                    _id: '$productId',
                    warehouseQty: { $sum: '$warehouseQty' },
                    floorQty: { $sum: '$floorQty' },
                },
            },
        ]),
    ]);

    const stockMap = new Map(
        stock.map((entry) => [
            entry._id.toString(),
            {
                warehouseQty: entry.warehouseQty as number,
                floorQty: entry.floorQty as number,
            },
        ])
    );

    const counts: IAuditCount[] = products.flatMap((product) => {
        const quantities = stockMap.get(product._id.toString()) ?? {
            warehouseQty: 0,
            floorQty: 0,
        };

        return [
            {
                productId: product._id,
                location: 'warehouse',
                expectedQty: quantities.warehouseQty,
                actualQty: quantities.warehouseQty,
                discrepancy: 0,
                adjusted: false,
            },
            {
                productId: product._id,
                location: 'floor',
                expectedQty: quantities.floorQty,
                actualQty: quantities.floorQty,
                discrepancy: 0,
                adjusted: false,
            },
        ];
    });

    const auditSession = await InventoryAuditSession.create({
        status: 'in_progress',
        counts,
        startedBy: new Types.ObjectId(userId),
        startedAt: new Date(),
    });

    await logAction({
        userId,
        action: 'INVENTORY_AUDIT_STARTED',
        entityType: 'InventoryAuditSession',
        entityId: auditSession._id.toString(),
        details: { counts: counts.length },
    });

    return auditSession;
}

export async function getInventoryAuditSession(sessionId: string) {
    await connectDB();

    return InventoryAuditSession.findById(sessionId)
        .populate('startedBy', 'name')
        .populate('counts.productId', 'nameAr baseUnit')
        .lean();
}

export async function updateInventoryAuditCounts(
    sessionId: string,
    updates: CountUpdateInput[]
) {
    await connectDB();

    const auditSession = await InventoryAuditSession.findById(sessionId);
    if (!auditSession) {
        throw new Error('جلسة الجرد غير موجودة');
    }

    if (auditSession.status !== 'in_progress') {
        throw new Error('لا يمكن تعديل جلسة جرد مكتملة');
    }

    const updateMap = new Map(
        updates.map((update) => [`${update.productId}-${update.location}`, update.actualQty])
    );

    auditSession.counts = auditSession.counts.map((count: IAuditCount) => {
        const key = `${count.productId.toString()}-${count.location}`;
        const nextQty = updateMap.get(key);

        if (nextQty === undefined) {
            return count;
        }

        count.actualQty = nextQty;
        count.discrepancy = nextQty - count.expectedQty;
        return count;
    });

    await auditSession.save();

    return getInventoryAuditSession(sessionId);
}

export async function approveInventoryAudit(sessionId: string, userId: string) {
    await connectDB();

    const session = await mongoose.startSession();
    session.startTransaction();

    let adjustedCount = 0;

    try {
        const auditSession = await InventoryAuditSession.findById(sessionId).session(session);
        if (!auditSession) {
            throw new Error('جلسة الجرد غير موجودة');
        }

        if (auditSession.status !== 'in_progress') {
            throw new Error('تم اعتماد هذه الجلسة بالفعل');
        }

        for (const count of auditSession.counts) {
            if (count.discrepancy === 0) {
                count.adjusted = true;
                continue;
            }

            await applyDiscrepancyToBatches(
                count.productId,
                count.location,
                count.discrepancy,
                session
            );

            count.adjusted = true;
            adjustedCount += 1;
        }

        auditSession.status = 'completed';
        auditSession.completedAt = new Date();
        await auditSession.save({ session });

        await session.commitTransaction();

        await logAction({
            userId,
            action: 'INVENTORY_AUDIT_APPROVED',
            entityType: 'InventoryAuditSession',
            entityId: sessionId,
            details: { adjustedCount },
        });

        return getInventoryAuditSession(sessionId);
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
}
