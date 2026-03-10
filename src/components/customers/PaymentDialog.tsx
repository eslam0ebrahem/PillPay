'use client';

import React, { useState } from 'react';
import { Form, InputNumber, Button, Alert, Typography } from 'antd';
import MoneyDisplay from '@/components/common/MoneyDisplay';
import MobileFormWrapper from '../common/MobileFormWrapper';

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
        <MobileFormWrapper
            title={`تحصيل دفعة من: ${customerName}`}
            open={visible}
            onClose={handleCancel}
            footer={
                <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                    <Button block size="large" onClick={handleCancel}>إلغاء</Button>
                    <Button block size="large" type="primary" onClick={() => form.submit()} loading={loading}>
                        تأكيد التحصيل
                    </Button>
                </div>
            }
        >
            <div style={{ marginBottom: 24, padding: 16, backgroundColor: '#f9fafb', borderRadius: 8 }}>
                <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>إجمالي المديونية الحالية:</Text>
                <Text strong style={{ fontSize: 24, color: '#dc2626' }}>
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
                        style={{ width: '100%' }}
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
                        style={{ marginBottom: 16 }}
                    />
                )}
            </Form>
        </MobileFormWrapper>
    );
}
