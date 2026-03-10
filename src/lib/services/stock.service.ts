import { connectDB } from '@/lib/db/connection';
import { ClientSession, Types } from 'mongoose';
import mongoose from 'mongoose';
import Batch from '@/lib/models/Batch';
import Product from '@/lib/models/Product';
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
    for (const allocation of allocations) {
        const updatedBatch = await Batch.findOneAndUpdate(
            {
                _id: allocation.batchId,
                floorQty: { $gte: Math.abs(allocation.quantity) },
            },
            { $inc: { floorQty: -Math.abs(allocation.quantity) } },
            { session, new: true }
        );

        if (!updatedBatch) {
            throw new Error('تم استهلاك المخزون بواسطة عملية أخرى. يرجى تحديث الشاشة وإعادة المحاولة');
        }
    }
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
            productId,
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
            productId,
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

export interface CreateInitialStockBatchInput {
    productId: string;
    batchNumber: string;
    expirationDate: string;
    quantity: number;
    purchasePrice: number;
    location: 'floor' | 'warehouse';
    notes?: string;
    userId: string;
}

export async function createInitialStockBatch(input: CreateInitialStockBatchInput) {
    await connectDB();
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const product = await Product.findById(input.productId).session(session);
        if (!product) {
            throw new Error('المنتج غير موجود');
        }

        const batch = new Batch({
            productId: input.productId,
            batchNumber: input.batchNumber,
            expirationDate: new Date(input.expirationDate),
            purchasePrice: input.purchasePrice,
            warehouseQty: input.location === 'warehouse' ? input.quantity : 0,
            floorQty: input.location === 'floor' ? input.quantity : 0,
            source: 'initial_stock',
            notes: input.notes || '',
        });
        await batch.save({ session });

        if (!product.isActive) {
            product.isActive = true;
            await product.save({ session });
        }

        await session.commitTransaction();

        await logAction({
            userId: input.userId,
            action: 'INITIAL_STOCK_CREATED',
            entityType: 'Batch',
            entityId: batch._id.toString(),
            productId: input.productId,
            details: {
                batchNumber: input.batchNumber,
                quantity: input.quantity,
                location: input.location,
                purchasePrice: input.purchasePrice,
                notes: input.notes,
            },
        });

        return batch;
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
}

export interface AdjustStockQuantityInput {
    productId: string;
    batchId: string;
    location: 'floor' | 'warehouse';
    newQuantity: number;
    reason: string;
    userId: string;
}

export async function adjustStockQuantity({
    productId,
    batchId,
    location,
    newQuantity,
    reason,
    userId,
}: AdjustStockQuantityInput) {
    await connectDB();
    const session = await mongoose.startSession();
    session.startTransaction();

    let adjustmentResult: {
        batchId: string;
        oldQuantity: number;
        newQuantity: number;
        quantityDiff: number;
        changed: boolean;
    } | null = null;

    try {
        const batch = await Batch.findOne({ _id: batchId, productId }).session(session);
        if (!batch) {
            throw new Error('التشغيلة غير موجودة');
        }

        const product = await Product.findById(productId).session(session);
        if (!product) {
            throw new Error('المنتج غير موجود');
        }

        const oldQuantity = location === 'floor' ? batch.floorQty : batch.warehouseQty;
        const quantityDiff = newQuantity - oldQuantity;

        if (quantityDiff === 0) {
            adjustmentResult = {
                batchId: batch._id.toString(),
                oldQuantity,
                newQuantity,
                quantityDiff,
                changed: false,
            };
            await session.commitTransaction();
            return adjustmentResult;
        }

        if (location === 'floor') {
            batch.floorQty = newQuantity;
        } else {
            batch.warehouseQty = newQuantity;
        }

        await batch.save({ session });
        await session.commitTransaction();

        adjustmentResult = {
            batchId: batch._id.toString(),
            oldQuantity,
            newQuantity,
            quantityDiff,
            changed: true,
        };

        await logAction({
            userId,
            action: 'STOCK_ADJUSTED',
            entityType: 'Batch',
            entityId: batch._id.toString(),
            productId: product._id.toString(),
            details: {
                location,
                oldQuantity,
                newQuantity,
                diff: quantityDiff,
                reason,
            },
        });

        return adjustmentResult;
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
}
