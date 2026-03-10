export const dynamic = 'force-dynamic';

import ProductsPageClient from '@/components/products/ProductsPageClient';
import { connectDB } from '@/lib/db/connection';
import Product from '@/lib/models/Product';
import Batch from '@/lib/models/Batch';

interface ProductsPageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
    await connectDB();
    const params = await searchParams;
    const view = params.view === 'catalog' ? 'catalog' : 'active';

    // Fetch products based on view
    const filter = view === 'catalog' ? { isActive: false } : { isActive: true };
    const products = await Product.find(filter).sort({ nameAr: 1 }).lean<any[]>();

    // Calculate aggregated stock for display
    const productIds = products.map((p) => p._id);
    const stockAgg = await Batch.aggregate([
        { $match: { productId: { $in: productIds } } },
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

    return <ProductsPageClient data={data} view={view} />;
}
