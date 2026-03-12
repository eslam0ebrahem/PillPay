export const dynamic = 'force-dynamic';

import SuppliersPageClient from '@/components/suppliers/SuppliersPageClient';
import { connectDB } from '@/lib/db/connection';
import Supplier from '@/lib/models/Supplier';

export default async function SuppliersPage() {
    // 1. Establish Database Connection
    await connectDB();

    /**
     * 2. Fetch Suppliers 
     * We sort by name ascending (1) for a logical directory feel.
     * .lean() is used for performance as we don't need Mongoose document methods here.
     */
    const suppliers = await Supplier.find()
        .sort({ name: 1 })
        .lean();

    /**
     * 3. Serialization
     * We use the JSON stringify/parse pattern to strip out Mongoose ObjectIds 
     * and Dates, ensuring the Client Component receives plain JavaScript objects.
     */
    const safeSuppliers = JSON.parse(JSON.stringify(suppliers));

    return (
        <main style={{ minHeight: '100%' }}>
            <SuppliersPageClient data={safeSuppliers} />
        </main>
    );
}