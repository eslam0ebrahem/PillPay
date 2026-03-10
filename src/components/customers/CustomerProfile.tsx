'use client';

import React, { useState } from 'react';
import { Card, Table, Tag, Typography, Button, Space, Modal, Form, InputNumber, Input, App } from 'antd';
import { DollarOutlined, HistoryOutlined, FileTextOutlined, EditOutlined, ToolOutlined } from '@ant-design/icons';
import MoneyDisplay from '@/components/common/MoneyDisplay';
import dayjs from 'dayjs';
import PaymentDialog from './PaymentDialog';
import CustomerForm from './CustomerForm';

const { Title, Text } = Typography;

interface CustomerProfileProps {
    customer: any;
    unpaidInvoices: any[];
    recentPayments: any[];
    recentAdjustments: any[];
    onRefresh: () => void;
}

export default function CustomerProfile({ customer, unpaidInvoices, recentPayments, recentAdjustments, onRefresh }: CustomerProfileProps) {
    const { message } = App.useApp();
    const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);
    const [isAdjustModalVisible, setIsAdjustModalVisible] = useState(false);
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [adjustForm] = Form.useForm();

    const handleRecordPayment = async (amount: number) => {
        try {
            setLoading(true);
            const res = await fetch(`/api/customers/${customer._id}/payments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount }),
            });
            if (!res.ok) throw new Error('فشل تسجيل الدفعة');

            message.success('تم تسجيل الدفعة بنجاح');
            setIsPaymentModalVisible(false);
            onRefresh();
        } catch (error: any) {
            message.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAdjustBalance = async (values: any) => {
        try {
            setLoading(true);
            const res = await fetch(`/api/customers/${customer._id}/adjustments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });
            if (!res.ok) throw new Error('فشل تعديل الرصيد');

            message.success('تم تعديل الرصيد بنجاح');
            setIsAdjustModalVisible(false);
            adjustForm.resetFields();
            onRefresh();
        } catch (error: any) {
            message.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateCustomer = async (values: any) => {
        try {
            setLoading(true);
            const res = await fetch(`/api/customers/${customer._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });
            if (!res.ok) throw new Error('فشل تحديث بيانات العميل');

            message.success('تم التحديث بنجاح');
            setIsEditModalVisible(false);
            onRefresh();
        } catch (error: any) {
            message.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const invoiceColumns = [
        { title: 'رقم الفاتورة', dataIndex: 'invoiceNumber', key: 'invoiceNumber' },
        { title: 'التاريخ', dataIndex: 'date', key: 'date', render: (d: string) => dayjs(d).format('YYYY-MM-DD') },
        { title: 'الإجمالي', dataIndex: 'total', key: 'total', render: (val: number) => <MoneyDisplay amount={val} /> },
        { title: 'المدفوع', dataIndex: 'paidAmount', key: 'paidAmount', render: (val: number) => <MoneyDisplay amount={val} /> },
        {
            title: 'المتبقي',
            key: 'remaining',
            render: (_: any, record: any) => (
                <Text type="danger" strong>
                    <MoneyDisplay amount={record.total - record.paidAmount} />
                </Text>
            )
        },
        {
            title: 'الحالة',
            dataIndex: 'paymentStatus',
            key: 'status',
            render: (status: string) => {
                const color = status === 'paid' ? 'green' : status === 'partial' ? 'orange' : 'red';
                const labels: any = { paid: 'مسدد', partial: 'مسدد جزئياً', unpaid: 'غير مسدد' };
                return <Tag color={color}>{labels[status] || status}</Tag>;
            }
        }
    ];

    const paymentColumns = [
        { title: 'التاريخ', dataIndex: 'createdAt', key: 'createdAt', render: (d: string) => dayjs(d).format('YYYY-MM-DD HH:mm') },
        { title: 'المبلغ', dataIndex: 'amount', key: 'amount', render: (val: number) => <Text type="success" strong><MoneyDisplay amount={val} /></Text> },
        { title: 'بواسطة', dataIndex: ['receivedBy', 'name'], key: 'receivedBy' },
        {
            title: 'الفواتير المستدلة',
            key: 'allocations',
            render: (_: any, record: any) => (
                <Text type="secondary" className="text-xs">
                    {record.allocations?.length || 0} فواتير
                </Text>
            )
        }
    ];

    const adjustmentColumns = [
        { title: 'التاريخ', dataIndex: 'createdAt', key: 'createdAt', render: (d: string) => dayjs(d).format('YYYY-MM-DD HH:mm') },
        {
            title: 'قيمة التعديل',
            dataIndex: 'amount',
            key: 'amount',
            render: (val: number) => (
                <Text type={val > 0 ? 'danger' : 'success'} strong>
                    {val > 0 ? '+' : ''}<MoneyDisplay amount={val} />
                </Text>
            )
        },
        { title: 'السبب', dataIndex: 'reason', key: 'reason' },
        { title: 'بواسطة', dataIndex: ['adjustedBy', 'name'], key: 'adjustedBy' },
    ];

    return (
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
            {/* Header / Summary Card */}
            <Card>
                <div className="flex justify-between items-start">
                    <div>
                        <Title level={3} className="!mb-1">{customer.name}</Title>
                        <Text type="secondary">{customer.phone || 'لا يوجد رقم هاتف'}</Text>
                    </div>
                    <Space>
                        <Button icon={<ToolOutlined />} onClick={() => setIsAdjustModalVisible(true)}>
                            تسوية رصيد
                        </Button>
                        <Button icon={<EditOutlined />} onClick={() => setIsEditModalVisible(true)}>
                            تعديل البيانات
                        </Button>
                        <Button
                            type="primary"
                            icon={<DollarOutlined />}
                            size="large"
                            onClick={() => setIsPaymentModalVisible(true)}
                            disabled={customer.totalOwed <= 0}
                        >
                            تحصيل دفعة
                        </Button>
                    </Space>
                </div>

                <div className="mt-8 p-6 bg-gray-50 rounded-xl border border-gray-200">
                    <Text className="text-lg text-gray-500 block mb-2">إجمالي المديونية (المبالغ المستحقة)</Text>
                    <Text className="text-4xl text-red-600 font-bold">
                        <MoneyDisplay amount={customer.totalOwed} />
                    </Text>
                </div>
            </Card>

            {/* Invoices */}
            <Card title={<><FileTextOutlined className="mr-2" /> الفواتير غير المسددة</>} className="shadow-sm">
                <Table
                    dataSource={unpaidInvoices}
                    columns={invoiceColumns}
                    rowKey="_id"
                    pagination={false}
                    size="middle"
                    scroll={{ x: 'max-content' }}
                />
            </Card>

            {/* Payments & Adjustments Split */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title={<><HistoryOutlined className="mr-2" /> سجل التحصيلات (أخر 10)</>} className="shadow-sm">
                    <Table
                        dataSource={recentPayments}
                        columns={paymentColumns}
                        rowKey="_id"
                        pagination={false}
                        size="small"
                        scroll={{ x: 'max-content' }}
                    />
                </Card>
                <Card title={<><ToolOutlined className="mr-2" /> سجل التسويات (أخر 10)</>} className="shadow-sm">
                    <Table
                        dataSource={recentAdjustments}
                        columns={adjustmentColumns}
                        rowKey="_id"
                        pagination={false}
                        size="small"
                        scroll={{ x: 'max-content' }}
                    />
                </Card>
            </div>

            {/* Modals */}
            <PaymentDialog
                visible={isPaymentModalVisible}
                onCancel={() => setIsPaymentModalVisible(false)}
                onSubmit={handleRecordPayment}
                totalDebt={customer.totalOwed}
                customerName={customer.name}
                loading={loading}
            />

            <Modal
                title="تسوية رصيد العميل"
                open={isAdjustModalVisible}
                onCancel={() => {
                    setIsAdjustModalVisible(false);
                    adjustForm.resetFields();
                }}
                footer={null}
            >
                <Form form={adjustForm} layout="vertical" onFinish={handleAdjustBalance}>
                    <Form.Item
                        name="amountChange"
                        label="مبلغ التسوية (جنيه)"
                        help="استخدم قيمة موجبة لزيادة المديونية، أو قيمة سالبة لتقليلها"
                        rules={[{ required: true, message: 'مطلوب' }]}
                    >
                        <InputNumber className="w-full" />
                    </Form.Item>
                    <Form.Item
                        name="reason"
                        label="سبب التسوية"
                        rules={[{ required: true, message: 'مطلوب' }]}
                    >
                        <Input.TextArea rows={3} />
                    </Form.Item>
                    <Form.Item className="mb-0 flex justify-end gap-2">
                        <Button onClick={() => setIsAdjustModalVisible(false)}>إلغاء</Button>
                        <Button type="primary" htmlType="submit" loading={loading} danger>
                            تأكيد التسوية
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title="تعديل بيانات العميل"
                open={isEditModalVisible}
                onCancel={() => setIsEditModalVisible(false)}
                footer={null}
                destroyOnHidden
            >
                {isEditModalVisible && (
                    <CustomerForm
                        initialValues={customer}
                        onSubmit={handleUpdateCustomer}
                        isEdit
                        isLoading={loading}
                    />
                )}
            </Modal>

        </Space>
    );
}
