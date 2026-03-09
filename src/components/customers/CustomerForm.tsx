'use client';

import React from 'react';
import { Form, Input, InputNumber, Button, Switch, Space } from 'antd';

interface CustomerFormProps {
    initialValues?: any;
    onSubmit: (values: any) => Promise<void>;
    isLoading?: boolean;
    isEdit?: boolean;
}

export default function CustomerForm({ initialValues, onSubmit, isLoading, isEdit }: CustomerFormProps) {
    const [form] = Form.useForm();

    const handleSubmit = async (values: any) => {
        await onSubmit(values);
    };

    return (
        <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={initialValues}
        >
            <Form.Item
                name="name"
                label="اسم العميل"
                rules={[{ required: true, message: 'يرجى إدخال اسم العميل' }]}
            >
                <Input placeholder="أدخل اسم العميل" />
            </Form.Item>

            <Form.Item
                name="phone"
                label="رقم الهاتف"
            >
                <Input placeholder="أدخل رقم الهاتف (اختياري)" />
            </Form.Item>

            {!isEdit && (
                <Form.Item
                    name="totalOwed"
                    label="الرصيد الافتتاحي (مديونية)"
                    help="أدخل أي ديون سابقة على العميل عند تسجيله لأول مرة"
                    initialValue={0}
                >
                    <Space.Compact style={{ width: '100%' }}>
                        <InputNumber
                            style={{ width: '100%' }}
                            min={0}
                        />
                        <div style={{
                            padding: '0 11px',
                            backgroundColor: '#f5f5f5',
                            border: '1px solid #d9d9d9',
                            borderLeft: 0,
                            display: 'flex',
                            alignItems: 'center',
                            borderRadius: '0 6px 6px 0',
                            whiteSpace: 'nowrap'
                        }}>
                            جنيه
                        </div>
                    </Space.Compact>
                </Form.Item>
            )}

            <Form.Item>
                <Button type="primary" htmlType="submit" loading={isLoading} block>
                    {isEdit ? 'تحديث البيانات' : 'إضافة العميل'}
                </Button>
            </Form.Item>
        </Form>
    );
}
