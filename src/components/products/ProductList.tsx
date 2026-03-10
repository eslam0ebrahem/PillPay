'use client';

import { Table, Button, Space, Input, Tag, Select, Typography, Image } from 'antd';
import { EyeOutlined, PictureOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import ar from '@/i18n/ar';
import { formatPiasters } from '@/utils/money';
import BarcodeScanner from '../common/BarcodeScanner';

const { Search } = Input;

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

    return (
        <div>
            <Space style={{ marginBottom: 16 }} wrap>
                <Search
                    placeholder={ar.products.searchPlaceholder}
                    allowClear
                    onSearch={onSearch}
                    style={{ width: 300 }}
                />
                <BarcodeScanner
                    onScan={(text) => onSearch(text)}
                    buttonProps={{ type: 'default' }}
                />
                <Select
                    placeholder={ar.products.brand}
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    style={{ width: 200 }}
                    value={selectedBrand || undefined}
                    onChange={(val) => onBrandFilter?.(val || '')}
                    options={(brandsData?.data || []).map((b: any) => ({
                        value: b._id,
                        label: b.nameEn || b.nameAr,
                    }))}
                />
            </Space>
            <Table
                columns={columns}
                dataSource={data}
                rowKey="_id"
                pagination={pagination}
                loading={loading}
                onChange={onTableChange}
                scroll={{ x: 'max-content' }}
            />
        </div>
    );
}
