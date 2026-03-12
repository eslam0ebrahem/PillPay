export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import { connectDB } from '@/lib/db/connection';
import Product from '@/lib/models/Product';
import Batch from '@/lib/models/Batch';
import ProductDetailClient from '@/components/products/ProductDetailClient';

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
    await connectDB();
    const { id } = await params;

    // PERFORMANCE: Fetch product and its batches in parallel
    const [product, batches] = await Promise.all([
        Product.findById(id).populate('brand', 'nameAr nameEn').lean<any>(),
        Batch.find({ productId: id })
            .sort({ expirationDate: 1 })
            .populate('supplierInvoiceId', 'invoiceNumber date')
            .lean<any[]>()
    ]);

    if (!product) {
        notFound();
    }

    // Calculate totals with defensive null checks
    let totalFloorQty = 0;
    let totalWarehouseQty = 0;
    
    batches.forEach(b => {
        totalFloorQty += (b.floorQty || 0);
        totalWarehouseQty += (b.warehouseQty || 0);
    });

    // Deep serialization to prevent Next.js hydration errors with MongoDB types
    const safeProduct = JSON.parse(JSON.stringify(product));
    const safeBatches = JSON.parse(JSON.stringify(batches));

    const stockSummary = {
        totalFloorQty,
        totalWarehouseQty,
        totalQty: totalFloorQty + totalWarehouseQty,
        batchCount: batches.length,
        isLowStock: (totalFloorQty + totalWarehouseQty) <= (product.lowStockThreshold || 0)
    };

    return (
        <div style={{ paddingBottom: '40px' }}>
            <ProductDetailClient
                product={safeProduct}
                batches={safeBatches}
                stockSummary={stockSummary}
            />
        </div>
    );
}