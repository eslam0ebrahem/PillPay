'use client';

import { Table, Input, Button, Space, Tag } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import Link from 'next/link';
import ar from '@/i18n/ar';
import { formatPiasters } from '@/utils/money';

const { Search } = Input;

interface SupplierListProps {
    data: any[];
    loading: boolean;
    onSearch: (value: string) => void;
}

export default function SupplierList({ data, loading, onSearch }: SupplierListProps) {
    const columns = [
        {
            title: ar.suppliers.name,
            dataIndex: 'name',
            key: 'name',
        },
        {
            title: ar.suppliers.phone,
            dataIndex: 'phone',
            key: 'phone',
        },
        {
            title: ar.suppliers.contactPerson,
            dataIndex: 'contactPerson',
            key: 'contactPerson',
        },
        {
            title: ar.suppliers.totalOwed,
            dataIndex: 'totalOwed',
            key: 'totalOwed',
            render: (val: number) => {
                const color = val > 0 ? 'red' : 'green';
                return <Tag color={color}>{formatPiasters(val || 0)}</Tag>;
            },
        },
        {
            title: 'الحالة',
            dataIndex: 'isActive',
            key: 'isActive',
            render: (active: boolean) => (
                <Tag color={active ? 'blue' : 'default'}>{active ? 'نشط' : 'غير نشط'}</Tag>
            ),
        },
        {
            title: 'الإجراءات',
            key: 'actions',
            render: (_: any, record: any) => (
                <Space>
                    <Link href={`/suppliers/${record._id}`}>
                        <Button icon={<EyeOutlined />} size="small" type="text" />
                    </Link>
                </Space>
            ),
        },
    ];

    return (
        <div>
            <div style={{ marginBottom: 16 }}>
                <Search
                    placeholder="ابحث باسم المورد أو الهاتف..."
                    allowClear
                    onSearch={onSearch}
                    style={{ width: 300 }}
                />
            </div>
            <Table
                columns={columns}
                dataSource={data}
                rowKey="_id"
                loading={loading}
                scroll={{ x: 'max-content' }}
            />
        </div>
    );
}
