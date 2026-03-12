export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import { connectDB } from '@/lib/db/connection';
import Supplier from '@/lib/models/Supplier';
import SupplierInvoice from '@/lib/models/SupplierInvoice';
import SupplierPayment from '@/lib/models/SupplierPayment';
import SupplierDetailClient from '@/components/suppliers/SupplierDetailClient';

export default async function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
    await connectDB();
    const { id } = await params;

    const supplier = await Supplier.findById(id).lean<any>();
    if (!supplier) {
        notFound();
    }

    const recentInvoices = await SupplierInvoice.find({ supplierId: id })
        .sort({ date: -1 })
        .limit(10)
        .lean<any[]>();

    const recentPayments = await SupplierPayment.find({ supplierId: id })
        .sort({ date: -1 })
        .populate('recordedBy', 'name')
        .limit(10)
        .lean<any[]>();

    // JSON serialization to ensure plain objects for client components
    const safeSupplier = JSON.parse(JSON.stringify(supplier));
    const safeInvoices = JSON.parse(JSON.stringify(recentInvoices));
    const safePayments = JSON.parse(JSON.stringify(recentPayments));

    return (
        <div>
            <SupplierDetailClient
                supplier={safeSupplier}
                recentInvoices={safeInvoices}
                recentPayments={safePayments}
            />
        </div>
    );
}
