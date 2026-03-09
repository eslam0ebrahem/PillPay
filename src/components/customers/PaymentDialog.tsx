'use client';

import React, { useState } from 'react';
import { Modal, Form, InputNumber, Button, Alert, Typography } from 'antd';
import MoneyDisplay from '@/components/common/MoneyDisplay';

const { Text } = Typography;

interface PaymentDialogProps {
    visible: boolean;
    onCancel: () => void;
    onSubmit: (amount: number) => Promise<void>;
    totalDebt: number;
    customerName: string;
    loading?: boolean;
}

export default function PaymentDialog({ visible, onCancel, onSubmit, totalDebt, customerName, loading }: PaymentDialogProps) {
    const [form] = Form.useForm();
    const [amount, setAmount] = useState<number | null>(null);

    const handleSubmit = async (values: { amount: number }) => {
        await onSubmit(values.amount);
        form.resetFields();
    };

    const handleCancel = () => {
        form.resetFields();
        setAmount(null);
        onCancel();
    };

    return (
        <Modal
            title={`تحصيل دفعة من: ${customerName}`}
            open={visible}
            onCancel={handleCancel}
            footer={null}
        >
            <div className="mb-6 bg-gray-50 p-4 rounded-lg">
                <Text type="secondary" className="block mb-1">إجمالي المديونية الحالية:</Text>
                <Text strong className="text-xl text-red-600">
                    <MoneyDisplay amount={totalDebt} />
                </Text>
            </div>

            <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                onValuesChange={(_, allValues) => setAmount(allValues.amount)}
            >
                <Form.Item
                    name="amount"
                    label="المبلغ المحصل (جنيه)"
                    rules={[
                        { required: true, message: 'يرجى إدخال المبلغ' },
                        { type: 'number', min: 1, message: 'المبلغ يجب أن يكون أكبر من صفر' }
                    ]}
                >
                    <InputNumber
                        className="w-full"
                        size="large"
                        placeholder="أدخل المبلغ"
                    />
                </Form.Item>

                {amount && amount > 0 && (
                    <Alert
                        type="info"
                        showIcon
                        message="توزيع الدفعة"
                        description="سيتم خصم هذا المبلغ من أقدم الفواتير غير المسددة أولاً (طريقة ما يدخل أولاً يخرج أولاً FIFO)."
                        className="mb-4"
                    />
                )}

                <Form.Item className="mb-0 flex justify-end gap-2">
                    <Button onClick={handleCancel}>إلغاء</Button>
                    <Button type="primary" htmlType="submit" loading={loading}>
                        تأكيد التحصيل
                    </Button>
                </Form.Item>
            </Form>
        </Modal>
    );
}
