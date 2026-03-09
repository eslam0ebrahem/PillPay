import { connectDB } from '@/lib/db/connection';
import Product from '@/lib/models/Product';
import Batch from '@/lib/models/Batch';
import { getSettings } from '@/lib/models/Settings';
import { Types } from 'mongoose';

export interface ExpiredBatchProduct {
    _id: string;
    nameAr: string;
    batchCount: number;
}

export interface ExpiringSoonProduct {
    _id: string;
    nameAr: string;
    earliestExpiry: string;
    batchCount: number;
}

export interface LowStockProduct {
    _id: string;
    nameAr: string;
    floorStock: number;
    lowStockThreshold: number;
}

export interface OutOfStockProduct {
    _id: string;
    nameAr: string;
    floorStock: number;
}

export interface AlertsDetail {
    expired: ExpiredBatchProduct[];
    expiringSoon: ExpiringSoonProduct[];
    lowStock: LowStockProduct[];
    outOfStock: OutOfStockProduct[];
}

export interface AlertSummary {
    expiredBatchesCount: number;
    expiringSoonBatchesCount: number;
    lowStockProductsCount: number;
    outOfStockProductsCount: number;
}

/**
 * Get products that have expired batches (with floor or warehouse stock > 0).
 */
export async function getExpiredBatches(): Promise<ExpiredBatchProduct[]> {
    await connectDB();
    const now = new Date();

    const results = await Batch.aggregate([
        {
            $match: {
                expirationDate: { $lt: now },
                $expr: { $gt: [{ $add: ['$warehouseQty', '$floorQty'] }, 0] },
            },
        },
        {
            $group: {
                _id: '$productId',
                batchCount: { $sum: 1 },
            },
        },
        {
            $lookup: {
                from: 'products',
                localField: '_id',
                foreignField: '_id',
                as: 'product',
            },
        },
        { $unwind: '$product' },
        {
            $project: {
                _id: { $toString: '$_id' },
                nameAr: '$product.nameAr',
                batchCount: 1,
            },
        },
    ]);

    return results;
}

/**
 * Get products that have batches expiring soon (within settings.expiringSoonDays).
 */
export async function getExpiringSoonBatches(): Promise<ExpiringSoonProduct[]> {
    await connectDB();
    const settings = await getSettings();

    const now = new Date();
    const threshold = new Date();
    threshold.setDate(now.getDate() + settings.expiringSoonDays);

    const results = await Batch.aggregate([
        {
            $match: {
                expirationDate: { $gte: now, $lte: threshold },
                $expr: { $gt: [{ $add: ['$warehouseQty', '$floorQty'] }, 0] },
            },
        },
        {
            $group: {
                _id: '$productId',
                batchCount: { $sum: 1 },
                earliestExpiry: { $min: '$expirationDate' },
            },
        },
        {
            $lookup: {
                from: 'products',
                localField: '_id',
                foreignField: '_id',
                as: 'product',
            },
        },
        { $unwind: '$product' },
        {
            $project: {
                _id: { $toString: '$_id' },
                nameAr: '$product.nameAr',
                earliestExpiry: {
                    $dateToString: { format: '%Y-%m-%d', date: '$earliestExpiry' },
                },
                batchCount: 1,
            },
        },
    ]);

    return results;
}

/**
 * Get active products with floor stock below their low stock threshold.
 */
export async function getLowStockProducts(): Promise<LowStockProduct[]> {
    await connectDB();
    const settings = await getSettings();

    const results = await Batch.aggregate([
        {
            $group: {
                _id: '$productId',
                floorStock: { $sum: '$floorQty' },
            },
        },
        {
            $lookup: {
                from: 'products',
                localField: '_id',
                foreignField: '_id',
                as: 'product',
            },
        },
        { $unwind: '$product' },
        { $match: { 'product.isActive': true } },
        {
            $addFields: {
                threshold: {
                    $ifNull: ['$product.lowStockThreshold', settings.defaultLowStockThreshold],
                },
            },
        },
        {
            $match: {
                floorStock: { $gt: 0 },
                $expr: { $lte: ['$floorStock', '$threshold'] },
            },
        },
        {
            $project: {
                _id: { $toString: '$_id' },
                nameAr: '$product.nameAr',
                floorStock: 1,
                lowStockThreshold: '$threshold',
            },
        },
    ]);

    return results;
}

/**
 * Get active products with zero floor stock.
 */
export async function getOutOfStockProducts(): Promise<OutOfStockProduct[]> {
    await connectDB();

    // Get all active products
    const activeProducts = await Product.find({ isActive: true })
        .select('_id nameAr')
        .lean<{ _id: Types.ObjectId; nameAr: string }[]>();

    if (activeProducts.length === 0) return [];

    const productIds = activeProducts.map((p) => p._id);

    // Get floor stock per product
    const stockAgg = await Batch.aggregate([
        { $match: { productId: { $in: productIds } } },
        {
            $group: {
                _id: '$productId',
                floorStock: { $sum: '$floorQty' },
            },
        },
    ]);

    const stockMap = new Map(stockAgg.map((s) => [s._id.toString(), s.floorStock]));

    const outOfStock: OutOfStockProduct[] = [];
    for (const product of activeProducts) {
        const floorStock = stockMap.get(product._id.toString()) ?? 0;
        if (floorStock === 0) {
            outOfStock.push({
                _id: product._id.toString(),
                nameAr: product.nameAr,
                floorStock: 0,
            });
        }
    }

    return outOfStock;
}

/**
 * Get all alerts with detailed product lists.
 */
export async function getAlertsDetail(): Promise<AlertsDetail> {
    await connectDB();

    const [expired, expiringSoon, lowStock, outOfStock] = await Promise.all([
        getExpiredBatches(),
        getExpiringSoonBatches(),
        getLowStockProducts(),
        getOutOfStockProducts(),
    ]);

    return { expired, expiringSoon, lowStock, outOfStock };
}

/**
 * Get alert counts summary for the dashboard.
 */
export async function getAlertsSummary(): Promise<AlertSummary> {
    const detail = await getAlertsDetail();

    return {
        expiredBatchesCount: detail.expired.length,
        expiringSoonBatchesCount: detail.expiringSoon.length,
        lowStockProductsCount: detail.lowStock.length,
        outOfStockProductsCount: detail.outOfStock.length,
    };
}
