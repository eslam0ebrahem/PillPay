'use client';

import { Typography, Card, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import Link from 'next/link';
import ProductList from '@/components/products/ProductList';
import ar from '@/i18n/ar';

const { Title } = Typography;

interface ProductsPageClientProps {
    data: any[];
}

export default function ProductsPageClient({ data }: ProductsPageClientProps) {
    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Title level={2} style={{ margin: 0 }}>
                    {ar.products.title}
                </Title>
                <Link href="/products/new">
                    <Button type="primary" icon={<PlusOutlined />}>
                        {ar.products.addProduct}
                    </Button>
                </Link>
            </div>

            <Card>
                <ProductList
                    data={data}
                    loading={false}
                    pagination={{ pageSize: 20 }}
                    onTableChange={() => { }}
                    onSearch={() => { }}
                />
            </Card>
        </div>
    );
}
