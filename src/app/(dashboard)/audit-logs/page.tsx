'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Button,
    Card,
    Col,
    DatePicker,
    Form,
    Input,
    Row,
    Select,
    Space,
    Table,
    Tag,
    Typography,
    type TableColumnsType,
} from 'antd';
import PageHeader from '@/components/common/PageHeader';

const { Paragraph, Text } = Typography;

interface AuditLogRow {
    _id: string;
    action: string;
    entityType: string;
    entityId: string;
    invoiceNumber: string | null;
    details: Record<string, unknown> | null;
    timestamp: string;
    user: {
        _id: string;
        name: string;
        email: string;
    } | null;
    product: {
        _id: string;
        nameAr: string;
        barcode: string | null;
    } | null;
}

interface AuditLogsResponse {
    data: AuditLogRow[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}

interface UsersResponse {
    data: Array<{
        _id: string;
        name: string;
        email: string;
    }>;
}

interface ProductsResponse {
    data: Array<{
        _id: string;
        nameAr: string;
        barcode?: string | null;
    }>;
}

interface FilterState {
    userId?: string;
    action?: string;
    entityType?: string;
    invoiceNumber?: string;
    productId?: string;
    from?: string;
    to?: string;
}

const ACTION_OPTIONS = [
    { value: 'SALE_CREATED', label: 'إنشاء فاتورة بيع' },
    { value: 'SALE_CANCELLED', label: 'إلغاء فاتورة بيع' },
    { value: 'REFUND_CREATED', label: 'إنشاء مرتجع' },
    { value: 'STOCK_ADJUSTED', label: 'تعديل مخزون' },
    { value: 'STOCK_TRANSFERRED', label: 'نقل مخزون' },
    { value: 'SUPPLIER_INVOICE_CREATED', label: 'إنشاء فاتورة مورد' },
    { value: 'SUPPLIER_INVOICE_VOIDED', label: 'إلغاء فاتورة مورد' },
    { value: 'SUPPLIER_PAYMENT_RECORDED', label: 'تسجيل دفعة مورد' },
    { value: 'CUSTOMER_PAYMENT_RECORDED', label: 'تسجيل دفعة عميل' },
    { value: 'CUSTOMER_BALANCE_ADJUSTED', label: 'تعديل رصيد عميل' },
    { value: 'SUPPLIER_BALANCE_ADJUSTED', label: 'تعديل رصيد مورد' },
    { value: 'INVENTORY_AUDIT_STARTED', label: 'بدء جرد' },
    { value: 'INVENTORY_AUDIT_APPROVED', label: 'اعتماد جرد' },
    { value: 'USER_CREATED', label: 'إنشاء مستخدم' },
    { value: 'USER_UPDATED', label: 'تحديث مستخدم' },
    { value: 'SETTINGS_UPDATED', label: 'تحديث الإعدادات' },
    { value: 'BACKUP_EXPORTED', label: 'تصدير نسخة احتياطية' },
    { value: 'BACKUP_IMPORTED', label: 'استيراد نسخة احتياطية' },
];

const ENTITY_OPTIONS = [
    { value: 'SaleInvoice', label: 'فاتورة بيع' },
    { value: 'Refund', label: 'مرتجع' },
    { value: 'Batch', label: 'تشغيلة' },
    { value: 'StockTransfer', label: 'نقل مخزون' },
    { value: 'SupplierInvoice', label: 'فاتورة مورد' },
    { value: 'SupplierPayment', label: 'دفعة مورد' },
    { value: 'CustomerPayment', label: 'دفعة عميل' },
    { value: 'BalanceAdjustment', label: 'تعديل رصيد' },
    { value: 'InventoryAuditSession', label: 'جلسة جرد' },
    { value: 'User', label: 'مستخدم' },
    { value: 'Settings', label: 'إعدادات' },
    { value: 'Backup', label: 'نسخة احتياطية' },
];

const initialFilters: FilterState = {};

function buildQueryString(filters: FilterState, page: number, limit: number) {
    const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
    });

    Object.entries(filters).forEach(([key, value]) => {
        if (value) {
            params.set(key, value);
        }
    });

    return params.toString();
}

const columns: TableColumnsType<AuditLogRow> = [
    {
        title: 'التاريخ والوقت',
        dataIndex: 'timestamp',
        key: 'timestamp',
        render: (value: string) =>
            new Date(value).toLocaleString('ar-EG', {
                dateStyle: 'medium',
                timeStyle: 'short',
            }),
    },
    {
        title: 'المستخدم',
        dataIndex: 'user',
        key: 'user',
        render: (user: AuditLogRow['user']) =>
            user ? (
                <Space orientation="vertical" size={0}>
                    <Text strong>{user.name}</Text>
                    <Text type="secondary">{user.email}</Text>
                </Space>
            ) : (
                '-'
            ),
    },
    {
        title: 'الإجراء',
        dataIndex: 'action',
        key: 'action',
        render: (value: string) => <Tag color="blue">{value}</Tag>,
    },
    {
        title: 'الكيان',
        key: 'entity',
        render: (_value, record) => (
            <Space orientation="vertical" size={0}>
                <Text strong>{record.entityType}</Text>
                {record.invoiceNumber ? (
                    <Text type="secondary">الفاتورة: {record.invoiceNumber}</Text>
                ) : null}
                {record.product ? (
                    <Text type="secondary">المنتج: {record.product.nameAr}</Text>
                ) : null}
            </Space>
        ),
    },
    {
        title: 'التفاصيل',
        dataIndex: 'details',
        key: 'details',
        render: (value: AuditLogRow['details']) =>
            value ? (
                <Paragraph
                    style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}
                    ellipsis={{ rows: 3, expandable: true, symbol: 'عرض المزيد' }}
                >
                    {JSON.stringify(value, null, 2)}
                </Paragraph>
            ) : (
                '-'
            ),
    },
];

export default function AuditLogsPage() {
    const [form] = Form.useForm();
    const [filters, setFilters] = useState<FilterState>(initialFilters);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [productSearch, setProductSearch] = useState('');

    const auditLogsQuery = useQuery({
        queryKey: ['audit-logs', filters, page, pageSize],
        queryFn: async () => {
            const response = await fetch(
                `/api/audit-logs?${buildQueryString(filters, page, pageSize)}`
            );

            if (!response.ok) {
                throw new Error('تعذر تحميل سجل المراجعة');
            }

            return (await response.json()) as AuditLogsResponse;
        },
    });

    const usersQuery = useQuery({
        queryKey: ['audit-log-users'],
        queryFn: async () => {
            const response = await fetch('/api/users?limit=100');
            if (!response.ok) {
                return { data: [] } as UsersResponse;
            }

            return (await response.json()) as UsersResponse;
        },
    });

    const productsQuery = useQuery({
        queryKey: ['audit-log-products', productSearch],
        queryFn: async () => {
            const params = new URLSearchParams({ limit: '30' });
            if (productSearch.trim()) {
                params.set('search', productSearch.trim());
            }

            const response = await fetch(`/api/products?${params.toString()}`);
            if (!response.ok) {
                return { data: [] } as ProductsResponse;
            }

            return (await response.json()) as ProductsResponse;
        },
    });

    return (
        <div>
            <PageHeader title="سجل المراجعة" />

            <Card style={{ marginBottom: 16 }}>
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={(values) => {
                        const range = values.dateRange as
                            | [{ format(value: string): string }, { format(value: string): string }]
                            | undefined;

                        setPage(1);
                        setFilters({
                            userId: values.userId || undefined,
                            action: values.action || undefined,
                            entityType: values.entityType || undefined,
                            invoiceNumber: values.invoiceNumber?.trim() || undefined,
                            productId: values.productId || undefined,
                            from: range?.[0]?.format('YYYY-MM-DD'),
                            to: range?.[1]?.format('YYYY-MM-DD'),
                        });
                    }}
                >
                    <Row gutter={16}>
                        <Col xs={24} md={8} lg={6}>
                            <Form.Item name="userId" label="المستخدم">
                                <Select
                                    allowClear
                                    showSearch
                                    optionFilterProp="label"
                                    placeholder="اختر المستخدم"
                                    options={(usersQuery.data?.data ?? []).map((user) => ({
                                        value: user._id,
                                        label: `${user.name} - ${user.email}`,
                                    }))}
                                />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={8} lg={6}>
                            <Form.Item name="action" label="نوع الإجراء">
                                <Select
                                    allowClear
                                    showSearch
                                    optionFilterProp="label"
                                    placeholder="اختر الإجراء"
                                    options={ACTION_OPTIONS}
                                />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={8} lg={6}>
                            <Form.Item name="entityType" label="نوع الكيان">
                                <Select
                                    allowClear
                                    showSearch
                                    optionFilterProp="label"
                                    placeholder="اختر الكيان"
                                    options={ENTITY_OPTIONS}
                                />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12} lg={6}>
                            <Form.Item name="invoiceNumber" label="رقم الفاتورة">
                                <Input placeholder="ابحث برقم الفاتورة" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12} lg={8}>
                            <Form.Item name="productId" label="المنتج">
                                <Select
                                    allowClear
                                    showSearch
                                    filterOption={false}
                                    placeholder="ابحث عن منتج"
                                    onSearch={setProductSearch}
                                    options={(productsQuery.data?.data ?? []).map((product) => ({
                                        value: product._id,
                                        label: product.barcode
                                            ? `${product.nameAr} (${product.barcode})`
                                            : product.nameAr,
                                    }))}
                                />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12} lg={8}>
                            <Form.Item name="dateRange" label="الفترة الزمنية">
                                <DatePicker.RangePicker style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12} lg={8}>
                            <Form.Item label=" ">
                                <Space>
                                    <Button type="primary" htmlType="submit">
                                        تطبيق التصفية
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            form.resetFields();
                                            setPage(1);
                                            setFilters(initialFilters);
                                        }}
                                    >
                                        إعادة تعيين
                                    </Button>
                                </Space>
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            </Card>

            <Card>
                <Table<AuditLogRow>
                    rowKey="_id"
                    columns={columns}
                    dataSource={auditLogsQuery.data?.data ?? []}
                    loading={auditLogsQuery.isLoading}
                    scroll={{ x: 1000 }}
                    pagination={{
                        current: page,
                        pageSize,
                        total: auditLogsQuery.data?.pagination.total ?? 0,
                        showSizeChanger: true,
                        onChange: (nextPage, nextPageSize) => {
                            setPage(nextPage);
                            setPageSize(nextPageSize);
                        },
                    }}
                />
            </Card>
        </div>
    );
}
