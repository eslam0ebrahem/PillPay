export const dynamic = 'force-dynamic';

import { Typography } from 'antd';
import { notFound } from 'next/navigation';
import { connectDB } from '@/lib/db/connection';
import Product from '@/lib/models/Product';
import Batch from '@/lib/models/Batch';
import ProductDetailClient from '@/components/products/ProductDetailClient';

const { Title } = Typography;

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
    await connectDB();
    const { id } = await params;

    const product = await Product.findById(id).lean<any>();
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

    // Need string copies for client
    const safeProduct = { ...product, _id: product._id.toString() };
    const safeBatches = batches.map(b => ({
        ...b,
        _id: b._id.toString(),
        productId: b.productId.toString(),
        supplierInvoiceId: b.supplierInvoiceId ? b.supplierInvoiceId.toString() : null
    }));

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
