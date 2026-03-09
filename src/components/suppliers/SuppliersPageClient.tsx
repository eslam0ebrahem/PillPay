'use client';

import { Typography, Card, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import Link from 'next/link';
import SupplierList from '@/components/suppliers/SupplierList';
import ar from '@/i18n/ar';

const { Title } = Typography;

interface SuppliersPageClientProps {
    data: any[];
}

export default function SuppliersPageClient({ data }: SuppliersPageClientProps) {
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
