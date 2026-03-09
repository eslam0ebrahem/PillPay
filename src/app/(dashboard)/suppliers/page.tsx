export const dynamic = 'force-dynamic';

import SuppliersPageClient from '@/components/suppliers/SuppliersPageClient';
import { connectDB } from '@/lib/db/connection';
import Supplier from '@/lib/models/Supplier';

export default async function SuppliersPage() {
    await connectDB();

    const suppliers = await Supplier.find().sort({ name: 1 }).lean<any[]>();

    const safeSuppliers = suppliers.map((s) => ({
        ...s,
        _id: s._id.toString(),
    }));

    return <SuppliersPageClient data={safeSuppliers} />;
}
