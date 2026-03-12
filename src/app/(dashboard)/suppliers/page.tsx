export const dynamic = 'force-dynamic';

import SuppliersPageClient from '@/components/suppliers/SuppliersPageClient';
import { connectDB } from '@/lib/db/connection';
import Supplier from '@/lib/models/Supplier';

export default async function SuppliersPage() {
    await connectDB();

    const suppliers = await Supplier.find().sort({ name: 1 }).lean<any[]>();

    // Use deep serialization for Client Components to handle ObjectIds and Dates
    const safeSuppliers = JSON.parse(JSON.stringify(suppliers));

    return <SuppliersPageClient data={safeSuppliers} />;
}
