'use client';

import { Typography, Button, Tag, Space } from 'antd';
import { PlusOutlined, EyeOutlined } from '@ant-design/icons';
import Link from 'next/link';
import ar from '@/i18n/ar';
import { formatPiasters } from '@/utils/money';
import dayjs from 'dayjs';
import ResponsiveDataView from '../common/ResponsiveDataView';
import PageHeader from '../common/PageHeader';
import { DataCard } from '../common/DataCard';

const { Title, Text } = Typography;

interface SupplierInvoicesListClientProps {
    invoices: any[];
}

export default function SupplierInvoicesListClient({ invoices }: SupplierInvoicesListClientProps) {
    const columns = [
        {
            title: 'رقم الفاتورة',
            dataIndex: 'invoiceNumber',
            key: 'invoiceNumber',
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
            render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
        },
        {
            title: 'الإجمالي',
            dataIndex: 'total',
            key: 'total',
            render: (value: number) => formatPiasters(value),
        },
        {
            title: 'المدفوع',
            dataIndex: 'paidAmount',
            key: 'paidAmount',
            render: (value: number) => (
                <span style={{ color: 'green' }}>{formatPiasters(value)}</span>
            ),
        },
        {
            title: 'المتبقي',
            dataIndex: 'remainingBalance',
            key: 'remainingBalance',
            render: (value: number) => (
                <span style={{ color: value > 0 ? 'red' : 'green' }}>
                    {formatPiasters(value)}
                </span>
            ),
        },
        {
            title: 'الحالة',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => (
                <Tag color={status === 'voided' ? 'red' : 'blue'}>
                    {status === 'voided' ? 'ملغاة' : 'نشطة'}
                </Tag>
            ),
        },
        {
            title: 'الإجراءات',
            key: 'actions',
            render: (_: unknown, record: any) => (
                <Link href={`/supplier-invoices/${record._id}`}>
                    <Button type="text" icon={<EyeOutlined />} size="small" />
                </Link>
            ),
        },
    ];

    const renderCard = (record: any) => (
        <DataCard
            title={
                <Link href={`/supplier-invoices/${record._id}`}>
                    <span style={{ color: '#1677ff', fontSize: 16, fontWeight: 500 }}>مورد: {record.supplierId?.name || '-'}</span>
                </Link>
            }
            subtitle={`رقم: ${record.invoiceNumber}`}
            badge={
                <div style={{ textAlign: 'left' }}>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>{dayjs(record.date).format('YYYY-MM-DD')}</Text>
                    <Tag color={record.status === 'voided' ? 'red' : 'blue'} style={{ margin: 0 }}>
                        {record.status === 'voided' ? 'ملغاة' : 'نشطة'}
                    </Tag>
                </div>
            }
            properties={[
                { label: 'الإجمالي', value: formatPiasters(record.total) },
                { label: 'المدفوع', value: <span style={{ color: 'green' }}>{formatPiasters(record.paidAmount)}</span> },
                { 
                    label: 'المتبقي', 
                    value: <span style={{ color: record.remainingBalance > 0 ? 'red' : 'green' }}>{formatPiasters(record.remainingBalance)}</span>,
                    fullWidth: true
                }
            ]}
        />
    );

    return (
        <div>
            <PageHeader
                title={ar.nav.supplierInvoices}
                extra={
                    <Link href="/supplier-invoices/new">
                        <Button type="primary" icon={<PlusOutlined />}>
                            تسجيل فاتورة جديدة
                        </Button>
                    </Link>
                }
            />

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
        </div>
    );
}
