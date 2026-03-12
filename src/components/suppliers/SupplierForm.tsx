'use client';

import { Form, Input, Button, Switch, Row, Col, Card, Typography, Flex, Divider } from 'antd';
import { 
    UserOutlined, 
    PhoneOutlined, 
    MailOutlined, 
    HomeOutlined, 
    IdcardOutlined, 
    BankOutlined,
    SaveOutlined
} from '@ant-design/icons';
import { useEffect } from 'react';
import ar from '@/i18n/ar';

const { Text, Title } = Typography;

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
            requiredMark="optional" // Cleaner look, rely on validation messages
        >
            {/* --- Basic Information Section --- */}
            <Card 
                variant="borderless"
                style={{ marginBottom: 20, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
                title={
                    <Flex align="center" gap={8}>
                        <UserOutlined style={{ color: '#1677ff' }} />
                        <span>بيانات المورد الأساسية</span>
                    </Flex>
                }
            >
                <Row gutter={[16, 0]}>
                    <Col xs={24} md={12}>
                        <Form.Item
                            name="name"
                            label={ar.suppliers.name}
                            rules={[{ required: true, message: 'يرجى إدخال اسم المورد' }]}
                        >
                            <Input size="large" placeholder="مثال: شركة القاهرة للأدوية" />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                        <Form.Item name="contactPerson" label={ar.suppliers.contactPerson}>
                            <Input size="large" prefix={<UserOutlined style={{ color: '#bfbfbf' }} />} placeholder="اسم الشخص المسؤول" />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                        <Form.Item 
                            name="phone" 
                            label={ar.suppliers.phone}
                            rules={[{ pattern: /^[0-9+ ]+$/, message: 'رقم الهاتف غير صالح' }]}
                        >
                            <Input 
                                size="large" 
                                type="tel" 
                                prefix={<PhoneOutlined style={{ color: '#bfbfbf' }} />} 
                                placeholder="01xxxxxxxxx" 
                            />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                        <Form.Item name="email" label="البريد الإلكتروني">
                            <Input 
                                size="large" 
                                type="email" 
                                prefix={<MailOutlined style={{ color: '#bfbfbf' }} />} 
                                placeholder="example@mail.com" 
                            />
                        </Form.Item>
                    </Col>
                </Row>
            </Card>

            {/* --- Legal & Address Section --- */}
            <Card 
                variant="borderless"
                style={{ marginBottom: 24, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
                title={
                    <Flex align="center" gap={8}>
                        <BankOutlined style={{ color: '#1677ff' }} />
                        <span>البيانات القانونية والعنوان</span>
                    </Flex>
                }
            >
                <Row gutter={[16, 0]}>
                    <Col xs={24} md={12}>
                        <Form.Item name="taxId" label={ar.suppliers.taxId}>
                            <Input size="large" prefix={<IdcardOutlined style={{ color: '#bfbfbf' }} />} placeholder="الرقم الضريبي" />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                        <Form.Item name="commercialRegister" label={ar.suppliers.commercialRegister}>
                            <Input size="large" prefix={<IdcardOutlined style={{ color: '#bfbfbf' }} />} placeholder="السجل التجاري" />
                        </Form.Item>
                    </Col>
                    <Col xs={24}>
                        <Form.Item name="address" label="العنوان التفصيلي">
                            <Input.TextArea 
                                rows={3} 
                                placeholder="المدينة، الشارع، رقم المبنى..." 
                            />
                        </Form.Item>
                    </Col>
                </Row>
            </Card>

            {/* --- Footer Actions --- */}
            <Flex vertical gap={16} style={{ padding: '0 8px' }}>
                <Flex align="center" justify="space-between" style={{ background: '#fff', padding: '12px 16px', borderRadius: 12, border: '1px solid #f0f0f0' }}>
                    <Text strong>حالة المورد في النظام</Text>
                    <Form.Item name="isActive" valuePropName="checked" noStyle>
                        <Switch 
                            checkedChildren="نشط" 
                            unCheckedChildren="معطل" 
                            defaultChecked 
                        />
                    </Form.Item>
                </Flex>

                <Button 
                    type="primary" 
                    htmlType="submit" 
                    loading={isSubmitting} 
                    block 
                    size="large" 
                    icon={<SaveOutlined />}
                    style={{ 
                        height: 54, 
                        borderRadius: 12, 
                        fontSize: 17, 
                        fontWeight: 600,
                        boxShadow: '0 4px 12px rgba(22, 119, 255, 0.2)' 
                    }}
                >
                    {ar.actions.save}
                </Button>
            </Flex>
        </Form>
    );
}