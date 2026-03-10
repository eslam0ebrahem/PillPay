'use client';

import { Typography, Card, Button, Tag, Row, Col } from 'antd';
import { PlusOutlined, EyeOutlined } from '@ant-design/icons';
import Link from 'next/link';
import ar from '@/i18n/ar';
import { formatPiasters } from '@/utils/money';
import dayjs from 'dayjs';
import ResponsiveDataView from '../common/ResponsiveDataView';

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
        <Card size="small" style={{ marginBottom: 12, borderRadius: 12 }}>
            <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
                <Col>
                    <Link href={`/supplier-invoices/${record._id}`}>
                        <Text strong style={{ fontSize: 16, color: '#1677ff' }}>مورد: {record.supplierId?.name || '-'}</Text>
                    </Link>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>رقم: {record.invoiceNumber}</Text>
                </Col>
                <Col style={{ textAlign: 'right' }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>{dayjs(record.date).format('YYYY-MM-DD')}</Text><br />
                    <Tag color={record.status === 'voided' ? 'red' : 'blue'} style={{ marginTop: 4 }}>
                        {record.status === 'voided' ? 'ملغاة' : 'نشطة'}
                    </Tag>
                </Col>
            </Row>

            <div style={{ background: '#f5f5f5', padding: '8px 12px', borderRadius: 8 }}>
                <Row gutter={[8, 8]}>
                    <Col span={8}>
                        <Text type="secondary" style={{ fontSize: 12 }}>الإجمالي</Text><br />
                        <Text strong>{formatPiasters(record.total)}</Text>
                    </Col>
                    <Col span={8}>
                        <Text type="secondary" style={{ fontSize: 12 }}>المدفوع</Text><br />
                        <Text strong style={{ color: 'green' }}>{formatPiasters(record.paidAmount)}</Text>
                    </Col>
                    <Col span={8}>
                        <Text type="secondary" style={{ fontSize: 12 }}>المتبقي</Text><br />
                        <Text strong type={record.remainingBalance > 0 ? 'danger' : 'success'}>
                            {formatPiasters(record.remainingBalance)}
                        </Text>
                    </Col>
                </Row>
            </div>
        </Card>
    );

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
