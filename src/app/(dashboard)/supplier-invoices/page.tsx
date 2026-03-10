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
        supplierId: inv.supplierId ? {
            ...inv.supplierId,
            _id: inv.supplierId._id?.toString() || ''
        } : null,
        items: inv.items?.map((item: any) => ({
            ...item,
            _id: item._id?.toString(),
            productId: item.productId?.toString(),
            expirationDate: item.expirationDate?.toISOString(),
        })),
        date: inv.date?.toISOString(),
        createdAt: inv.createdAt?.toISOString(),
        updatedAt: inv.updatedAt?.toISOString(),
    }));

    return <SupplierInvoicesListClient invoices={safeInvoices} />;
}
