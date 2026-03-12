export const dynamic = 'force-dynamic';

import SupplierInvoicesListClient from '@/components/suppliers/SupplierInvoicesListClient';
import { connectDB } from '@/lib/db/connection';
import SupplierInvoice from '@/lib/models/SupplierInvoice';

export default async function SupplierInvoicesPage() {
    // 1. Establish Database Connection
    await connectDB();

    /**
     * 2. Fetch Invoices
     * We populate 'supplierId' to get the name for the list view.
     * We sort by date (descending) so the newest purchases appear first.
     */
    const invoices = await SupplierInvoice.find()
        .populate('supplierId', 'name')
        .sort({ date: -1, createdAt: -1 })
        .lean();

    /**
     * 3. Deep Serialization
     * Invoices contain nested arrays (items) with their own ObjectIds and Dates.
     * This utility pattern ensures the entire tree is safe for Client Components.
     */
    const safeInvoices = JSON.parse(JSON.stringify(invoices));

    return (
        <main style={{ minHeight: '100%' }}>
            <SupplierInvoicesListClient invoices={safeInvoices} />
        </main>
    );
}