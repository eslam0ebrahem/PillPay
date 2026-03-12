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

    // PERFORMANCE FIX: Parallelize data fetching to eliminate the "Waterfall" effect
    // We fetch everything at once rather than waiting for each to finish sequentially.
    const [supplier, recentInvoices, recentPayments] = await Promise.all([
        Supplier.findById(id).lean(),
        SupplierInvoice.find({ supplierId: id })
            .sort({ date: -1 })
            .limit(10)
            .lean(),
        SupplierPayment.find({ supplierId: id })
            .sort({ date: -1 })
            .populate('recordedBy', 'name')
            .limit(10)
            .lean()
    ]);

    // Handle non-existent IDs gracefully
    if (!supplier) {
        notFound();
    }

    /**
     * Deep serialization for Client Components.
     * This converts MongoDB ObjectIds and Dates into plain strings to prevent 
     * Next.js hydration errors.
     */
    const serialize = (obj: any) => JSON.parse(JSON.stringify(obj));

    return (
        <div style={{ minHeight: '100%', paddingBottom: '2rem' }}>
            <SupplierDetailClient
                supplier={serialize(supplier)}
                recentInvoices={serialize(recentInvoices)}
                recentPayments={serialize(recentPayments)}
            />
        </div>
    );
}