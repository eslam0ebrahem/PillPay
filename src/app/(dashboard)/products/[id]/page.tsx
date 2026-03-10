export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import { connectDB } from '@/lib/db/connection';
import Product from '@/lib/models/Product';
import Batch from '@/lib/models/Batch';
import ProductDetailClient from '@/components/products/ProductDetailClient';

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
    await connectDB();
    const { id } = await params;

    const product = await Product.findById(id).populate('brand', 'nameAr nameEn').lean<any>();
    if (!product) {
        notFound();
    }

    const batches = await Batch.find({ productId: id })
        .sort({ expirationDate: 1 })
        .populate('supplierInvoiceId', 'invoiceNumber date')
        .lean<any[]>();

    let totalFloorQty = 0;
    let totalWarehouseQty = 0;
    batches.forEach(b => {
        totalFloorQty += b.floorQty;
        totalWarehouseQty += b.warehouseQty;
    });

    // JSON serialization to ensure plain objects for client components
    const safeProduct = JSON.parse(JSON.stringify(product));
    const safeBatches = JSON.parse(JSON.stringify(batches));

    const stockSummary = {
        totalFloorQty,
        totalWarehouseQty,
        totalQty: totalFloorQty + totalWarehouseQty
    };

    return (
        <div>
            <ProductDetailClient
                product={safeProduct}
                batches={safeBatches}
                stockSummary={stockSummary}
            />
        </div>
    );
}
