export const dynamic = 'force-dynamic';

import { connectDB } from '@/lib/db/connection';
import Product from '@/lib/models/Product';
import Batch from '@/lib/models/Batch';
import StockHeaderClient from '@/components/stock/StockHeaderClient';
import StockManagerClient from '@/components/stock/StockManagerClient';
import dayjs from 'dayjs';

export default async function StockPage() {
    await connectDB();

    const now = dayjs();
    const thirtyDaysFromNow = dayjs().add(30, 'day').toDate();

    // Find all products and batches
    const products = await Product.find({ isActive: true }).lean<any[]>();
    const batches = await Batch.find().populate('productId', 'nameAr nameEn baseUnit lowStockThreshold imageUrl').lean<any[]>();

    const expiredBatches: any[] = [];
    const expiringSoonBatches: any[] = [];
    const lowStockProducts: any[] = [];
    const outOfStockProducts: any[] = [];

    // Process batches for expiration
    batches.forEach(b => {
        const exp = dayjs(b.expirationDate);
        if (exp.isBefore(now)) {
            if (b.floorQty > 0 || b.warehouseQty > 0) expiredBatches.push(b);
        } else if (exp.isBefore(thirtyDaysFromNow)) {
            if (b.floorQty > 0 || b.warehouseQty > 0) expiringSoonBatches.push(b);
        }
    });

    // Process products for stock
    products.forEach(p => {
        const pBatches = batches.filter(b => b.productId?._id?.toString() === p._id.toString());
        const totalQty = pBatches.reduce((acc, b) => acc + b.floorQty + b.warehouseQty, 0);

        if (totalQty === 0) {
            outOfStockProducts.push({ ...p, totalQty });
        } else if (totalQty <= (p.lowStockThreshold || 0)) {
            lowStockProducts.push({ ...p, totalQty });
        }
    });

    // Make data safe for client components (Next.js requirement)
    const safeBatches = JSON.parse(JSON.stringify(batches));
    const safeProducts = JSON.parse(JSON.stringify(products));

    return (
        <div>
            <StockHeaderClient
                outOfStockCount={outOfStockProducts.length}
                lowStockCount={lowStockProducts.length}
                expiredCount={expiredBatches.length}
                expiringSoonCount={expiringSoonBatches.length}
            />

            <StockManagerClient
                safeBatches={safeBatches}
                products={safeProducts}
            />
        </div>
    );
}
