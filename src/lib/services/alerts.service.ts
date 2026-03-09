import { connectDB } from '@/lib/db/connection';
import Product from '@/lib/models/Product';
import Batch from '@/lib/models/Batch';
import { getSettings } from '@/lib/models/Settings';

export interface AlertSummary {
    expiredBatchesCount: number;
    expiringSoonBatchesCount: number;
    lowStockProductsCount: number;
    outOfStockProductsCount: number;
}

export async function getAlertsSummary(): Promise<AlertSummary> {
    await connectDB();
    const settings = await getSettings();

    const now = new Date();
    const expiringSoonThreshold = new Date();
    expiringSoonThreshold.setDate(now.getDate() + settings.expiringSoonDays);

    const [expiredCount, expiringSoonCount, products] = await Promise.all([
        Batch.countDocuments({ expirationDate: { $lt: now } }),
        Batch.countDocuments({
            expirationDate: { $gte: now, $lte: expiringSoonThreshold },
        }),
        Product.find({ isActive: true }).select('_id lowStockThreshold').lean<{ _id: any, lowStockThreshold: number | null }[]>(),
    ]);

    // For stock alerts, we need to aggregate the total quantity across all batches
    // and compare against the product's lowStockThreshold
    const productIds = products.map((p) => p._id);

    const stockAggregation = await Batch.aggregate([
        { $match: { productId: { $in: productIds } } },
        {
            $group: {
                _id: '$productId',
                totalQty: { $sum: { $add: ['$warehouseQty', '$floorQty'] } },
            },
        },
    ]);

    const stockMap = new Map(stockAggregation.map((s) => [s._id.toString(), s.totalQty]));

    let lowStockCount = 0;
    let outOfStockCount = 0;

    for (const product of products) {
        const totalQty = stockMap.get(product._id.toString()) || 0;
        const threshold = product.lowStockThreshold ?? settings.defaultLowStockThreshold;

        if (totalQty === 0) {
            outOfStockCount++;
        } else if (totalQty <= threshold) {
            lowStockCount++;
        }
    }

    return {
        expiredBatchesCount: expiredCount,
        expiringSoonBatchesCount: expiringSoonCount,
        lowStockProductsCount: lowStockCount,
        outOfStockProductsCount: outOfStockCount,
    };
}

// Additional detailed methods can be added here (e.g., list functions for the alerts page)
