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

    // Use JSON serialization for deep copy and conversion of ObjectIds/Dates
    const safeInvoices = JSON.parse(JSON.stringify(invoices));

    return <SupplierInvoicesListClient invoices={safeInvoices} />;
}
