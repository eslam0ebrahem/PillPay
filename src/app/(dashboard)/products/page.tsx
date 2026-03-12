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
    const pageParam = typeof params.page === 'string' ? parseInt(params.page, 10) : 1;
    const page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
    const pageSize = 20;
    const skip = (page - 1) * pageSize;

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

    const [products, total] = await Promise.all([
        Product.find(filter)
            .populate('brand', 'nameAr nameEn image')
            .sort({ nameAr: 1 })
            .skip(skip)
            .limit(pageSize)
            .lean<any[]>(),
        Product.countDocuments(filter)
    ]);

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

    // Use deep serialization for Client Components to handle ObjectIds and Dates
    const serializedProducts = JSON.parse(JSON.stringify(products));
    const data = serializedProducts.map((p: any) => ({
        ...p,
        totalQty: stockMap.get(p._id.toString()) || 0,
    }));

    return (
        <ProductsPageClient
            data={data}
            view={view}
            selectedBrand={brandParam}
            search={searchParam}
            total={total}
            currentPage={page}
            pageSize={pageSize}
        />
    );
}
