'use client';

import { Input, Button, Space, Tag, Typography } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import Link from 'next/link';
import ar from '@/i18n/ar';
import { formatPiasters } from '@/utils/money';
import ResponsiveDataView from '../common/ResponsiveDataView';
import { DataCard } from '../common/DataCard';

const { Search } = Input;
const { Text } = Typography;

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

    const renderCard = (record: any) => (
        <DataCard
            title={
                <Link href={`/suppliers/${record._id}`}>
                    <span style={{ color: '#1677ff', fontSize: 16, fontWeight: 500 }}>{record.name}</span>
                </Link>
            }
            subtitle={!record.isActive ? <Tag color="default">غير نشط</Tag> : undefined}
            badge={
                <div style={{ textAlign: 'left' }}>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>إجمالي المديونية</Text>
                    <Text strong type={record.totalOwed > 0 ? 'danger' : 'success'} style={{ fontSize: 16 }}>
                        {formatPiasters(record.totalOwed || 0)}
                    </Text>
                </div>
            }
            properties={[
                { label: ar.suppliers.phone, value: record.phone || '-' },
                { label: ar.suppliers.contactPerson, value: record.contactPerson || '-' }
            ]}
            actions={
                <Link href={`/suppliers/${record._id}`}>
                    <Button type="primary" size="large" icon={<EyeOutlined />}>
                        التفاصيل
                    </Button>
                </Link>
            }
        />
    );

    return (
        <div>
            <div style={{ marginBottom: 16 }}>
                <Search
                    placeholder="ابحث باسم المورد أو الهاتف..."
                    allowClear
                    onSearch={onSearch}
                    style={{ width: '100%', maxWidth: 400 }}
                    size="large"
                />
            </div>

            <ResponsiveDataView
                data={data}
                tableColumns={columns}
                rowKey="_id"
                loading={loading}
                renderCard={renderCard}
                tableProps={{
                    scroll: { x: 'max-content' }
                }}
            />
        </div>
    );
}
