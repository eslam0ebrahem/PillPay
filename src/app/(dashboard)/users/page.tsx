'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Button,
    Card,
    Checkbox,
    Col,
    Divider,
    Drawer,
    Form,
    Input,
    Modal,
    Row,
    Select,
    Space,
    Switch,
    Table,
    Tag,
    Typography,
    message,
    type TableColumnsType,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import PageHeader from '@/components/common/PageHeader';
import {
    ALL_PERMISSIONS,
    CASHIER_DEFAULT_PERMISSIONS,
    type PermissionKey,
    type UserRole,
} from '@/lib/types';

const { Text } = Typography;

interface UserRecord {
    _id: string;
    name: string;
    email: string;
    role: UserRole;
    permissions: PermissionKey[];
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

interface UsersResponse {
    data: UserRecord[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}

interface UserFormValues {
    name: string;
    email: string;
    password?: string;
    role: UserRole;
    permissions: PermissionKey[];
    isActive?: boolean;
}

const permissionGroups: Array<{
    title: string;
    permissions: Array<{ key: PermissionKey; label: string }>;
}> = [
        {
            title: 'نقطة البيع',
            permissions: [
                { key: 'pos.search', label: 'بحث المنتجات' },
                { key: 'pos.checkout', label: 'إتمام البيع' },
                { key: 'pos.cancel', label: 'إلغاء الفاتورة' },
            ],
        },
        {
            title: 'المنتجات',
            permissions: [
                { key: 'products.view', label: 'عرض المنتجات' },
                { key: 'products.manage', label: 'إدارة المنتجات' },
            ],
        },
        {
            title: 'العملاء',
            permissions: [
                { key: 'customers.view', label: 'عرض العملاء' },
                { key: 'customers.create', label: 'إنشاء عميل' },
                { key: 'customers.manage', label: 'إدارة العملاء' },
                { key: 'customers.payments', label: 'مدفوعات العملاء' },
            ],
        },
        {
            title: 'المرتجعات',
            permissions: [
                { key: 'refunds.create', label: 'إنشاء مرتجع' },
                { key: 'refunds.view', label: 'عرض المرتجعات' },
            ],
        },
        {
            title: 'المخزون',
            permissions: [
                { key: 'stock.view', label: 'عرض المخزون' },
                { key: 'stock.transfer', label: 'نقل المخزون' },
                { key: 'stock.adjust', label: 'تعديل المخزون' },
            ],
        },
        {
            title: 'الموردون',
            permissions: [
                { key: 'suppliers.view', label: 'عرض الموردين' },
                { key: 'suppliers.manage', label: 'إدارة الموردين' },
                { key: 'supplier-invoices.view', label: 'عرض فواتير الموردين' },
                { key: 'supplier-invoices.manage', label: 'إدارة فواتير الموردين' },
                { key: 'supplier-invoices.payments', label: 'مدفوعات الموردين' },
            ],
        },
        {
            title: 'التقارير والجرد',
            permissions: [
                { key: 'reports.view', label: 'عرض التقارير' },
                { key: 'inventory-audits.manage', label: 'إدارة الجرد' },
            ],
        },
        {
            title: 'النظام',
            permissions: [
                { key: 'balance.adjust', label: 'تعديل الأرصدة' },
                { key: 'users.manage', label: 'إدارة المستخدمين' },
                { key: 'settings.view', label: 'عرض الإعدادات' },
                { key: 'settings.manage', label: 'إدارة الإعدادات' },
                { key: 'backup.manage', label: 'النسخ الاحتياطي' },
                { key: 'audit-logs.view', label: 'عرض سجل المراجعة' },
            ],
        },
    ];

function PermissionMatrix({
    value = [],
    onChange,
    disabled = false,
}: {
    value?: PermissionKey[];
    onChange?: (nextValue: PermissionKey[]) => void;
    disabled?: boolean;
}) {
    const selectedPermissions = value ?? [];

    return (
        <Space orientation="vertical" size={16} style={{ width: '100%' }}>
            {permissionGroups.map((group) => (
                <div key={group.title}>
                    <Text strong>{group.title}</Text>
                    <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
                        {group.permissions.map((permission) => (
                            <Col xs={24} md={12} xl={8} key={permission.key}>
                                <Checkbox
                                    checked={selectedPermissions.includes(permission.key)}
                                    disabled={disabled}
                                    onChange={(event) => {
                                        if (event.target.checked) {
                                            onChange?.(
                                                Array.from(
                                                    new Set([
                                                        ...selectedPermissions,
                                                        permission.key,
                                                    ])
                                                ) as PermissionKey[]
                                            );
                                        } else {
                                            onChange?.(
                                                selectedPermissions.filter(
                                                    (item) => item !== permission.key
                                                )
                                            );
                                        }
                                    }}
                                >
                                    {permission.label}
                                </Checkbox>
                            </Col>
                        ))}
                    </Row>
                </div>
            ))}
        </Space>
    );
}

function buildUsersQueryString(page: number, pageSize: number, role?: string, isActive?: string) {
    const params = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
    });

    if (role) {
        params.set('role', role);
    }

    if (isActive) {
        params.set('isActive', isActive);
    }

    return params.toString();
}

export default function UsersPage() {
    const queryClient = useQueryClient();
    const [messageApi, contextHolder] = message.useMessage();
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [roleFilter, setRoleFilter] = useState<string>();
    const [statusFilter, setStatusFilter] = useState<string>();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
    const [createForm] = Form.useForm<UserFormValues>();
    const [editForm] = Form.useForm<UserFormValues>();
    const createRole = Form.useWatch('role', createForm) ?? 'cashier';
    const editRole = Form.useWatch('role', editForm) ?? editingUser?.role ?? 'cashier';

    const usersQuery = useQuery({
        queryKey: ['users', page, pageSize, roleFilter, statusFilter],
        queryFn: async () => {
            const response = await fetch(
                `/api/users?${buildUsersQueryString(page, pageSize, roleFilter, statusFilter)}`
            );

            if (!response.ok) {
                throw new Error('تعذر تحميل المستخدمين');
            }

            return (await response.json()) as UsersResponse;
        },
    });

    const createUserMutation = useMutation({
        mutationFn: async (values: UserFormValues) => {
            const response = await fetch('/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(values),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error?.message ?? 'تعذر إنشاء المستخدم');
            }

            return data;
        },
        onSuccess: () => {
            messageApi.success('تم إنشاء المستخدم بنجاح');
            setIsCreateOpen(false);
            createForm.resetFields();
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
        onError: (error) => {
            messageApi.error(error instanceof Error ? error.message : 'تعذر إنشاء المستخدم');
        },
    });

    const updateUserMutation = useMutation({
        mutationFn: async (values: UserFormValues) => {
            if (!editingUser) {
                throw new Error('المستخدم غير محدد');
            }

            const response = await fetch(`/api/users/${editingUser._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(values),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error?.message ?? 'تعذر تحديث المستخدم');
            }

            return data;
        },
        onSuccess: () => {
            messageApi.success('تم تحديث المستخدم بنجاح');
            setEditingUser(null);
            editForm.resetFields();
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
        onError: (error) => {
            messageApi.error(error instanceof Error ? error.message : 'تعذر تحديث المستخدم');
        },
    });

    const columns: TableColumnsType<UserRecord> = [
        {
            title: 'الاسم',
            dataIndex: 'name',
            key: 'name',
        },
        {
            title: 'البريد الإلكتروني',
            dataIndex: 'email',
            key: 'email',
        },
        {
            title: 'الدور',
            dataIndex: 'role',
            key: 'role',
            render: (value: UserRole) =>
                value === 'owner' ? <Tag color="gold">مالك</Tag> : <Tag color="blue">كاشير</Tag>,
        },
        {
            title: 'الحالة',
            dataIndex: 'isActive',
            key: 'isActive',
            render: (value: boolean) =>
                value ? <Tag color="green">نشط</Tag> : <Tag color="red">غير نشط</Tag>,
        },
        {
            title: 'عدد الصلاحيات',
            dataIndex: 'permissions',
            key: 'permissions',
            render: (value: PermissionKey[], record) =>
                record.role === 'owner' ? 'كامل الصلاحيات' : value.length,
        },
        {
            title: 'إجراءات',
            key: 'actions',
            render: (_value, record) => (
                <Button
                    onClick={() => {
                        setEditingUser(record);
                        editForm.setFieldsValue({
                            name: record.name,
                            email: record.email,
                            role: record.role,
                            permissions:
                                record.role === 'owner'
                                    ? [...ALL_PERMISSIONS]
                                    : [...record.permissions],
                            isActive: record.isActive,
                            password: undefined,
                        });
                    }}
                >
                    تعديل
                </Button>
            ),
        },
    ];

    return (
        <div>
            {contextHolder}
            <PageHeader title="إدارة المستخدمين" />

            <Card style={{ marginBottom: 16 }}>
                <Row gutter={[16, 16]} align="middle">
                    <Col xs={24} md={8} lg={6}>
                        <Select
                            allowClear
                            placeholder="تصفية حسب الدور"
                            style={{ width: '100%' }}
                            value={roleFilter}
                            onChange={(value) => {
                                setPage(1);
                                setRoleFilter(value);
                            }}
                            options={[
                                { value: 'owner', label: 'مالك' },
                                { value: 'cashier', label: 'كاشير' },
                            ]}
                        />
                    </Col>
                    <Col xs={24} md={8} lg={6}>
                        <Select
                            allowClear
                            placeholder="تصفية حسب الحالة"
                            style={{ width: '100%' }}
                            value={statusFilter}
                            onChange={(value) => {
                                setPage(1);
                                setStatusFilter(value);
                            }}
                            options={[
                                { value: 'true', label: 'نشط' },
                                { value: 'false', label: 'غير نشط' },
                            ]}
                        />
                    </Col>
                    <Col xs={24} md={8} lg={12}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={() => {
                                    createForm.setFieldsValue({
                                        role: 'cashier',
                                        permissions: [...CASHIER_DEFAULT_PERMISSIONS],
                                        isActive: true,
                                    });
                                    setIsCreateOpen(true);
                                }}
                            >
                                إضافة مستخدم
                            </Button>
                        </div>
                    </Col>
                </Row>
            </Card>

            <Card>
                <Table<UserRecord>
                    rowKey="_id"
                    columns={columns}
                    dataSource={usersQuery.data?.data ?? []}
                    loading={usersQuery.isLoading}
                    pagination={{
                        current: page,
                        pageSize,
                        total: usersQuery.data?.pagination.total ?? 0,
                        showSizeChanger: true,
                        onChange: (nextPage, nextPageSize) => {
                            setPage(nextPage);
                            setPageSize(nextPageSize);
                        },
                    }}
                />
            </Card>

            <Modal
                title="إضافة مستخدم"
                open={isCreateOpen}
                width={900}
                confirmLoading={createUserMutation.isPending}
                okText="إنشاء"
                cancelText="إلغاء"
                onCancel={() => {
                    setIsCreateOpen(false);
                    createForm.resetFields();
                }}
                onOk={() => createForm.submit()}
            >
                <Form<UserFormValues>
                    form={createForm}
                    layout="vertical"
                    initialValues={{
                        role: 'cashier',
                        permissions: [...CASHIER_DEFAULT_PERMISSIONS],
                        isActive: true,
                    }}
                    onValuesChange={(changedValues) => {
                        if (changedValues.role === 'owner') {
                            createForm.setFieldValue('permissions', [...ALL_PERMISSIONS]);
                        }

                        if (changedValues.role === 'cashier') {
                            createForm.setFieldValue('permissions', [
                                ...CASHIER_DEFAULT_PERMISSIONS,
                            ]);
                        }
                    }}
                    onFinish={(values) => createUserMutation.mutate(values)}
                >
                    <Row gutter={16}>
                        <Col xs={24} md={12}>
                            <Form.Item
                                name="name"
                                label="الاسم"
                                rules={[{ required: true, message: 'الاسم مطلوب' }]}
                            >
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item
                                name="email"
                                label="البريد الإلكتروني"
                                rules={[{ required: true, message: 'البريد الإلكتروني مطلوب' }]}
                            >
                                <Input type="email" dir="ltr" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item
                                name="password"
                                label="كلمة المرور"
                                rules={[{ required: true, message: 'كلمة المرور مطلوبة' }]}
                            >
                                <Input.Password dir="ltr" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item
                                name="role"
                                label="الدور"
                                rules={[{ required: true, message: 'الدور مطلوب' }]}
                            >
                                <Select
                                    options={[
                                        { value: 'cashier', label: 'كاشير' },
                                        { value: 'owner', label: 'مالك' },
                                    ]}
                                />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Divider>الصلاحيات</Divider>
                    {createRole === 'owner' ? (
                        <Text type="secondary">المالك يمتلك جميع الصلاحيات بشكل تلقائي.</Text>
                    ) : null}
                    <Form.Item name="permissions">
                        <PermissionMatrix disabled={createRole === 'owner'} />
                    </Form.Item>
                </Form>
            </Modal>

            <Drawer
                title="تعديل المستخدم"
                open={Boolean(editingUser)}
                size={920}
                destroyOnHidden
                onClose={() => {
                    setEditingUser(null);
                    editForm.resetFields();
                }}
                extra={
                    <Space>
                        <Button
                            onClick={() => {
                                setEditingUser(null);
                                editForm.resetFields();
                            }}
                        >
                            إلغاء
                        </Button>
                        <Button
                            type="primary"
                            loading={updateUserMutation.isPending}
                            onClick={() => editForm.submit()}
                        >
                            حفظ
                        </Button>
                    </Space>
                }
            >
                <Form<UserFormValues>
                    form={editForm}
                    layout="vertical"
                    onValuesChange={(changedValues) => {
                        if (changedValues.role === 'owner') {
                            editForm.setFieldValue('permissions', [...ALL_PERMISSIONS]);
                        }

                        if (changedValues.role === 'cashier' && editingUser?.role === 'owner') {
                            editForm.setFieldValue('permissions', [
                                ...CASHIER_DEFAULT_PERMISSIONS,
                            ]);
                        }
                    }}
                    onFinish={(values) => updateUserMutation.mutate(values)}
                >
                    <Row gutter={16}>
                        <Col xs={24} md={12}>
                            <Form.Item
                                name="name"
                                label="الاسم"
                                rules={[{ required: true, message: 'الاسم مطلوب' }]}
                            >
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item
                                name="email"
                                label="البريد الإلكتروني"
                                rules={[{ required: true, message: 'البريد الإلكتروني مطلوب' }]}
                            >
                                <Input type="email" dir="ltr" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item name="password" label="إعادة تعيين كلمة المرور">
                                <Input.Password dir="ltr" placeholder="اتركها فارغة بدون تغيير" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item
                                name="role"
                                label="الدور"
                                rules={[{ required: true, message: 'الدور مطلوب' }]}
                            >
                                <Select
                                    options={[
                                        { value: 'cashier', label: 'كاشير' },
                                        { value: 'owner', label: 'مالك' },
                                    ]}
                                />
                            </Form.Item>
                        </Col>
                        <Col xs={24}>
                            <Form.Item name="isActive" label="الحساب نشط" valuePropName="checked">
                                <Switch checkedChildren="نشط" unCheckedChildren="غير نشط" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Divider>الصلاحيات</Divider>
                    {editRole === 'owner' ? (
                        <Text type="secondary">المالك يمتلك جميع الصلاحيات بشكل تلقائي.</Text>
                    ) : null}
                    <Form.Item name="permissions">
                        <PermissionMatrix disabled={editRole === 'owner'} />
                    </Form.Item>
                </Form>
            </Drawer>
        </div>
    );
}
