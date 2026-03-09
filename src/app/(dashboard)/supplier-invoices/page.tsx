export const dynamic = 'force-dynamic';

import { Typography, Card, Button, Table, Tag } from 'antd';
import { PlusOutlined, EyeOutlined } from '@ant-design/icons';
import Link from 'next/link';
import ar from '@/i18n/ar';
import { connectDB } from '@/lib/db/connection';
import SupplierInvoice from '@/lib/models/SupplierInvoice';
import { formatPiasters } from '@/utils/money';
import dayjs from 'dayjs';

const { Title } = Typography;

export default async function SupplierInvoicesPage() {
    await connectDB();

    const invoices = await SupplierInvoice.find()
        .populate('supplierId', 'name')
        .sort({ date: -1, createdAt: -1 })
        .lean<any[]>();

    const copyableInvoices = invoices.map(inv => ({
        ...inv,
        _id: inv._id.toString(),
        supplierId: {
            ...inv.supplierId,
            _id: inv.supplierId._id.toString()
        }
    }));

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
                <SupplierInvoiceClientTable data={copyableInvoices} />
            </Card>
        </div>
    );
}

// Inline trivial Client Component for Table rendering
'use client';

function SupplierInvoiceClientTable({ data }: { data: any[] }) {
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
            render: (val: number) => formatPiasters(val),
        },
        {
            title: 'المدفوع',
            dataIndex: 'paidAmount',
            key: 'paidAmount',
            render: (val: number) => <span style={{ color: 'green' }}>{formatPiasters(val)}</span>,
        },
        {
            title: 'المتبقي',
            dataIndex: 'remainingBalance',
            key: 'remainingBalance',
            render: (val: number) => <span style={{ color: val > 0 ? 'red' : 'green' }}>{formatPiasters(val)}</span>,
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
            render: (_: any, record: any) => (
                <Link href={`/supplier-invoices/${record._id}`}>
                    <Button type="text" icon={<EyeOutlined />} size="small" />
                </Link>
            ),
        },
    ];

    return (
        <Table
            columns={columns}
            dataSource={data}
            rowKey="_id"
            pagination={{ pageSize: 20 }}
            scroll={{ x: 'max-content' }}
        />
    );
}
