export const dynamic = 'force-dynamic';

import SupplierInvoicesListClient from '@/components/suppliers/SupplierInvoicesListClient';
import { connectDB } from '@/lib/db/connection';
import SupplierInvoice from '@/lib/models/SupplierInvoice';

export default async function SupplierInvoicesPage() {
    await connectDB();

    const invoices = await SupplierInvoice.find()
        .populate('supplierId', 'name')
        .sort({ date: -1, createdAt: -1 })
        .lean<any[]>();

    const safeInvoices = invoices.map(inv => ({
        ...inv,
        _id: inv._id.toString(),
        supplierId: {
            ...inv.supplierId,
            _id: inv.supplierId?._id?.toString() || ''
        }
    }));

    return <SupplierInvoicesListClient invoices={safeInvoices} />;
}
