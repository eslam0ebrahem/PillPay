'use client';

import { Form, Input, Button, Switch, Row, Col, Card } from 'antd';
import { useEffect } from 'react';
import ar from '@/i18n/ar';

export interface SupplierFormValues {
    name: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    taxId?: string;
    commercialRegister?: string;
    address?: string;
    isActive: boolean;
}

interface SupplierFormProps {
    initialValues?: Partial<SupplierFormValues>;
    onSubmit: (values: SupplierFormValues) => Promise<void>;
    isSubmitting: boolean;
}

export default function SupplierForm({ initialValues, onSubmit, isSubmitting }: SupplierFormProps) {
    const [form] = Form.useForm<SupplierFormValues>();

    useEffect(() => {
        if (initialValues) {
            form.setFieldsValue(initialValues);
        }
    }, [initialValues, form]);

    return (
        <Form
            form={form}
            layout="vertical"
            onFinish={onSubmit}
            initialValues={{ isActive: true }}
        >
            <Card title="بيانات المورد الأساسية" style={{ marginBottom: 16 }}>
                <Row gutter={16}>
                    <Col xs={24} md={12}>
                        <Form.Item
                            name="name"
                            label={ar.suppliers.name}
                            rules={[{ required: true, message: 'مطلوب إدخال اسم المورد' }]}
                        >
                            <Input />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                        <Form.Item name="contactPerson" label={ar.suppliers.contactPerson}>
                            <Input />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                        <Form.Item name="phone" label={ar.suppliers.phone}>
                            <Input />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                        <Form.Item name="email" label="البريد الإلكتروني">
                            <Input type="email" />
                        </Form.Item>
                    </Col>
                </Row>
            </Card>

            <Card title="البيانات القانونية والمالية" style={{ marginBottom: 16 }}>
                <Row gutter={16}>
                    <Col xs={24} md={12}>
                        <Form.Item name="taxId" label={ar.suppliers.taxId}>
                            <Input />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                        <Form.Item name="commercialRegister" label={ar.suppliers.commercialRegister}>
                            <Input />
                        </Form.Item>
                    </Col>
                    <Col xs={24}>
                        <Form.Item name="address" label="العنوان">
                            <Input.TextArea rows={2} />
                        </Form.Item>
                    </Col>
                </Row>
            </Card>

            <Form.Item name="isActive" valuePropName="checked">
                <Switch checkedChildren="نشط" unCheckedChildren="غير نشط" />
            </Form.Item>

            <Form.Item>
                <Button type="primary" htmlType="submit" loading={isSubmitting} block size="large">
                    {ar.actions.save}
                </Button>
            </Form.Item>
        </Form>
    );
}
