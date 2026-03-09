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

    // Need string copies for client
    const safeSupplier = { ...supplier, _id: supplier._id.toString() };
    const safeInvoices = recentInvoices.map(i => ({ ...i, _id: i._id.toString(), supplierId: i.supplierId.toString() }));
    const safePayments = recentPayments.map(p => ({
        ...p,
        _id: p._id.toString(),
        supplierId: p.supplierId.toString(),
        supplierInvoiceId: p.supplierInvoiceId ? p.supplierInvoiceId.toString() : null,
        recordedBy: p.recordedBy ? { ...p.recordedBy, _id: p.recordedBy._id.toString() } : null
    }));

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
