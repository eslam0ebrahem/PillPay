'use client';

import { Button, Space, Input, Tag, Select, Typography, Image, Card, Row, Col } from 'antd';
import { EyeOutlined, PictureOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import ar from '@/i18n/ar';
import { formatPiasters } from '@/utils/money';
import BarcodeScanner from '../common/BarcodeScanner';
import ResponsiveDataView from '../common/ResponsiveDataView';

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

        return (
            <Card size="small" style={{ marginBottom: 12, borderRadius: 12 }}>
                <Row align="middle" style={{ marginBottom: 16 }}>
                    <Col flex="48px">
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
                    </Col>
                    <Col flex="auto" style={{ paddingLeft: 12, paddingRight: 12 }}>
                        <Link href={`/products/${record._id}`}>
                            <Text strong style={{ fontSize: 16, color: '#1677ff' }}>{record.nameAr}</Text>
                        </Link>
                        {record.nameEn && <><br /><Text type="secondary" style={{ fontSize: 12 }}>{record.nameEn}</Text></>}
                        <div style={{ marginTop: 4 }}>
                            <Tag color={stockColor}>
                                {record.totalQty} {record.baseUnit}
                            </Tag>
                            {!record.isActive && <Tag color="default">غير نشط</Tag>}
                        </div>
                    </Col>
                    <Col>
                        {formatPiasters(record.sellingPrice)}
                    </Col>
                </Row>
                <div style={{ background: '#f5f5f5', padding: '8px 12px', borderRadius: 8 }}>
                    <Row justify="space-between">
                        <Col>
                            <Text type="secondary" style={{ fontSize: 12 }}>{ar.products.barcode}:</Text><br />
                            <Text strong>{record.barcode || '-'}</Text>
                        </Col>
                        <Col>
                            <Text type="secondary" style={{ fontSize: 12 }}>{ar.products.brand}:</Text><br />
                            <Text strong>{brand || '-'}</Text>
                        </Col>
                        <Col>
                            <Link href={`/products/${record._id}`}>
                                <Button type="primary" size="small" icon={<EyeOutlined />}>
                                    التفاصيل
                                </Button>
                            </Link>
                        </Col>
                    </Row>
                </div>
            </Card>
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
