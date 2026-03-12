'use client';

import { useState, useMemo } from 'react';
import { 
    Form, Input, Button, DatePicker, Select, InputNumber, 
    Row, Col, Card, Divider, Typography, App, Flex, Grid 
} from 'antd';
import { PlusOutlined, DeleteOutlined, BarcodeOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import BarcodeScanner from '../common/BarcodeScanner';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

interface InvoiceFormProps {
    suppliers: any[];
    products: any[];
    onSubmit: (values: any) => Promise<void>;
    isSubmitting?: boolean;
}

export default function InvoiceForm({ suppliers, products, onSubmit, isSubmitting }: InvoiceFormProps) {
    const { message } = App.useApp();
    const screens = useBreakpoint();
    const [form] = Form.useForm();
    const [total, setTotal] = useState(0);

    const isMobile = screens.xs;

    const calcTotal = (values: any) => {
        if (!values || !values.items) return setTotal(0);
        const sum = values.items.reduce((acc: number, item: any) => {
            if (item && item.quantity && item.unitCost) {
                return acc + (item.quantity * item.unitCost);
            }
            return acc;
        }, 0);
        setTotal(sum);
    };

    const handleValuesChange = (_: any, allValues: any) => {
        calcTotal(allValues);
    };

    const onFinish = async (values: any) => {
        if (!values.items || values.items.length === 0) {
            return message.error('يجب إضافة صنف واحد على الأقل');
        }

        const formatted = {
            ...values,
            date: values.date.toDate(),
            items: values.items.map((item: any) => ({
                productId: item.productId,
                batchNumber: item.batchNumber,
                expirationDate: item.expirationDate.toDate(),
                quantity: item.quantity,
                unitCost: Math.round(item.unitCost * 100),
            })),
            paidAmount: values.paidAmount ? Math.round(values.paidAmount * 100) : 0,
        };

        await onSubmit(formatted);
    };

    return (
        <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            onValuesChange={handleValuesChange}
            initialValues={{ date: dayjs(), paidAmount: 0, items: [{}] }}
        >
            {/* --- Basic Info --- */}
            <Card title="بيانات الفاتورة" style={{ marginBottom: 16, borderRadius: 12 }}>
                <Row gutter={[16, 0]}>
                    <Col xs={24} md={8}>
                        <Form.Item name="supplierId" label="المورد" rules={[{ required: true, message: 'مطلوب' }]}>
                            <Select
                                showSearch
                                size="large"
                                placeholder="اختر المورد"
                                options={suppliers.map(s => ({ value: s._id, label: s.name }))}
                                filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                            />
                        </Form.Item>
                    </Col>
                    <Col xs={12} md={8}>
                        <Form.Item name="invoiceNumber" label="رقم الفاتورة" rules={[{ required: true, message: 'مطلوب' }]}>
                            <Input size="large" placeholder="رقم الفاتورة" />
                        </Form.Item>
                    </Col>
                    <Col xs={12} md={8}>
                        <Form.Item name="date" label="تاريخ الفاتورة" rules={[{ required: true, message: 'مطلوب' }]}>
                            <DatePicker size="large" style={{ width: '100%' }} />
                        </Form.Item>
                    </Col>
                </Row>
            </Card>

            {/* --- Items List --- */}
            <Card 
                title={<Flex justify="space-between" align="center">الأصناف <ShoppingCartOutlined /></Flex>} 
                style={{ marginBottom: 16, borderRadius: 12 }}
                styles={{ body: { padding: isMobile ? '12px' : '24px' } }}
            >
                <Form.List name="items">
                    {(fields, { add, remove }) => (
                        <>
                            {fields.map(({ key, name, ...restField }) => (
                                <div 
                                    key={key} 
                                    style={{ 
                                        padding: isMobile ? '16px' : '0',
                                        marginBottom: isMobile ? '16px' : '8px',
                                        background: isMobile ? '#fafafa' : 'transparent',
                                        borderRadius: '8px',
                                        border: isMobile ? '1px solid #f0f0f0' : 'none'
                                    }}
                                >
                                    <Row gutter={[8, 8]} align="bottom">
                                        {/* Product Search & Scanner */}
                                        <Col xs={24} md={7}>
                                            <Flex gap={4} align="flex-start">
                                                <Form.Item
                                                    {...restField}
                                                    name={[name, 'productId']}
                                                    label={isMobile ? "الصنف" : ""}
                                                    rules={[{ required: true, message: 'مطلوب' }]}
                                                    style={{ flex: 1, margin: 0 }}
                                                >
                                                    <Select
                                                        showSearch
                                                        placeholder="ابحث عن صنف..."
                                                        options={products.map(p => ({
                                                            value: p._id,
                                                            label: p.nameAr,
                                                            barcode: p.barcode
                                                        }))}
                                                        filterOption={(input, option) => 
                                                            (option?.label ?? '').includes(input) || (option?.barcode ?? '').includes(input)
                                                        }
                                                    />
                                                </Form.Item>
                                                <BarcodeScanner
                                                    onScan={(text) => {
                                                        const p = products.find(prod => prod.barcode === text || prod.barcode2 === text);
                                                        if (p) {
                                                            form.setFieldValue(['items', name, 'productId'], p._id);
                                                            handleValuesChange(null, form.getFieldsValue());
                                                        } else message.warning('غير موجود');
                                                    }}
                                                    buttonProps={{ type: 'default', icon: <BarcodeOutlined /> }}
                                                />
                                            </Flex>
                                        </Col>

                                        {/* Batch Info */}
                                        <Col xs={12} md={4}>
                                            <Form.Item {...restField} name={[name, 'batchNumber']} label={isMobile ? "التشغيلة" : ""} rules={[{ required: true }]} style={{ margin: 0 }}>
                                                <Input placeholder="Batch" />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={12} md={4}>
                                            <Form.Item {...restField} name={[name, 'expirationDate']} label={isMobile ? "الصلاحية" : ""} rules={[{ required: true }]} style={{ margin: 0 }}>
                                                <DatePicker picker="month" format="MM / YY" style={{ width: '100%' }} placeholder="MM/YY" />
                                            </Form.Item>
                                        </Col>

                                        {/* Financials */}
                                        <Col xs={10} md={3}>
                                            <Form.Item {...restField} name={[name, 'quantity']} label={isMobile ? "الكمية" : ""} rules={[{ required: true }]} style={{ margin: 0 }}>
                                                <InputNumber min={1} style={{ width: '100%' }} />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={10} md={4}>
                                            <Form.Item {...restField} name={[name, 'unitCost']} label={isMobile ? "التكلفة" : ""} rules={[{ required: true }]} style={{ margin: 0 }}>
                                                <InputNumber min={0} step={0.5} style={{ width: '100%' }} />
                                            </Form.Item>
                                        </Col>

                                        {/* Delete Action */}
                                        <Col xs={4} md={2} style={{ textAlign: 'center' }}>
                                            <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(name)} />
                                        </Col>
                                    </Row>
                                    {isMobile && <Divider style={{ margin: '12px 0 4px 0' }} />}
                                </div>
                            ))}
                            <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />} size="large" style={{ marginTop: 8 }}>
                                إضافة صنف جديد
                            </Button>
                        </>
                    )}
                </Form.List>
            </Card>

            {/* --- Payment & Summary --- */}
            <Row gutter={16}>
                <Col xs={24} md={12}>
                    <Card title="الدفع" style={{ borderRadius: 12 }}>
                        <Form.Item name="paidAmount" label="المبلغ المدفوع حالياً" extra="اتركه 0 للشراء الآجل">
                            <InputNumber size="large" min={0} style={{ width: '100%' }} prefix="ج.م" />
                        </Form.Item>
                    </Card>
                </Col>
                <Col xs={24} md={12}>
                    <Card style={{ borderRadius: 12, background: '#f0f5ff', border: '1px solid #adc6ff' }}>
                        <Flex vertical align="center" justify="center" style={{ height: '100%', padding: '10px 0' }}>
                            <Text type="secondary">إجمالي الفاتورة</Text>
                            <Title level={2} style={{ margin: 0, color: '#1677ff' }}>
                                {total.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
                            </Title>
                        </Flex>
                    </Card>
                </Col>
            </Row>

            {/* --- Sticky Save Action --- */}
            <div style={{ 
                marginTop: 24, 
                position: isMobile ? 'sticky' : 'static', 
                bottom: isMobile ? 80 : 0, 
                zIndex: 10 
            }}>
                <Button 
                    type="primary" 
                    htmlType="submit" 
                    loading={isSubmitting} 
                    size="large" 
                    block 
                    style={{ height: 50, borderRadius: 12, fontWeight: 'bold', fontSize: 16 }}
                >
                    حفظ وتأكيد الفاتورة
                </Button>
            </div>
        </Form>
    );
}