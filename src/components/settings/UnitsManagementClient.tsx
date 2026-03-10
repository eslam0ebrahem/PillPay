'use client';

import { useState } from 'react';
import { Table, Button, Modal, Form, Input, Select, Space, Card, Typography, App, Popconfirm, Tabs, Flex, Grid } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import MobileFormWrapper from '../common/MobileFormWrapper';
import ar from '@/i18n/ar';

const { Title } = Typography;
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

    const { data: unitsData, isLoading } = useQuery({
        queryKey: ['units'],
        queryFn: async () => {
            const res = await fetch('/api/units');
            if (!res.ok) throw new Error('Failed to fetch units');
            return res.json() as Promise<{ data: { base_units: Unit[], sub_units: Unit[], measurements: Unit[] } }>;
        },
    });

    const createMutation = useMutation({
        mutationFn: async (values: any) => {
            const res = await fetch('/api/units', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error?.message || 'Failed to create unit');
            }
            return res.json();
        },
        onSuccess: () => {
            message.success(ar.messages.created);
            setIsModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ['units'] });
            queryClient.invalidateQueries({ queryKey: ['units-filter'] });
        },
        onError: (error) => {
            message.error(error.message);
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, values }: { id: string, values: any }) => {
            const res = await fetch(`/api/units/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error?.message || 'Failed to update unit');
            }
            return res.json();
        },
        onSuccess: () => {
            message.success(ar.messages.updated);
            setIsModalOpen(false);
            setEditingUnit(null);
            queryClient.invalidateQueries({ queryKey: ['units'] });
            queryClient.invalidateQueries({ queryKey: ['units-filter'] });
        },
        onError: (error) => {
            message.error(error.message);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/units/${id}`, {
                method: 'DELETE',
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error?.message || 'Failed to delete unit');
            }
            return res.json();
        },
        onSuccess: () => {
            message.success(ar.messages.deleted);
            queryClient.invalidateQueries({ queryKey: ['units'] });
            queryClient.invalidateQueries({ queryKey: ['units-filter'] });
        },
        onError: (error) => {
            message.error(error.message);
        },
    });

    const handleSubmit = (values: any) => {
        if (editingUnit) {
            updateMutation.mutate({ id: editingUnit._id, values });
        } else {
            createMutation.mutate(values);
        }
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
        { title: ar.units.code, dataIndex: 'code', key: 'code', responsive: ['md'] as any },
        { title: ar.units.nameAr, dataIndex: 'nameAr', key: 'nameAr' },
        { title: ar.units.nameEn, dataIndex: 'nameEn', key: 'nameEn', responsive: ['sm'] as any },
        { title: ar.units.description, dataIndex: 'description', key: 'description', responsive: ['lg'] as any },
        {
            title: ar.actions.actions,
            key: 'actions',
            render: (_: any, record: Unit) => (
                <Space>
                    <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} />
                    <Popconfirm
                        title={ar.units.confirmDelete}
                        onConfirm={() => deleteMutation.mutate(record._id)}
                        okText={ar.actions.confirm}
                        cancelText={ar.actions.cancel}
                    >
                        <Button icon={<DeleteOutlined />} danger />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const tabItems = [
        {
            key: 'base_unit',
            label: ar.units.baseUnit,
            children: (
                <Table
                    columns={columns}
                    dataSource={unitsData?.data?.base_units || []}
                    rowKey="_id"
                    loading={isLoading}
                    pagination={false}
                    scroll={{ x: 'max-content' }}
                />
            ),
        },
        {
            key: 'sub_unit',
            label: ar.units.subUnit,
            children: (
                <Table
                    columns={columns}
                    dataSource={unitsData?.data?.sub_units || []}
                    rowKey="_id"
                    loading={isLoading}
                    pagination={false}
                    scroll={{ x: 'max-content' }}
                />
            ),
        },
        {
            key: 'measurement',
            label: ar.units.measurement,
            children: (
                <Table
                    columns={columns}
                    dataSource={unitsData?.data?.measurements || []}
                    rowKey="_id"
                    loading={isLoading}
                    pagination={false}
                    scroll={{ x: 'max-content' }}
                />
            ),
        },
    ];

    return (
        <div>
            <Card>
                <Flex justify="space-between" align="center" style={{ marginBottom: 24 }} wrap="wrap" gap="middle">
                    <Title level={screens.xs ? 4 : 2} style={{ margin: 0 }}>{ar.units.title}</Title>
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                        {ar.units.addUnit}
                    </Button>
                </Flex>

                <Tabs items={tabItems} defaultActiveKey="base_unit" />
            </Card>

            <MobileFormWrapper
                title={editingUnit ? ar.units.editUnit : ar.units.addUnit}
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                destroyOnHidden
            >
                <div>
                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleSubmit}
                        initialValues={{ type: 'base_unit' }}
                    >
                        <Form.Item
                            name="code"
                            label={ar.units.code}
                            rules={[{ required: true, message: 'مطلوب إدخال الكود' }]}
                        >
                            <Input placeholder="e.g., box, strip, ml" disabled={!!editingUnit} />
                        </Form.Item>
                        <Form.Item
                            name="nameAr"
                            label={ar.units.nameAr}
                            rules={[{ required: true, message: 'مطلوب إدخال الاسم بالعربية' }]}
                        >
                            <Input />
                        </Form.Item>
                        <Form.Item
                            name="nameEn"
                            label={ar.units.nameEn}
                            rules={[{ required: true, message: 'مطلوب إدخال الاسم بالإنجليزية' }]}
                        >
                            <Input />
                        </Form.Item>
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
                            <Input.TextArea rows={2} />
                        </Form.Item>
                    </Form>
                    <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
                        <Button block onClick={() => setIsModalOpen(false)}>
                            {ar.actions.cancel}
                        </Button>
                        <Button
                            type="primary"
                            block
                            onClick={() => form.submit()}
                            loading={createMutation.isPending || updateMutation.isPending}
                        >
                            {ar.actions.save}
                        </Button>
                    </div>
                </div>
            </MobileFormWrapper>
        </div>
    );
}
