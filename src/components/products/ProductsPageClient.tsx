'use client';

import { Typography, Card, Button, Segmented, Grid, Flex } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
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
    const screens = useBreakpoint();
    const [mounted, setMounted] = useState(false);

    // Prevent hydration mismatch when using responsive breakpoints
    useEffect(() => {
        setMounted(true);
    }, []);

    const isMobile = screens.xs || (screens.sm && !screens.md);

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
                    // Wait until mounted to prevent UI jumps. 
                    // Flex direction switches to vertical on mobile.
                    mounted && (
                        <Flex 
                            vertical={isMobile} 
                            gap={12} 
                            align={isMobile ? 'stretch' : 'center'} 
                            style={{ width: isMobile ? '100%' : 'auto', marginTop: isMobile ? 12 : 0 }}
                        >
                            <Segmented
                                block={isMobile}
                                size={isMobile ? "large" : "middle"}
                                value={view}
                                options={[
                                    { label: ar.products.activeProducts, value: 'active' },
                                    { label: ar.products.catalog, value: 'catalog' },
                                ]}
                                onChange={(val) => {
                                    router.push(buildUrl({ view: val === 'catalog' ? 'catalog' : undefined }));
                                }}
                            />
                            <Link href="/products/new" style={{ width: isMobile ? '100%' : 'auto' }}>
                                <Button 
                                    type="primary" 
                                    icon={<PlusOutlined />} 
                                    block={isMobile}
                                    size={isMobile ? "large" : "middle"}
                                >
                                    {ar.products.addProduct}
                                </Button>
                            </Link>
                        </Flex>
                    )
                }
            />

            <Card
                variant={isMobile ? 'borderless' : 'outlined'}
                styles={{ 
                    body: { 
                        // Reduce padding drastically on mobile to give more room to the list/cards
                        padding: isMobile ? '12px 0px' : 24 
                    } 
                }}
                style={{
                    backgroundColor: isMobile ? 'transparent' : '#fff',
                    boxShadow: isMobile ? 'none' : undefined
                }}
            >
                <ProductList
                    data={data}
                    loading={false}
                    pagination={{
                        current: currentPage,
                        pageSize: pageSize,
                        total: total,
                        showSizeChanger: false,
                        // Center pagination and make it smaller on mobile
                        size: isMobile ? "small" : "default",
                        style: { justifyContent: 'center', paddingTop: 16 }
                    }}
                    onTableChange={(pagination) => {
                        router.push(buildUrl({ page: pagination.current?.toString() }));
                    }}
                    onSearch={(val) => {
                        router.push(buildUrl({ search: val || undefined, page: '1' })); // Reset to page 1 on new search
                    }}
                    onBrandFilter={(brandId) => {
                        router.push(buildUrl({ brand: brandId || undefined, page: '1' })); // Reset to page 1 on new filter
                    }}
                    selectedBrand={selectedBrand}
                />
            </Card>
        </div>
    );
}