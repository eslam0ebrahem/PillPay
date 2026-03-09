import { connectDB } from '@/lib/db/connection';
import { ClientSession, Types } from 'mongoose';
import mongoose from 'mongoose';
import Batch from '@/lib/models/Batch';
import StockTransfer from '@/lib/models/StockTransfer';
import { logAction } from './audit.service';
import type { IBatchAllocation } from '@/lib/types';

export interface BatchAllocationResult {
    allocations: IBatchAllocation[];
    allocatedQuantity: number;
}

/**
 * Allocates batches for a specific product using First-Expired-First-Out (FEFO).
 * Note: quantityToAllocate refers to 'base' units.
 */
export async function allocateBatchesFEFO(
    productId: string | Types.ObjectId,
    quantityToAllocate: number,
    session?: ClientSession
): Promise<BatchAllocationResult> {
    let remainingQty = quantityToAllocate;
    const allocations: IBatchAllocation[] = [];

    // 1. Query floor batches sorted by expirationDate asc with floorQty > 0
    const batches = await Batch.find({
        productId: typeof productId === 'string' ? new Types.ObjectId(productId) : productId,
        floorQty: { $gt: 0 },
    })
        .sort({ expirationDate: 1 })
        .session(session || null);

    for (const batch of batches) {
        if (remainingQty <= 0) break;

        const qtyToTake = Math.min(batch.floorQty, remainingQty);

        allocations.push({
            batchId: batch._id as Types.ObjectId,
            quantity: qtyToTake,
            unitCost: batch.purchasePrice,
        });

        remainingQty -= qtyToTake;
    }

    return {
        allocations,
        allocatedQuantity: quantityToAllocate - remainingQty,
    };
}

/**
 * Deducts specified quantities from floor stock for given batch allocations.
 */
export async function deductFloorStock(
    allocations: IBatchAllocation[],
    session: ClientSession
): Promise<void> {
    const updates = allocations.map((alloc) =>
        Batch.findByIdAndUpdate(
            alloc.batchId,
            { $inc: { floorQty: -Math.abs(alloc.quantity) } },
            { session, new: true }
        )
    );

    await Promise.all(updates);
}

/**
 * Restores specified quantities to floor stock (e.g., for cancellations or refunds).
 */
export async function restoreFloorStock(
    allocations: IBatchAllocation[],
    session: ClientSession
): Promise<void> {
    const updates = allocations.map((alloc) =>
        Batch.findByIdAndUpdate(
            alloc.batchId,
            { $inc: { floorQty: Math.abs(alloc.quantity) } },
            { session, new: true }
        )
    );

    await Promise.all(updates);
}

/**
 * Gets total floor stock across all batches for a product.
 */
export async function getProductFloorStock(productId: string | Types.ObjectId): Promise<number> {
    const result = await Batch.aggregate([
        { $match: { productId: typeof productId === 'string' ? new Types.ObjectId(productId) : productId } },
        { $group: { _id: null, total: { $sum: '$floorQty' } } },
    ]);

    return result[0]?.total || 0;
}

/**
 * Gets total warehouse stock across all batches for a product.
 */
export async function getProductWarehouseStock(productId: string | Types.ObjectId): Promise<number> {
    const result = await Batch.aggregate([
        { $match: { productId: typeof productId === 'string' ? new Types.ObjectId(productId) : productId } },
        { $group: { _id: null, total: { $sum: '$warehouseQty' } } },
    ]);

    return result[0]?.total || 0;
}

export async function transferToFloor(
    productId: string,
    batchId: string,
    quantity: number,
    reason: string,
    userId: string
) {
    await connectDB();
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const batch = await Batch.findById(batchId).session(session);
        if (!batch) throw new Error('الدفعة غير موجودة');
        if (batch.productId.toString() !== productId) throw new Error('الدفعة لا تنتمي لهذا المنتج');
        if (batch.warehouseQty < quantity) throw new Error('رصيد المخزن غير كافي');

        batch.warehouseQty -= quantity;
        batch.floorQty += quantity;
        await batch.save({ session });

        const transfer = new StockTransfer({
            productId,
            batchId,
            quantity,
            direction: 'to_floor',
            reason,
            transferredBy: userId,
        });
        await transfer.save({ session });

        await logAction({
            userId,
            action: 'STOCK_TRANSFERRED',
            entityType: 'StockTransfer',
            entityId: transfer._id.toString(),
            details: { direction: 'to_floor', quantity, reason },
        });

        await session.commitTransaction();
        return transfer;
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
}

export async function transferToWarehouse(
    productId: string,
    batchId: string,
    quantity: number,
    reason: string,
    userId: string
) {
    await connectDB();
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const batch = await Batch.findById(batchId).session(session);
        if (!batch) throw new Error('الدفعة غير موجودة');
        if (batch.productId.toString() !== productId) throw new Error('الدفعة لا تنتمي لهذا المنتج');
        if (batch.floorQty < quantity) throw new Error('رصيد الصيدلية غير كافي');

        batch.floorQty -= quantity;
        batch.warehouseQty += quantity;
        await batch.save({ session });

        const transfer = new StockTransfer({
            productId,
            batchId,
            quantity,
            direction: 'to_warehouse',
            reason,
            transferredBy: userId,
        });
        await transfer.save({ session });

        await logAction({
            userId,
            action: 'STOCK_TRANSFERRED',
            entityType: 'StockTransfer',
            entityId: transfer._id.toString(),
            details: { direction: 'to_warehouse', quantity, reason },
        });

        await session.commitTransaction();
        return transfer;
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
}
