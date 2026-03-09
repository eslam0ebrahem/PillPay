export const dynamic = 'force-dynamic';

import ProductsPageClient from '@/components/products/ProductsPageClient';
import { connectDB } from '@/lib/db/connection';
import Product from '@/lib/models/Product';
import Batch from '@/lib/models/Batch';

export default async function ProductsPage() {
    await connectDB();

    // Fetch products
    const products = await Product.find().sort({ nameAr: 1 }).lean<any[]>();

    // Calculate aggregated stock for display
    const stockAgg = await Batch.aggregate([
        {
            $group: {
                _id: '$productId',
                totalQty: { $sum: { $add: ['$warehouseQty', '$floorQty'] } },
            },
        },
    ]);

    const stockMap = new Map(stockAgg.map((s) => [s._id.toString(), s.totalQty]));

    const data = products.map((p) => ({
        ...p,
        _id: p._id.toString(),
        totalQty: stockMap.get(p._id.toString()) || 0,
    }));

    return <ProductsPageClient data={data} />;
}
