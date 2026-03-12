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
    
    // Resolve searchParams safely
    const params = await searchParams;
    const view = params.view === 'catalog' ? 'catalog' : 'active';
    const brandParam = typeof params.brand === 'string' ? params.brand : '';
    const searchParam = typeof params.search === 'string' ? params.search : '';
    
    // Pagination logic
    const pageParam = typeof params.page === 'string' ? parseInt(params.page, 10) : 1;
    const page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
    const pageSize = 20;
    const skip = (page - 1) * pageSize;

    // Build the MongoDB filter
    const filter: any = { isActive: view !== 'catalog' };

    if (brandParam) {
        filter.brand = brandParam;
    }

    if (searchParam) {
        // Optimization: For barcodes, we check exact match first which is indexed and faster
        filter.$or = [
            { nameAr: { $regex: searchParam, $options: 'i' } },
            { nameEn: { $regex: searchParam, $options: 'i' } },
            { barcode: searchParam },
            { barcode2: searchParam },
        ];
    }

    // Parallel fetch for Products and Total Count
    const [products, total] = await Promise.all([
        Product.find(filter)
            .populate('brand', 'nameAr nameEn image')
            .sort({ nameAr: 1 })
            .skip(skip)
            .limit(pageSize)
            .lean(),
        Product.countDocuments(filter)
    ]);

    // Efficient Stock Aggregation
    // Only fetch stock for the 20 products currently on the screen
    const productIds = products.map((p) => p._id);
    const stockAgg = await Batch.aggregate([
        { $match: { productId: { $in: productIds } } },
        {
            $group: {
                _id: '$productId',
                totalQty: { 
                    $sum: { $add: [{ $ifNull: ['$warehouseQty', 0] }, { $ifNull: ['$floorQty', 0] }] } 
                },
            },
        },
    ]);

    const stockMap = new Map(stockAgg.map((s) => [s._id.toString(), s.totalQty]));

    // Prepare data for Client Component
    const data = JSON.parse(JSON.stringify(products)).map((p: any) => ({
        ...p,
        totalQty: stockMap.get(p._id.toString()) || 0,
    }));

    return (
        <div style={{ paddingBottom: '24px' }}>
            <ProductsPageClient
                data={data}
                view={view}
                selectedBrand={brandParam}
                search={searchParam}
                total={total}
                currentPage={page}
                pageSize={pageSize}
            />
        </div>
    );
}