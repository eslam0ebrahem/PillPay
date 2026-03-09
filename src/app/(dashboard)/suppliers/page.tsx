export const dynamic = 'force-dynamic';

import { Typography, Card, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import Link from 'next/link';
import SupplierList from '@/components/suppliers/SupplierList';
import ar from '@/i18n/ar';
import { connectDB } from '@/lib/db/connection';
import Supplier from '@/lib/models/Supplier';

const { Title } = Typography;

export default async function SuppliersPage() {
    await connectDB();

    const suppliers = await Supplier.find().sort({ name: 1 }).lean<any[]>();

    const data = suppliers.map((s) => ({
        ...s,
        _id: s._id.toString(),
    }));

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Title level={2} style={{ margin: 0 }}>
                    {ar.nav.suppliers}
                </Title>
                <Link href="/suppliers/new">
                    <Button type="primary" icon={<PlusOutlined />}>
                        {ar.suppliers.addSupplier}
                    </Button>
                </Link>
            </div>

            <Card>
                <SupplierList
                    data={data}
                    loading={false}
                    onSearch={() => { }}
                />
            </Card>
        </div>
    );
}
