export const dynamic = 'force-dynamic';

import PageHeader from '@/components/common/PageHeader';
import { connectDB } from '@/lib/db/connection';
import Supplier from '@/lib/models/Supplier';
import Product from '@/lib/models/Product';
import NewSupplierInvoiceClientWrapper from '@/components/suppliers/NewSupplierInvoiceClientWrapper';

export default async function NewSupplierInvoicePage() {
    await connectDB();

    const suppliers = await Supplier.find({ isActive: true }).select('name').sort({ name: 1 }).lean<any[]>();
    const products = await Product.find({ isActive: true }).select('nameAr nameEn').sort({ nameAr: 1 }).lean<any[]>();

    const safeSuppliers = suppliers.map(s => ({ ...s, _id: s._id.toString() }));
    const safeProducts = products.map(p => ({ ...p, _id: p._id.toString() }));

    return (
        <div>
            <PageHeader title="تسجيل فاتورة مورد جديدة" />

            <NewSupplierInvoiceClientWrapper suppliers={safeSuppliers} products={safeProducts} />
        </div>
    );
}
