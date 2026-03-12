'use client';

import { Button, Input, Tag, Select, Typography, Image, Grid, Flex, Space } from 'antd';
import { EyeOutlined, PictureOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import ar from '@/i18n/ar';
import { formatPiasters } from '@/utils/money';
import BarcodeScanner from '../common/BarcodeScanner';
import ResponsiveDataView from '../common/ResponsiveDataView';
import { DataCard } from '../common/DataCard';
import { useState, useEffect } from 'react';

const { Search } = Input;
const { Text } = Typography;
const { useBreakpoint } = Grid;

interface ProductListProps {
    data: any[];
    loading: boolean;
    pagination: any;
    onTableChange: (pagination: any, filters: any, sorter: any) => void;
    onSearch: (value: string) => void;
    onBrandFilter?: (brandId: string) => void;
    selectedBrand?: string;
}

export default function ProductList({
    data,
    loading,
    pagination,
    onTableChange,
    onSearch,
    onBrandFilter,
    selectedBrand,
}: ProductListProps) {
    const screens = useBreakpoint();
    const [mounted, setMounted] = useState(false);

    // Prevent Next.js hydration mismatch when using breakpoints
    useEffect(() => {
        setMounted(true);
    }, []);

    const { data: brandsData, isLoading: isLoadingBrands } = useQuery({
        queryKey: ['brands-filter'],
        queryFn: async () => {
            const res = await fetch('/api/brands?all=true');
            if (!res.ok) throw new Error('Failed to fetch brands');
            return res.json() as Promise<{ data: any[] }>;
        },
    });

    const isMobile = screens.xs || (screens.sm && !screens.md);

    // --- Table Columns for Desktop ---
    const columns = [
        {
            title: ar.products.barcode,
            dataIndex: 'barcode',
            key: 'barcode',
            width: 120,
        },
        {
            title: ar.products.nameAr,
            dataIndex: 'nameAr',
            key: 'nameAr',
            render: (_: any, record: any) => (
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ flexShrink: 0 }}>
                        {record.imageUrl ? (
                            <Image
                                src={record.imageUrl}
                                alt={record.nameAr}
                                width={48}
                                height={48}
                                style={{ objectFit: 'cover', borderRadius: 4 }}
                                fallback="https://via.placeholder.com/48?text=No+Image"
                            />
                        ) : (
                            <div style={{ width: 48, height: 48, backgroundColor: '#f5f5f5', display: 'flex', justifyContent: 'center', alignItems: 'center', borderRadius: 4 }}>
                                <PictureOutlined style={{ fontSize: 20, color: '#d9d9d9' }} />
                            </div>
                        )}
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            <Text strong>{record.nameAr}</Text>
                        </div>
                        {record.nameEn && (
                            <div style={{ color: '#8c8c8c', fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {record.nameEn}
                            </div>
                        )}
                    </div>
                </div>
            ),
        },
        {
            title: ar.products.brand,
            key: 'brand',
            width: 150,
            render: (_: any, record: any) => {
                const brand = record.brand;
                if (!brand) return record.manufacturer || '-';
                return brand.nameEn || brand.nameAr || record.manufacturer || '-';
            },
        },
        {
            title: ar.products.sellingPrice,
            dataIndex: 'sellingPrice',
            key: 'sellingPrice',
            render: (val: number) => <Text strong>{formatPiasters(val)}</Text>,
            width: 120,
        },
        {
            title: ar.products.totalStock,
            dataIndex: 'totalQty',
            key: 'totalQty',
            render: (qty: number, record: any) => {
                let color = 'green';
                if (qty === 0) color = 'red';
                else if (qty <= record.lowStockThreshold) color = 'gold';

                return (
                    <Tag color={color} style={{ margin: 0 }}>
                        {qty} {record.baseUnit}
                    </Tag>
                );
            },
            width: 150,
        },
        {
            title: ar.products.isActive,
            dataIndex: 'isActive',
            key: 'isActive',
            render: (active: boolean) => (
                <Tag color={active ? 'blue' : 'default'} style={{ margin: 0 }}>
                    {active ? 'نشط' : 'غير نشط'}
                </Tag>
            ),
            width: 100,
        },
        {
            title: 'الإجراءات',
            key: 'actions',
            render: (_: any, record: any) => (
                <Link href={`/products/${record._id}`}>
                    <Button icon={<EyeOutlined />} size="small" type="primary" ghost />
                </Link>
            ),
            width: 100,
        },
    ];

    // --- Card Render for Mobile ---
    const renderCard = (record: any) => {
        let stockColor = 'green';
        if (record.totalQty === 0) stockColor = 'red';
        else if (record.totalQty <= record.lowStockThreshold) stockColor = 'gold';

        const brand = record.brand ? (record.brand.nameEn || record.brand.nameAr) : record.manufacturer;

        // Structured Header for the Card
        const cardHeader = (
            <Flex gap={12} align="center" style={{ width: '100%' }}>
                <div style={{ flexShrink: 0 }}>
                    {record.imageUrl ? (
                        <Image
                            src={record.imageUrl}
                            alt={record.nameAr}
                            width={56}
                            height={56}
                            style={{ objectFit: 'cover', borderRadius: 8 }}
                            fallback="https://via.placeholder.com/56?text=No+Image"
                        />
                    ) : (
                        <div style={{ width: 56, height: 56, backgroundColor: '#f5f5f5', display: 'flex', justifyContent: 'center', alignItems: 'center', borderRadius: 8 }}>
                            <PictureOutlined style={{ fontSize: 24, color: '#d9d9d9' }} />
                        </div>
                    )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <Link href={`/products/${record._id}`}>
                        <div style={{ 
                            color: '#1677ff', 
                            fontSize: 16, 
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis' 
                        }}>
                            {record.nameAr}
                        </div>
                    </Link>
                    {record.nameEn && (
                        <div style={{ 
                            color: '#8c8c8c', 
                            fontSize: 12,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                        }}>
                            {record.nameEn}
                        </div>
                    )}
                    <div style={{ marginTop: 4 }}>
                        <Tag color={stockColor} style={{ margin: 0 }}>
                            {record.totalQty} {record.baseUnit}
                        </Tag>
                        {!record.isActive && (
                            <Tag color="default" style={{ marginInlineStart: 4, marginInlineEnd: 0 }}>غير نشط</Tag>
                        )}
                    </div>
                </div>
            </Flex>
        );

        return (
            <DataCard
                title={cardHeader}
                // Removed the complex badge to prevent overlapping on small screens, moved price to properties
                properties={[
                    { 
                        label: 'السعر', 
                        value: <Text strong style={{ fontSize: 16, color: '#237804' }}>{formatPiasters(record.sellingPrice)}</Text> 
                    },
                    { label: ar.products.barcode, value: record.barcode || '-' },
                    { label: ar.products.brand, value: brand || '-' }
                ]}
                actions={
                    <Link href={`/products/${record._id}`} style={{ width: '100%', display: 'block' }}>
                        <Button type="primary" size="middle" icon={<EyeOutlined />} block>
                            التفاصيل
                        </Button>
                    </Link>
                }
            />
        );
    };

    if (!mounted) return null; // Avoid hydration mismatch

    return (
        <div>
            {/* Search and Filters Section */}
            <div style={{ marginBottom: 16 }}>
                <Flex 
                    vertical={isMobile} // Stack vertically on mobile, horizontally on desktop
                    gap={12} 
                    align={isMobile ? 'stretch' : 'center'}
                >
                    <Space.Compact style={{ flex: 1, width: '100%' }}>
                        <Search
                            placeholder={ar.products.searchPlaceholder}
                            allowClear
                            onSearch={onSearch}
                            size={isMobile ? "large" : "middle"}
                            style={{ width: '100%' }}
                        />
                        <BarcodeScanner
                            onScan={(text) => onSearch(text)}
                            buttonText=""
                            buttonProps={{ size: isMobile ? 'large' : 'middle' }}
                        />
                    </Space.Compact>
                    
                    <Select
                        placeholder={ar.products.brand}
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        size={isMobile ? "large" : "middle"}
                        style={{ width: isMobile ? '100%' : 200 }}
                        loading={isLoadingBrands}
                        value={selectedBrand || undefined}
                        onChange={(val) => onBrandFilter?.(val || '')}
                        options={(brandsData?.data || []).map((b: any) => ({
                            value: b._id,
                            label: b.nameEn || b.nameAr,
                        }))}
                    />
                </Flex>
            </div>

            {/* Data View */}
            <ResponsiveDataView
                data={data}
                loading={loading}
                tableColumns={columns}
                rowKey="_id"
                renderCard={renderCard}
                pagination={pagination}
                tableProps={{
                    onChange: onTableChange,
                    scroll: { x: 'max-content' },
                    size: 'small'
                }}
            />
        </div>
    );
}