'use client';

import { Typography, Card, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import Link from 'next/link';
import SupplierList from '@/components/suppliers/SupplierList';
import PageHeader from '@/components/common/PageHeader';
import ar from '@/i18n/ar';

interface SuppliersPageClientProps {
    data: any[];
}

export default function SuppliersPageClient({ data }: SuppliersPageClientProps) {
    return (
        <div>
            <PageHeader
                title={ar.nav.suppliers}
                extra={
                    <Link href="/suppliers/new">
                        <Button type="primary" icon={<PlusOutlined />}>
                            {ar.suppliers.addSupplier}
                        </Button>
                    </Link>
                }
            />

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
