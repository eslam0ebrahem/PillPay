export const dynamic = 'force-dynamic';

import { Typography } from 'antd';
import { connectDB } from '@/lib/db/connection';
import Supplier from '@/lib/models/Supplier';
import Product from '@/lib/models/Product';
import NewSupplierInvoiceClientWrapper from '@/components/suppliers/NewSupplierInvoiceClientWrapper';

const { Title } = Typography;

export default async function NewSupplierInvoicePage() {
    await connectDB();

    const suppliers = await Supplier.find({ isActive: true }).select('name').sort({ name: 1 }).lean<any[]>();
    const products = await Product.find({ isActive: true }).select('nameAr nameEn').sort({ nameAr: 1 }).lean<any[]>();

    const safeSuppliers = suppliers.map(s => ({ ...s, _id: s._id.toString() }));
    const safeProducts = products.map(p => ({ ...p, _id: p._id.toString() }));

    return (
        <div>
            <Title level={2} style={{ marginBottom: 24 }}>
                تسجيل فاتورة مورد جديدة
            </Title>

            <NewSupplierInvoiceClientWrapper suppliers={safeSuppliers} products={safeProducts} />
        </div>
    );
}
