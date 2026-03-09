'use client';

import { Form, Input, InputNumber, Switch, Button, Row, Col, Card, Space } from 'antd';
import { useEffect } from 'react';
import ar from '@/i18n/ar';
import { toEGP, toPiasters } from '@/lib/utils/money';

export interface ProductFormValues {
    barcode?: string;
    nameAr: string;
    nameEn?: string;
    imageUrl?: string;
    manufacturer?: string;
    category?: string;
    description?: string;
    activeIngredient?: string;
    dosageForm?: string;
    route?: string;
    uses?: string;
    pharmacology?: string;
    sellingPrice: number; // Stored in DB as piasters, but form handles EGP
    baseUnit: string;
    subUnit?: string;
    subUnitConversionFactor?: number;
    lowStockThreshold: number;
    isActive: boolean;
}

interface ProductFormProps {
    initialValues?: Partial<ProductFormValues>;
    onSubmit: (values: ProductFormValues) => Promise<void>;
    isSubmitting: boolean;
}

export default function ProductForm({ initialValues, onSubmit, isSubmitting }: ProductFormProps) {
    const [form] = Form.useForm<ProductFormValues>();

    useEffect(() => {
        if (initialValues) {
            form.setFieldsValue({
                ...initialValues,
                sellingPrice: initialValues.sellingPrice ? toEGP(initialValues.sellingPrice) : undefined,
            });
        }
    }, [initialValues, form]);

    const handleFinish = async (values: any) => {
        const payload = {
            ...values,
            sellingPrice: toPiasters(values.sellingPrice || 0),
        };
        await onSubmit(payload);
    };

    return (
        <Form
            form={form}
            layout="vertical"
            onFinish={handleFinish}
            initialValues={{
                isActive: true,
                lowStockThreshold: 10,
                baseUnit: 'علبة',
            }}
        >
            <Card title="البيانات الأساسية" style={{ marginBottom: 16 }}>
                <Row gutter={16}>
                    <Col xs={24} md={12}>
                        <Form.Item
                            name="nameAr"
                            label={ar.products.nameAr}
                            rules={[{ required: true, message: 'مطلوب إدخال الاسم بالعربية' }]}
                        >
                            <Input />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                        <Form.Item name="nameEn" label={ar.products.nameEn}>
                            <Input />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                        <Form.Item name="barcode" label={ar.products.barcode}>
                            <Input />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                        <Form.Item name="category" label={ar.products.category}>
                            <Input />
                        </Form.Item>
                    </Col>
                </Row>
            </Card>

            <Card title="تفاصيل التسعير والوحدات" style={{ marginBottom: 16 }}>
                <Row gutter={16}>
                    <Col xs={24} md={8}>
                        <Form.Item
                            name="sellingPrice"
                            label={ar.products.sellingPrice}
                            rules={[{ required: true, message: 'مطلوب إدخال سعر البيع' }]}
                        >
                            <Space.Compact style={{ width: '100%' }}>
                                <InputNumber min={0} step={0.25} style={{ width: '100%' }} />
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
                                    ج.م
                                </div>
                            </Space.Compact>
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                        <Form.Item
                            name="baseUnit"
                            label={ar.products.baseUnit}
                            rules={[{ required: true, message: 'مطلوب إدخال الوحدة الأساسية' }]}
                        >
                            <Input placeholder="مثال: علبة" />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                        <Form.Item name="subUnit" label={ar.products.subUnit}>
                            <Input placeholder="مثال: شريط" />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                        <Form.Item name="subUnitConversionFactor" label={ar.products.conversionFactor}>
                            <InputNumber min={1} style={{ width: '100%' }} placeholder="كم وحدة فرعية في الأساسية؟" />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                        <Form.Item name="lowStockThreshold" label={ar.products.lowStockThreshold}>
                            <InputNumber min={0} style={{ width: '100%' }} />
                        </Form.Item>
                    </Col>
                </Row>
            </Card>

            <Card title="البيانات الطبية والإضافية" style={{ marginBottom: 16 }}>
                <Row gutter={16}>
                    <Col xs={24} md={8}>
                        <Form.Item name="manufacturer" label={ar.products.manufacturer}>
                            <Input />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                        <Form.Item name="activeIngredient" label={ar.products.activeIngredient}>
                            <Input />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                        <Form.Item name="dosageForm" label={ar.products.dosageForm}>
                            <Input />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                        <Form.Item name="pharmacology" label={ar.products.pharmacology}>
                            <Input />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                        <Form.Item name="route" label={ar.products.route}>
                            <Input />
                        </Form.Item>
                    </Col>
                    <Col xs={24}>
                        <Form.Item name="uses" label={ar.products.uses}>
                            <Input.TextArea rows={2} />
                        </Form.Item>
                    </Col>
                    <Col xs={24}>
                        <Form.Item name="description" label={ar.products.description}>
                            <Input.TextArea rows={2} />
                        </Form.Item>
                    </Col>
                    <Col xs={24}>
                        <Form.Item name="imageUrl" label={ar.products.imageUrl}>
                            <Input />
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
