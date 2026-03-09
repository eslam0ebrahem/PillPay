import mongoose, { ClientSession, Types } from 'mongoose';
import { connectDB } from '@/lib/db/connection';
import Batch from '@/lib/models/Batch';
import Customer from '@/lib/models/Customer';
import Refund from '@/lib/models/Refund';
import SaleInvoice from '@/lib/models/SaleInvoice';
import { restoreFloorStock } from '@/lib/services/stock.service';
import type { IBatchAllocation } from '@/lib/types';
import { logAction } from './audit.service';

export interface RefundItemInput {
    productId: string;
    quantity: number;
    unitPrice?: number;
    subtotal?: number;
}

export interface CreateRefundInput {
    originalInvoiceId?: string;
    items: RefundItemInput[];
    customerId?: string;
    userId: string;
}

export interface RefundLookupItem {
    saleItemId: string;
    productId: string;
    productNameAr: string;
    quantity: number;
    refundedQuantity: number;
    refundableQuantity: number;
    unitPrice: number;
    subtotal: number;
    unitSold: 'base' | 'sub';
    displayQuantity: number;
}

export interface RefundLookupResult {
    _id: string;
    invoiceNumber: string;
    status: 'completed' | 'cancelled';
    total: number;
    paidAmount: number;
    remainingBalance: number;
    paymentMode: 'cash' | 'credit' | 'partial';
    createdAt: Date;
    customerId: string | null;
    customerName: string | null;
    items: RefundLookupItem[];
}

interface ProductRefundContext {
    productId: Types.ObjectId;
    productNameAr: string;
    soldQuantity: number;
    soldSubtotal: number;
    allocations: IBatchAllocation[];
    refundedQuantity: number;
    refundedSubtotal: number;
}

function buildInvoiceReferenceQuery(invoiceRef: string) {
    if (Types.ObjectId.isValid(invoiceRef)) {
        return {
            $or: [
                { _id: new Types.ObjectId(invoiceRef) },
                { invoiceNumber: invoiceRef },
            ],
        };
    }

    return { invoiceNumber: invoiceRef };
}

function findInvoiceByReference(
    invoiceRef: string,
    session?: ClientSession
) {
    const query = SaleInvoice.findOne(buildInvoiceReferenceQuery(invoiceRef));

    if (session) {
        query.session(session);
    }

    return query;
}

async function restoreQuantityToFallbackBatch(
    productId: Types.ObjectId,
    quantity: number,
    session: ClientSession
) {
    const batch =
        await Batch.findOne({
            productId,
            expirationDate: { $gte: new Date() },
        })
            .sort({ expirationDate: 1, createdAt: 1 })
            .session(session) ||
        await Batch.findOne({ productId })
            .sort({ expirationDate: 1, createdAt: 1 })
            .session(session);

    if (!batch) {
        throw new Error('لا يمكن إعادة المخزون لصنف لا يحتوي على تشغيلات');
    }

    batch.floorQty += quantity;
    await batch.save({ session });
}

function buildRefundContext(invoice: any, refundAggregates: Array<{ _id: Types.ObjectId; quantity: number; subtotal: number }>) {
    const context = new Map<string, ProductRefundContext>();

    for (const item of invoice.items) {
        const key = item.productId.toString();
        const existing = context.get(key);

        if (existing) {
            existing.soldQuantity += item.quantity;
            existing.soldSubtotal += item.subtotal;
            existing.allocations.push(...item.batchAllocations);
            continue;
        }

        context.set(key, {
            productId: new Types.ObjectId(key),
            productNameAr: item.productNameAr,
            soldQuantity: item.quantity,
            soldSubtotal: item.subtotal,
            allocations: [...item.batchAllocations],
            refundedQuantity: 0,
            refundedSubtotal: 0,
        });
    }

    for (const aggregate of refundAggregates) {
        const key = aggregate._id.toString();
        const existing = context.get(key);

        if (!existing) {
            continue;
        }

        existing.refundedQuantity = aggregate.quantity;
        existing.refundedSubtotal = aggregate.subtotal;
    }

    return context;
}

function calculatePaymentStatus(invoice: { remainingBalance: number; paidAmount: number }) {
    if (invoice.remainingBalance <= 0) {
        return 'paid' as const;
    }

    return invoice.paidAmount > 0 ? 'partial' as const : 'unpaid' as const;
}

export async function getRefundInvoiceLookup(invoiceRef: string): Promise<RefundLookupResult> {
    await connectDB();

    const invoice = await findInvoiceByReference(invoiceRef)
        .populate('customerId', 'name')
        .lean<any>();

    if (!invoice) {
        throw new Error('الفاتورة غير موجودة');
    }

    const refundAggregates = await Refund.aggregate([
        { $match: { originalInvoiceId: invoice._id } },
        { $unwind: '$items' },
        {
            $group: {
                _id: '$items.productId',
                quantity: { $sum: '$items.quantity' },
                subtotal: { $sum: '$items.subtotal' },
            },
        },
    ]);

    const refundableByProduct = new Map(
        refundAggregates.map((aggregate) => [
            aggregate._id.toString(),
            aggregate.quantity as number,
        ])
    );

    const items: RefundLookupItem[] = invoice.items.map((item: any) => {
        const key = item.productId.toString();
        const refundedSoFar = refundableByProduct.get(key) ?? 0;
        const lineRefunded = Math.min(refundedSoFar, item.quantity);
        refundableByProduct.set(key, Math.max(0, refundedSoFar - lineRefunded));

        return {
            saleItemId: item._id.toString(),
            productId: key,
            productNameAr: item.productNameAr,
            quantity: item.quantity,
            refundedQuantity: lineRefunded,
            refundableQuantity: Math.max(0, item.quantity - lineRefunded),
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
            unitSold: item.unitSold,
            displayQuantity: item.displayQuantity,
        };
    });

    const customer = invoice.customerId as { _id?: Types.ObjectId; name?: string } | null;

    return {
        _id: invoice._id.toString(),
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        total: invoice.total,
        paidAmount: invoice.paidAmount,
        remainingBalance: invoice.remainingBalance,
        paymentMode: invoice.paymentMode,
        createdAt: invoice.createdAt,
        customerId: customer?._id?.toString() ?? null,
        customerName: customer?.name ?? null,
        items,
    };
}

export async function createRefund({
    originalInvoiceId,
    items,
    customerId,
    userId,
}: CreateRefundInput) {
    await connectDB();

    if (items.length === 0) {
        throw new Error('يجب اختيار صنف واحد على الأقل');
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    let auditDetails: Record<string, unknown> | undefined;
    let refundDocId = '';
    let createdRefund: any = null;

    try {
        let invoice: any = null;
        let linkedCustomerId: string | undefined;
        const normalizedItems: Array<{
            productId: Types.ObjectId;
            quantity: number;
            unitPrice: number;
            subtotal: number;
        }> = [];

        if (originalInvoiceId) {
            invoice = await findInvoiceByReference(originalInvoiceId, session);
            if (!invoice) {
                throw new Error('الفاتورة غير موجودة');
            }
            if (invoice.status === 'cancelled') {
                throw new Error('لا يمكن إنشاء مرتجع لفاتورة ملغاة');
            }

            const refundAggregates = await Refund.aggregate([
                { $match: { originalInvoiceId: invoice._id } },
                { $unwind: '$items' },
                {
                    $group: {
                        _id: '$items.productId',
                        quantity: { $sum: '$items.quantity' },
                        subtotal: { $sum: '$items.subtotal' },
                    },
                },
            ]).session(session);

            const refundContext = buildRefundContext(invoice, refundAggregates);

            for (const item of items) {
                if (!Types.ObjectId.isValid(item.productId)) {
                    throw new Error('الصنف المحدد غير صالح');
                }

                const productId = new Types.ObjectId(item.productId);
                const productContext = refundContext.get(productId.toString());

                if (!productContext) {
                    throw new Error('أحد الأصناف غير موجود في الفاتورة الأصلية');
                }

                const remainingRefundableQuantity =
                    productContext.soldQuantity - productContext.refundedQuantity;

                if (item.quantity > remainingRefundableQuantity) {
                    throw new Error(`كمية المرتجع تتجاوز الكمية المباعة للصنف ${productContext.productNameAr}`);
                }

                const remainingSubtotal =
                    productContext.soldSubtotal - productContext.refundedSubtotal;

                const subtotal =
                    item.quantity === remainingRefundableQuantity
                        ? Math.max(0, remainingSubtotal)
                        : Math.round((productContext.soldSubtotal / productContext.soldQuantity) * item.quantity);

                const unitPrice =
                    item.quantity > 0 ? Math.round(subtotal / item.quantity) : 0;

                const allocationsToRestore: IBatchAllocation[] = [];
                let remainingToRestore = item.quantity;

                for (const allocation of productContext.allocations) {
                    if (remainingToRestore <= 0) {
                        break;
                    }

                    const quantityToRestore = Math.min(
                        remainingToRestore,
                        allocation.quantity
                    );

                    allocationsToRestore.push({
                        ...allocation,
                        quantity: quantityToRestore,
                    });
                    remainingToRestore -= quantityToRestore;
                }

                if (allocationsToRestore.length > 0) {
                    await restoreFloorStock(allocationsToRestore, session);
                }

                if (remainingToRestore > 0) {
                    await restoreQuantityToFallbackBatch(
                        productId,
                        remainingToRestore,
                        session
                    );
                }

                normalizedItems.push({
                    productId,
                    quantity: item.quantity,
                    unitPrice,
                    subtotal,
                });

                productContext.refundedQuantity += item.quantity;
                productContext.refundedSubtotal += subtotal;
            }

            linkedCustomerId = invoice.customerId?.toString();
        } else {
            for (const item of items) {
                if (!Types.ObjectId.isValid(item.productId)) {
                    throw new Error('الصنف المحدد غير صالح');
                }

                if (item.unitPrice === undefined && item.subtotal === undefined) {
                    throw new Error('يجب تحديد سعر الوحدة أو الإجمالي في المرتجع اليدوي');
                }

                const productId = new Types.ObjectId(item.productId);
                const subtotal =
                    item.subtotal ?? (item.unitPrice as number) * item.quantity;
                const unitPrice =
                    item.unitPrice ?? Math.round(subtotal / item.quantity);

                await restoreQuantityToFallbackBatch(productId, item.quantity, session);

                normalizedItems.push({
                    productId,
                    quantity: item.quantity,
                    unitPrice,
                    subtotal,
                });
            }

            linkedCustomerId = customerId;
        }

        const total = normalizedItems.reduce((sum, item) => sum + item.subtotal, 0);

        const refund = new Refund({
            originalInvoiceId: invoice?._id ?? null,
            items: normalizedItems,
            total,
            customerId: linkedCustomerId ? new Types.ObjectId(linkedCustomerId) : null,
            processedBy: new Types.ObjectId(userId),
        });
        await refund.save({ session });

        if (invoice?.customerId) {
            const debtReduction = Math.min(total, invoice.remainingBalance);

            if (debtReduction > 0) {
                const customer = await Customer.findById(invoice.customerId).session(session);
                if (customer) {
                    customer.totalOwed = Math.max(0, customer.totalOwed - debtReduction);
                    await customer.save({ session });
                }

                invoice.remainingBalance = Math.max(0, invoice.remainingBalance - debtReduction);
                invoice.paymentStatus = calculatePaymentStatus(invoice);
                await invoice.save({ session });
            }
        } else if (linkedCustomerId) {
            const customer = await Customer.findById(linkedCustomerId).session(session);
            if (customer) {
                customer.totalOwed = Math.max(0, customer.totalOwed - total);
                await customer.save({ session });
            }
        }

        await session.commitTransaction();

        refundDocId = refund._id.toString();
        auditDetails = {
            refundNumber: refund.refundNumber,
            originalInvoiceId: invoice?._id?.toString() ?? null,
            total,
            itemCount: normalizedItems.length,
        };
        createdRefund = refund;
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }

    await logAction({
        userId,
        action: 'REFUND_CREATED',
        entityType: 'Refund',
        entityId: refundDocId,
        details: auditDetails,
    });

    return createdRefund;
}

export async function cancelSale(invoiceRef: string, userId: string) {
    await connectDB();

    const session = await mongoose.startSession();
    session.startTransaction();

    let auditDetails: Record<string, unknown> | undefined;
    let invoiceId = '';
    let cancelledInvoice: any = null;

    try {
        const invoice = await findInvoiceByReference(invoiceRef, session);

        if (!invoice) {
            throw new Error('الفاتورة غير موجودة');
        }
        if (invoice.status === 'cancelled') {
            throw new Error('الفاتورة ملغاة بالفعل');
        }

        const refundCount = await Refund.countDocuments({
            originalInvoiceId: invoice._id,
        }).session(session);

        if (refundCount > 0) {
            throw new Error('لا يمكن إلغاء فاتورة تحتوي على مرتجعات سابقة');
        }

        const allocations = invoice.items.flatMap((item: any) => item.batchAllocations);
        if (allocations.length > 0) {
            await restoreFloorStock(allocations, session);
        }

        if (invoice.customerId && invoice.remainingBalance > 0) {
            const customer = await Customer.findById(invoice.customerId).session(session);
            if (customer) {
                customer.totalOwed = Math.max(0, customer.totalOwed - invoice.remainingBalance);
                await customer.save({ session });
            }
        }

        invoice.status = 'cancelled';
        invoice.remainingBalance = 0;
        invoice.paymentStatus = 'paid';
        await invoice.save({ session });

        await session.commitTransaction();

        invoiceId = invoice._id.toString();
        auditDetails = {
            invoiceNumber: invoice.invoiceNumber,
            total: invoice.total,
        };
        cancelledInvoice = invoice;
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }

    await logAction({
        userId,
        action: 'SALE_CANCELLED',
        entityType: 'SaleInvoice',
        entityId: invoiceId,
        details: auditDetails,
    });

    return cancelledInvoice;
}
