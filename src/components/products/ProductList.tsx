'use client';

import { Button, Space, Input, Tag, Select, Typography, Image, Card, Row, Col } from 'antd';
import { EyeOutlined, PictureOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import ar from '@/i18n/ar';
import { formatPiasters } from '@/utils/money';
import BarcodeScanner from '../common/BarcodeScanner';
import ResponsiveDataView from '../common/ResponsiveDataView';
import { DataCard } from '../common/DataCard';

const { Search } = Input;
const { Text } = Typography;

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
    const { data: brandsData } = useQuery({
        queryKey: ['brands-filter'],
        queryFn: async () => {
            const res = await fetch('/api/brands?all=true');
            if (!res.ok) throw new Error('Failed to fetch brands');
            return res.json() as Promise<{ data: any[] }>;
        },
    });

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
                    <div>
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
                    <div>
                        <div>{record.nameAr}</div>
                        {record.nameEn && (
                            <div style={{ color: '#8c8c8c', fontSize: '12px' }}>{record.nameEn}</div>
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
            render: (val: number) => formatPiasters(val),
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
                    <Tag color={color}>
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
                <Tag color={active ? 'blue' : 'default'}>{active ? 'نشط' : 'غير نشط'}</Tag>
            ),
            width: 100,
        },
        {
            title: 'الإجراءات',
            key: 'actions',
            render: (_: any, record: any) => (
                <Space>
                    <Link href={`/products/${record._id}`}>
                        <Button icon={<EyeOutlined />} size="small" type="text" />
                    </Link>
                </Space>
            ),
            width: 100,
        },
    ];

    const renderCard = (record: any) => {
        let stockColor = 'green';
        if (record.totalQty === 0) stockColor = 'red';
        else if (record.totalQty <= record.lowStockThreshold) stockColor = 'gold';

        const brand = record.brand ? (record.brand.nameEn || record.brand.nameAr) : record.manufacturer;

        const titleContent = (
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div>
                    {record.imageUrl ? (
                        <Image
                            src={record.imageUrl}
                            alt={record.nameAr}
                            width={48}
                            height={48}
                            style={{ objectFit: 'cover', borderRadius: 8 }}
                            fallback="https://via.placeholder.com/48?text=No+Image"
                        />
                    ) : (
                        <div style={{ width: 48, height: 48, backgroundColor: '#f5f5f5', display: 'flex', justifyContent: 'center', alignItems: 'center', borderRadius: 8 }}>
                            <PictureOutlined style={{ fontSize: 20, color: '#d9d9d9' }} />
                        </div>
                    )}
                </div>
                <div>
                    <Link href={`/products/${record._id}`}>
                        <div style={{ color: '#1677ff', fontSize: 16, fontWeight: 500 }}>{record.nameAr}</div>
                    </Link>
                    {record.nameEn && <div style={{ color: '#8c8c8c', fontSize: 12 }}>{record.nameEn}</div>}
                </div>
            </div>
        );

        return (
            <DataCard
                title={titleContent}
                badge={
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                        <div style={{ fontWeight: 'bold', fontSize: 16 }}>{formatPiasters(record.sellingPrice)}</div>
                        <Space direction="vertical" size={2} align="end">
                            <Tag color={stockColor} style={{ margin: 0 }}>
                                {record.totalQty} {record.baseUnit}
                            </Tag>
                            {!record.isActive && <Tag color="default" style={{ margin: 0, marginTop: 4 }}>غير نشط</Tag>}
                        </Space>
                    </div>
                }
                properties={[
                    { label: ar.products.barcode, value: record.barcode || '-' },
                    { label: ar.products.brand, value: brand || '-' }
                ]}
                actions={
                    <Link href={`/products/${record._id}`}>
                        <Button type="primary" size="large" icon={<EyeOutlined />} style={{ minWidth: 100 }}>
                            التفاصيل
                        </Button>
                    </Link>
                }
            />
        );
    };

    return (
        <div>
            <div style={{ marginBottom: 16 }}>
                <Space style={{ width: '100%', marginBottom: 12 }} wrap>
                    <Space.Compact style={{ flex: 1, minWidth: 200 }}>
                        <Search
                            placeholder={ar.products.searchPlaceholder}
                            allowClear
                            onSearch={onSearch}
                            style={{ width: '100%' }}
                        />
                        <BarcodeScanner
                            onScan={(text) => onSearch(text)}
                            buttonText=""
                        />
                    </Space.Compact>
                    <Select
                        placeholder={ar.products.brand}
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        style={{ minWidth: 150 }}
                        value={selectedBrand || undefined}
                        onChange={(val) => onBrandFilter?.(val || '')}
                        options={(brandsData?.data || []).map((b: any) => ({
                            value: b._id,
                            label: b.nameEn || b.nameAr,
                        }))}
                    />
                </Space>
            </div>

            <ResponsiveDataView
                data={data}
                loading={loading}
                tableColumns={columns}
                rowKey="_id"
                renderCard={renderCard}
                pagination={pagination}
                tableProps={{
                    onChange: onTableChange,
                    scroll: { x: 'max-content' }
                }}
            />
        </div>
    );
}
