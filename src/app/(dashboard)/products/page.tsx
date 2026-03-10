export const dynamic = 'force-dynamic';

import ProductsPageClient from '@/components/products/ProductsPageClient';
import { connectDB } from '@/lib/db/connection';
import Product from '@/lib/models/Product';
import Brand from '@/lib/models/Brand';
import Batch from '@/lib/models/Batch';

interface ProductsPageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
    await connectDB();
    const params = await searchParams;
    const view = params.view === 'catalog' ? 'catalog' : 'active';
    const brandParam = typeof params.brand === 'string' ? params.brand : '';
    const searchParam = typeof params.search === 'string' ? params.search : '';

    // Build filter
    const filter: any = view === 'catalog' ? { isActive: false } : { isActive: true };

    if (brandParam) {
        filter.brand = brandParam;
    }

    if (searchParam) {
        filter.$or = [
            { nameAr: { $regex: searchParam, $options: 'i' } },
            { nameEn: { $regex: searchParam, $options: 'i' } },
            { barcode: searchParam },
            { barcode2: searchParam },
        ];
    }

    const products = await Product.find(filter)
        .populate('brand', 'nameAr nameEn image')
        .sort({ nameAr: 1 })
        .limit(100)
        .lean<any[]>();

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
        brand: p.brand ? { ...p.brand, _id: (p.brand as any)._id?.toString() } : null,
        totalQty: stockMap.get(p._id.toString()) || 0,
    }));

    return <ProductsPageClient data={data} view={view} selectedBrand={brandParam} search={searchParam} />;
}
