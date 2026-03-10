'use client';

import { Typography, Card, Button, Segmented } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ProductList from '@/components/products/ProductList';
import ar from '@/i18n/ar';

const { Title } = Typography;

interface ProductsPageClientProps {
    data: any[];
    view: 'active' | 'catalog';
}

export default function ProductsPageClient({ data, view }: ProductsPageClientProps) {
    const router = useRouter();

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Title level={2} style={{ margin: 0 }}>
                    {ar.products.title}
                </Title>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <Segmented
                        value={view}
                        options={[
                            { label: ar.products.activeProducts, value: 'active' },
                            { label: ar.products.catalog, value: 'catalog' },
                        ]}
                        onChange={(val) => {
                            router.push(val === 'catalog' ? '/products?view=catalog' : '/products');
                        }}
                    />
                    <Link href="/products/new">
                        <Button type="primary" icon={<PlusOutlined />}>
                            {ar.products.addProduct}
                        </Button>
                    </Link>
                </div>
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
