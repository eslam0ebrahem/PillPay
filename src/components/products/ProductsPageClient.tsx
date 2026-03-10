'use client';

import { Typography, Card, Button, Segmented, Grid } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import ProductList from '@/components/products/ProductList';
import PageHeader from '@/components/common/PageHeader';
import ar from '@/i18n/ar';

const { Title } = Typography;
const { useBreakpoint } = Grid;

interface ProductsPageClientProps {
    data: any[];
    view: 'active' | 'catalog';
    selectedBrand?: string;
    search?: string;
    total: number;
    currentPage: number;
    pageSize: number;
}

export default function ProductsPageClient({ data, view, selectedBrand, search, total, currentPage, pageSize }: ProductsPageClientProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    function buildUrl(overrides: Record<string, string | undefined>) {
        const params = new URLSearchParams();
        const current = {
            view: view === 'catalog' ? 'catalog' : undefined,
            brand: selectedBrand || undefined,
            search: search || undefined,
            page: currentPage > 1 ? currentPage.toString() : undefined,
            ...overrides,
        };
        for (const [key, val] of Object.entries(current)) {
            if (val) params.set(key, val);
        }
        const qs = params.toString();
        return `/products${qs ? `?${qs}` : ''}`;
    }

    return (
        <div>
            <PageHeader
                title={ar.products.title}
                extra={
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <Segmented
                            value={view}
                            options={[
                                { label: ar.products.activeProducts, value: 'active' },
                                { label: ar.products.catalog, value: 'catalog' },
                            ]}
                            onChange={(val) => {
                                router.push(buildUrl({ view: val === 'catalog' ? 'catalog' : undefined }));
                            }}
                        />
                        <Link href="/products/new">
                            <Button type="primary" icon={<PlusOutlined />}>
                                {ar.products.addProduct}
                            </Button>
                        </Link>
                    </div>
                }
            />

            <Card>
                <ProductList
                    data={data}
                    loading={false}
                    pagination={{
                        current: currentPage,
                        pageSize: pageSize,
                        total: total,
                        showSizeChanger: false
                    }}
                    onTableChange={(pagination) => {
                        router.push(buildUrl({ page: pagination.current?.toString() }));
                    }}
                    onSearch={(val) => {
                        router.push(buildUrl({ search: val || undefined }));
                    }}
                    onBrandFilter={(brandId) => {
                        router.push(buildUrl({ brand: brandId || undefined }));
                    }}
                    selectedBrand={selectedBrand}
                />
            </Card>
        </div>
    );
}
