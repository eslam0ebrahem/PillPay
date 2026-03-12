'use client';

import { useState } from 'react';
import {
    Table, Button, Form, Input, Select, Space, Card,
    Typography, App, Popconfirm, Tabs, Flex, Grid, Tag, Empty,
    Col,
    Row
} from 'antd';
import {
    PlusOutlined, EditOutlined, DeleteOutlined,
    AppstoreOutlined, PartitionOutlined, ExperimentOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import MobileFormWrapper from '../common/MobileFormWrapper';
import ar from '@/i18n/ar';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

interface Unit {
    _id: string;
    code: string;
    nameAr: string;
    nameEn: string;
    type: 'base_unit' | 'sub_unit' | 'measurement';
    description?: string;
}

export default function UnitsManagementClient() {
    const screens = useBreakpoint();
    const { message } = App.useApp();
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
    const [form] = Form.useForm();

    const isMobile = !screens.md;

    // --- Data Fetching ---
    const { data: unitsData, isLoading } = useQuery({
        queryKey: ['units'],
        queryFn: async () => {
            const res = await fetch('/api/units');
            if (!res.ok) throw new Error('Failed to fetch units');
            return res.json() as Promise<{ data: { base_units: Unit[], sub_units: Unit[], measurements: Unit[] } }>;
        },
    });

    // --- Mutations ---
    const createMutation = useMutation({
        mutationFn: async (values: any) => {
            const res = await fetch('/api/units', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });
            if (!res.ok) throw new Error((await res.json()).error?.message || 'Error');
            return res.json();
        },
        onSuccess: () => {
            message.success(ar.messages.created);
            setIsModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ['units'] });
        }
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, values }: { id: string, values: any }) => {
            const res = await fetch(`/api/units/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });
            if (!res.ok) throw new Error((await res.json()).error?.message || 'Error');
            return res.json();
        },
        onSuccess: () => {
            message.success(ar.messages.updated);
            setIsModalOpen(false);
            setEditingUnit(null);
            queryClient.invalidateQueries({ queryKey: ['units'] });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/units/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Error deleting unit');
            return res.json();
        },
        onSuccess: () => {
            message.success(ar.messages.deleted);
            queryClient.invalidateQueries({ queryKey: ['units'] });
        }
    });

    // --- Actions ---
    const handleSubmit = (values: any) => {
        if (editingUnit) updateMutation.mutate({ id: editingUnit._id, values });
        else createMutation.mutate(values);
    };

    const handleEdit = (unit: Unit) => {
        setEditingUnit(unit);
        form.setFieldsValue(unit);
        setIsModalOpen(true);
    };

    const handleAdd = () => {
        setEditingUnit(null);
        form.resetFields();
        setIsModalOpen(true);
    };

    const columns = [
        {
            title: ar.units.code,
            dataIndex: 'code',
            key: 'code',
            render: (code: string) => <Tag color="blue" variant ="filled" style={{ fontWeight: '600' }}>{code}</Tag>
        },
        {
            title: ar.units.nameAr,
            dataIndex: 'nameAr',
            key: 'nameAr',
            render: (text: string) => <Text strong>{text}</Text>
        },
        { title: ar.units.nameEn, dataIndex: 'nameEn', key: 'nameEn', responsive: ['sm'] as any },
        {
            title: ar.actions.actions,
            key: 'actions',
            align: 'center' as const,
            render: (_: any, record: Unit) => (
                <Space>
                    <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
                    <Popconfirm
                        title={ar.units.confirmDelete}
                        onConfirm={() => deleteMutation.mutate(record._id)}
                        okButtonProps={{ loading: deleteMutation.isPending, danger: true }}
                    >
                        <Button type="text" icon={<DeleteOutlined />} danger />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const tabItems = [
        {
            key: 'base_unit',
            label: <Space><AppstoreOutlined /> {ar.units.baseUnit}</Space>,
            children: renderTable(unitsData?.data?.base_units || [])
        },
        {
            key: 'sub_unit',
            label: <Space><PartitionOutlined /> {ar.units.subUnit}</Space>,
            children: renderTable(unitsData?.data?.sub_units || [])
        },
        {
            key: 'measurement',
            label: <Space><ExperimentOutlined /> {ar.units.measurement}</Space>,
            children: renderTable(unitsData?.data?.measurements || [])
        },
    ];

    function renderTable(data: Unit[]) {
        if (!isLoading && data.length === 0) {
            return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="لا توجد وحدات في هذا القسم" />;
        }
        return (
            <Table
                columns={columns}
                dataSource={data}
                rowKey="_id"
                loading={isLoading}
                pagination={false}
                size={isMobile ? "small" : "middle"}
                scroll={{ x: 'max-content' }}
                style={{ marginTop: 8 }}
            />
        );
    }

    return (
        <Flex vertical gap={24} style={{ paddingBottom: 40 }}>
            <Card variant="borderless" style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                <Flex justify="space-between" align="center" style={{ marginBottom: 24 }} wrap="wrap" gap="middle">
                    <Flex vertical>
                        <Title level={screens.xs ? 4 : 3} style={{ margin: 0 }}>{ar.units.title}</Title>
                        <Text type="secondary" style={{ fontSize: 13 }}>تحديد وحدات البيع والقياس الأساسية للمنتجات</Text>
                    </Flex>
                    <Button
                        type="primary"
                        size="large"
                        icon={<PlusOutlined />}
                        onClick={handleAdd}
                        style={{ borderRadius: 8 }}
                    >
                        {ar.units.addUnit}
                    </Button>
                </Flex>

                <Tabs
                    items={tabItems}
                    defaultActiveKey="base_unit"
                    size="middle"
                    tabBarGutter={isMobile ? 12 : 32}
                />
            </Card>

            <MobileFormWrapper
                title={editingUnit ? ar.units.editUnit : ar.units.addUnit}
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            >
                <div style={{ padding: isMobile ? '4px' : '0' }}>
                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleSubmit}
                        initialValues={{ type: 'base_unit' }}
                        size="large"
                    >
                        <Form.Item
                            name="code"
                            label={ar.units.code}
                            rules={[{ required: true, message: 'مطلوب إدخال الكود' }]}
                        >
                            <Input placeholder="e.g., box, strip, ml" disabled={!!editingUnit} />
                        </Form.Item>
                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item
                                    name="nameAr"
                                    label={ar.units.nameAr}
                                    rules={[{ required: true, message: 'مطلوب الاسم' }]}
                                >
                                    <Input placeholder="علبة" />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item
                                    name="nameEn"
                                    label={ar.units.nameEn}
                                    rules={[{ required: true, message: 'Required' }]}
                                >
                                    <Input placeholder="Box" />
                                </Form.Item>
                            </Col>
                        </Row>
                        <Form.Item
                            name="type"
                            label={ar.units.type}
                            rules={[{ required: true }]}
                        >
                            <Select options={[
                                { value: 'base_unit', label: ar.units.baseUnit },
                                { value: 'sub_unit', label: ar.units.subUnit },
                                { value: 'measurement', label: ar.units.measurement },
                            ]} />
                        </Form.Item>
                        <Form.Item
                            name="description"
                            label={ar.units.description}
                        >
                            <Input.TextArea rows={3} placeholder="شرح اختياري لطريقة استخدام هذه الوحدة..." />
                        </Form.Item>
                    </Form>

                    <Flex gap={12} style={{ marginTop: 32 }}>
                        <Button size="large" block onClick={() => setIsModalOpen(false)} style={{ borderRadius: 8 }}>
                            {ar.actions.cancel}
                        </Button>
                        <Button
                            type="primary"
                            size="large"
                            block
                            onClick={() => form.submit()}
                            loading={createMutation.isPending || updateMutation.isPending}
                            style={{ borderRadius: 8 }}
                        >
                            {ar.actions.save}
                        </Button>
                    </Flex>
                </div>
            </MobileFormWrapper>
        </Flex>
    );
}