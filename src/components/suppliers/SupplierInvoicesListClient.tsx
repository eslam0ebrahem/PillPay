'use client';

import React from 'react';
import { Typography, Button, Tag, Space, Flex, Card } from 'antd';
import { PlusOutlined, EyeOutlined, FileTextOutlined, CalendarOutlined } from '@ant-design/icons';
import Link from 'next/link';
import ar from '@/i18n/ar';
import { formatPiasters } from '@/utils/money';
import dayjs from 'dayjs';
import ResponsiveDataView from '../common/ResponsiveDataView';
import PageHeader from '../common/PageHeader';
import { DataCard } from '../common/DataCard';

const { Text } = Typography;

interface SupplierInvoicesListClientProps {
    invoices: any[];
}

export default function SupplierInvoicesListClient({ invoices }: SupplierInvoicesListClientProps) {
    const columns = [
        {
            title: 'رقم الفاتورة',
            dataIndex: 'invoiceNumber',
            key: 'invoiceNumber',
            render: (text: string, record: any) => (
                <Link href={`/supplier-invoices/${record._id}`}>
                    <Text strong style={{ color: '#1677ff' }}>{text}</Text>
                </Link>
            )
        },
        {
            title: 'المورد',
            dataIndex: ['supplierId', 'name'],
            key: 'supplierName',
        },
        {
            title: 'التاريخ',
            dataIndex: 'date',
            key: 'date',
            render: (date: string) => (
                <Space><CalendarOutlined style={{ color: '#bfbfbf' }} /> {dayjs(date).format('YYYY-MM-DD')}</Space>
            ),
        },
        {
            title: 'إجمالي الفاتورة',
            dataIndex: 'total',
            key: 'total',
            align: 'right' as const,
            render: (value: number) => <Text strong>{formatPiasters(value)}</Text>,
        },
        {
            title: 'المتبقي',
            dataIndex: 'remainingBalance',
            key: 'remainingBalance',
            align: 'right' as const,
            render: (value: number) => (
                <Tag color={value > 0 ? 'error' : 'success'} variant="filled" style={{ borderRadius: 4 }}>
                    {formatPiasters(value)}
                </Tag>
            ),
        },
        {
            title: 'الإجراءات',
            key: 'actions',
            render: (_: unknown, record: any) => (
                <Link href={`/supplier-invoices/${record._id}`}>
                    <Button type="primary" ghost size="small" icon={<EyeOutlined />}>
                        عرض
                    </Button>
                </Link>
            ),
        },
    ];

    const renderCard = (record: any) => {
        const isDebt = record.remainingBalance > 0;
        
        return (
            <DataCard
                title={
                    <Link href={`/supplier-invoices/${record._id}`}>
                        <Text strong style={{ fontSize: 15 }}>{record.supplierId?.name || 'مورد غير معروف'}</Text>
                    </Link>
                }
                subtitle={
                    <Space size="small">
                        <Tag variant="filled">#{record.invoiceNumber}</Tag>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {dayjs(record.date).format('YYYY-MM-DD')}
                        </Text>
                    </Space>
                }
                badge={
                    <div style={{ 
                        textAlign: 'left', 
                        padding: '8px 12px', 
                        background: isDebt ? '#fff1f0' : '#f6ffed', 
                        borderRadius: 8,
                        border: `1px solid ${isDebt ? '#ffa39e' : '#b7eb8f'}`
                    }}>
                        <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>المتبقي (مديونية)</Text>
                        <Text strong style={{ fontSize: 15, color: isDebt ? '#cf1322' : '#389e0d' }}>
                            {formatPiasters(record.remainingBalance)}
                        </Text>
                    </div>
                }
                properties={[
                    { label: 'إجمالي الفاتورة', value: <Text strong>{formatPiasters(record.total)}</Text> },
                    { label: 'المدفوع حالياً', value: <Text style={{ color: '#52c41a' }}>{formatPiasters(record.paidAmount)}</Text> },
                    { 
                        label: 'حالة الفاتورة', 
                        value: (
                            <Tag color={record.status === 'voided' ? 'red' : (isDebt ? 'warning' : 'success')} style={{ margin: 0 }}>
                                {record.status === 'voided' ? 'ملغاة' : (isDebt ? 'تحت التحصيل' : 'خالصة')}
                            </Tag>
                        )
                    }
                ]}
                actions={
                    <Link href={`/supplier-invoices/${record._id}`} style={{ width: '100%' }}>
                        <Button type="primary" block size="large" icon={<FileTextOutlined />}>
                            تفاصيل المشتريات
                        </Button>
                    </Link>
                }
            />
        );
    };

    return (
        <Flex vertical gap={24}>
            <PageHeader
                title={ar.nav.supplierInvoices}
                subtitle="سجل فواتير المشتريات الواردة من الموردين وحالة الدفع"
                extra={
                    <Link href="/supplier-invoices/new">
                        <Button type="primary" icon={<PlusOutlined />} size="large" block>
                            تسجيل فاتورة جديدة
                        </Button>
                    </Link>
                }
            />

            <Card variant="borderless" styles={{ body: { padding: 0 } }} style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <ResponsiveDataView
                    data={invoices}
                    tableColumns={columns}
                    rowKey="_id"
                    renderCard={renderCard}
                    pagination={{ pageSize: 20 }}
                    tableProps={{
                        scroll: { x: 'max-content' }
                    }}
                />
            </Card>
        </Flex>
    );
}