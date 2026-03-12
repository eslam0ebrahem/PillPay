export const dynamic = 'force-dynamic';

import { connectDB } from '@/lib/db/connection';
import Product from '@/lib/models/Product';
import Batch from '@/lib/models/Batch';
import StockHeaderClient from '@/components/stock/StockHeaderClient';
import StockManagerClient from '@/components/stock/StockManagerClient';
import dayjs from 'dayjs';

export default async function StockPage() {
    await connectDB();

    const now = new Date();
    const thirtyDaysFromNow = dayjs().add(30, 'day').toDate();

    // PERFORMANCE FIX: Use Promise.all to fetch data in parallel instead of sequentially
    const [products, batches] = await Promise.all([
        Product.find({ isActive: true }).lean(),
        Batch.find()
            .populate('productId', 'nameAr nameEn baseUnit lowStockThreshold imageUrl')
            .lean()
    ]);

    // Data categorization buckets
    const expiredBatches: any[] = [];
    const expiringSoonBatches: any[] = [];
    const lowStockProducts: any[] = [];
    const outOfStockProducts: any[] = [];

    // Optimization: Pre-calculate product stock levels using a Map for O(1) lookup
    const productStockMap = new Map<string, number>();

    batches.forEach((b: any) => {
        const totalBatchQty = (b.floorQty || 0) + (b.warehouseQty || 0);
        const productId = b.productId?._id?.toString();

        if (productId) {
            const currentTotal = productStockMap.get(productId) || 0;
            productStockMap.set(productId, currentTotal + totalBatchQty);
        }

        // Process expiration alerts
        const expDate = new Date(b.expirationDate);
        if (totalBatchQty > 0) {
            if (expDate < now) {
                expiredBatches.push(b);
            } else if (expDate < thirtyDaysFromNow) {
                expiringSoonBatches.push(b);
            }
        }
    });

    // Determine low/out of stock products
    products.forEach((p: any) => {
        const totalQty = productStockMap.get(p._id.toString()) || 0;

        if (totalQty === 0) {
            outOfStockProducts.push({ ...p, totalQty });
        } else if (totalQty <= (p.lowStockThreshold || 0)) {
            lowStockProducts.push({ ...p, totalQty });
        }
    });

    // Deep serialization for Next.js Client Components
    const serialize = (data: any) => JSON.parse(JSON.stringify(data));

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Contextual Stats Header */}
            <StockHeaderClient
                outOfStockCount={outOfStockProducts.length}
                lowStockCount={lowStockProducts.length}
                expiredCount={expiredBatches.length}
                expiringSoonCount={expiringSoonBatches.length}
            />

            {/* Main Inventory Manager */}
            <div className="stock-content-wrapper">
                <StockManagerClient
                    safeBatches={serialize(batches)}
                    products={serialize(products)}
                />
            </div>
        </div>
    );
}