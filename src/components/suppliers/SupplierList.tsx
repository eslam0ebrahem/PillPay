'use client';

import { Input, Button, Space, Tag, Typography, Flex } from 'antd';
import { EyeOutlined, PhoneOutlined, UserOutlined } from '@ant-design/icons';
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
            render: (text: string, record: any) => (
                <Link href={`/suppliers/${record._id}`}>
                    <Text strong style={{ color: '#1677ff' }}>{text}</Text>
                </Link>
            )
        },
        {
            title: ar.suppliers.phone,
            dataIndex: 'phone',
            key: 'phone',
            render: (phone: string) => phone ? (
                <a href={`tel:${phone}`} style={{ color: 'inherit' }}>
                    <Space><PhoneOutlined style={{ color: '#52c41a' }} /> {phone}</Space>
                </a>
            ) : '-'
        },
        {
            title: ar.suppliers.totalOwed,
            dataIndex: 'totalOwed',
            key: 'totalOwed',
            render: (val: number) => {
                const isDebt = val > 0;
                return (
                    <Tag 
                        color={isDebt ? 'error' : 'success'} 
                        style={{ borderRadius: 6, padding: '2px 8px' }}
                    >
                        {formatPiasters(val || 0)}
                    </Tag>
                );
            },
        },
        {
            title: 'الإجراءات',
            key: 'actions',
            align: 'center' as const,
            render: (_: any, record: any) => (
                <Link href={`/suppliers/${record._id}`}>
                    <Button icon={<EyeOutlined />} type="primary" ghost size="small">
                        عرض
                    </Button>
                </Link>
            ),
        },
    ];

    const renderCard = (record: any) => (
        <DataCard
            title={
                <Link href={`/suppliers/${record._id}`}>
                    <Text strong style={{ fontSize: 16 }}>{record.name}</Text>
                </Link>
            }
            subtitle={
                <Flex gap={8} align="center">
                    {!record.isActive && <Tag color="default">غير نشط</Tag>}
                    <Tag variant="filled" color="blue">{record.contactPerson || 'بدون مسؤول'}</Tag>
                </Flex>
            }
            badge={
                <div style={{ textAlign: 'left', padding: '8px', background: record.totalOwed > 0 ? '#fff1f0' : '#f6ffed', borderRadius: 8 }}>
                    <Text type="secondary" style={{ fontSize: 10, display: 'block', textTransform: 'uppercase' }}>
                        {ar.suppliers.totalOwed}
                    </Text>
                    <Text strong style={{ fontSize: 16, color: record.totalOwed > 0 ? '#cf1322' : '#389e0d' }}>
                        {formatPiasters(record.totalOwed || 0)}
                    </Text>
                </div>
            }
            properties={[
                { 
                    label: ar.suppliers.phone, 
                    value: record.phone ? (
                        <a href={`tel:${record.phone}`} style={{ color: '#1677ff', fontWeight: 500 }}>
                            <PhoneOutlined /> {record.phone}
                        </a>
                    ) : '-' 
                },
                { 
                    label: 'المسؤول', 
                    value: <Space><UserOutlined style={{ fontSize: 12 }} /> {record.contactPerson || '-'}</Space> 
                }
            ]}
            actions={
                <Link href={`/suppliers/${record._id}`} style={{ width: '100%' }}>
                    <Button type="primary" block size="large" icon={<EyeOutlined />} style={{ borderRadius: 8 }}>
                        ملف المورد
                    </Button>
                </Link>
            }
        />
    );

    return (
        <div style={{ padding: '16px' }}>
            <div style={{ marginBottom: 20 }}>
                <Search
                    placeholder="ابحث باسم المورد أو رقم الهاتف..."
                    allowClear
                    onSearch={onSearch}
                    style={{ width: '100%' }}
                    size="large"
                    enterButton
                />
            </div>

            <ResponsiveDataView
                data={data}
                tableColumns={columns}
                rowKey="_id"
                loading={loading}
                renderCard={renderCard}
                pagination={{ pageSize: 10, size: 'small' }}
            />
        </div>
    );
}