'use client';

import { Table, Input, Button, Space, Tag } from 'antd';
import { SearchOutlined, EditOutlined, EyeOutlined } from '@ant-design/icons';
import Link from 'next/link';
import ar from '@/i18n/ar';
import { formatPiasters } from '@/utils/money';

const { Search } = Input;

interface ProductListProps {
    data: any[];
    loading: boolean;
    pagination: any;
    onTableChange: (pagination: any, filters: any, sorter: any) => void;
    onSearch: (value: string) => void;
}

export default function ProductList({ data, loading, pagination, onTableChange, onSearch }: ProductListProps) {
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
        },
        {
            title: ar.products.category,
            dataIndex: 'category',
            key: 'category',
            width: 150,
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
            <div style={{ marginBottom: 16 }}>
                <Search
                    placeholder={ar.products.searchPlaceholder}
                    allowClear
                    onSearch={onSearch}
                    style={{ width: 300 }}
                />
            </div>
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
