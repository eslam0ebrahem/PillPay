'use client';

import { Typography, Card, Button, Table, Tag } from 'antd';
import { PlusOutlined, EyeOutlined } from '@ant-design/icons';
import Link from 'next/link';
import ar from '@/i18n/ar';
import { formatPiasters } from '@/utils/money';
import dayjs from 'dayjs';

const { Title } = Typography;

interface SupplierInvoicesListClientProps {
    invoices: any[];
}

export default function SupplierInvoicesListClient({ invoices }: SupplierInvoicesListClientProps) {
    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Title level={2} style={{ margin: 0 }}>
                    {ar.nav.supplierInvoices}
                </Title>
                <Link href="/supplier-invoices/new">
                    <Button type="primary" icon={<PlusOutlined />}>
                        تسجيل فاتورة جديدة
                    </Button>
                </Link>
            </div>

            <Card>
                <Table
                    columns={[
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
                    ]}
                    dataSource={invoices}
                    rowKey="_id"
                    pagination={{ pageSize: 20 }}
                    scroll={{ x: 'max-content' }}
                />
            </Card>
        </div>
    );
}
