'use client';

import { useState, useEffect } from 'react';
import { Form, Input, Button, DatePicker, Select, InputNumber, Row, Col, Space, Card, Divider, message, Typography } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import BarcodeScanner from '../common/BarcodeScanner';
import { Flex } from 'antd';

const { Title, Text } = Typography;

interface InvoiceFormProps {
    suppliers: any[];
    products: any[];
    onSubmit: (values: any) => Promise<void>;
    isSubmitting?: boolean;
}

export default function InvoiceForm({ suppliers, products, onSubmit, isSubmitting }: InvoiceFormProps) {
    const [form] = Form.useForm();
    const [total, setTotal] = useState(0);

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
            // Ensure no empty items get through, format items
            items: values.items.map((item: any) => ({
                productId: item.productId,
                batchNumber: item.batchNumber,
                expirationDate: item.expirationDate.toDate(),
                quantity: item.quantity,
                unitCost: Math.round(item.unitCost * 100), // convert EGP to piasters
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
            initialValues={{ date: dayjs(), paidAmount: 0 }}
        >
            <Card title="بيانات الفاتورة الأساسية" style={{ marginBottom: 24 }}>
                <Row gutter={16}>
                    <Col span={8}>
                        <Form.Item name="supplierId" label="المورد" rules={[{ required: true, message: 'مطلوب' }]}>
                            <Select
                                showSearch
                                placeholder="اختر المورد"
                                optionFilterProp="children"
                                options={suppliers.map(s => ({ value: s._id, label: s.name }))}
                            />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item name="invoiceNumber" label="رقم الفاتورة" rules={[{ required: true, message: 'مطلوب' }]}>
                            <Input placeholder="رقم فاتورة المورد" />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item name="date" label="تاريخ الفاتورة" rules={[{ required: true, message: 'مطلوب' }]}>
                            <DatePicker style={{ width: '100%' }} />
                        </Form.Item>
                    </Col>
                </Row>
            </Card>

            <Card title="أصناف الفاتورة" style={{ marginBottom: 24 }}>
                <Form.List name="items">
                    {(fields, { add, remove }) => (
                        <>
                            {fields.map(({ key, name, ...restField }) => (
                                <div key={key} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 16 }}>
                                    <div style={{ display: 'flex', gap: 8, flex: 2 }}>
                                        <Form.Item
                                            {...restField}
                                            name={[name, 'productId']}
                                            rules={[{ required: true, message: 'مطلوب' }]}
                                            style={{ flex: 1, margin: 0 }}
                                        >
                                            <Select
                                                showSearch
                                                placeholder="الصنف"
                                                optionFilterProp="label"
                                                options={products.map(p => ({
                                                    value: p._id,
                                                    label: `${p.nameAr} ${p.barcode ? `| ${p.barcode}` : ''}`,
                                                    searchText: `${p.nameAr} ${p.nameEn || ''} ${p.barcode || ''} ${p.barcode2 || ''}`
                                                }))}
                                                filterOption={(input, option) =>
                                                    (option?.searchText ?? '').toString().toLowerCase().includes(input.toLowerCase())
                                                }
                                            />
                                        </Form.Item>
                                        <BarcodeScanner
                                            onScan={(text) => {
                                                const product = products.find(p => p.barcode === text || p.barcode2 === text);
                                                if (product) {
                                                    form.setFieldValue(['items', name, 'productId'], product._id);
                                                    // Trigger total calculation after scan
                                                    handleValuesChange(null, form.getFieldsValue());
                                                } else {
                                                    message.warning('الصنف غير موجود');
                                                }
                                            }}
                                            buttonProps={{ type: 'default', size: 'middle' }}
                                        />
                                    </div>
                                    <Form.Item
                                        {...restField}
                                        name={[name, 'batchNumber']}
                                        rules={[{ required: true, message: 'مطلوب' }]}
                                        style={{ flex: 1, margin: 0 }}
                                    >
                                        <Input placeholder="رقم التشغيلة (Batch)" />
                                    </Form.Item>
                                    <Form.Item
                                        {...restField}
                                        name={[name, 'expirationDate']}
                                        rules={[{ required: true, message: 'مطلوب' }]}
                                        style={{ flex: 1, margin: 0 }}
                                    >
                                        <DatePicker placeholder="تاريخ الصلاحية" picker="month" format="YYYY-MM" style={{ width: '100%' }} />
                                    </Form.Item>
                                    <Form.Item
                                        {...restField}
                                        name={[name, 'quantity']}
                                        rules={[{ required: true, message: 'مطلوب' }]}
                                        style={{ width: 100, margin: 0 }}
                                    >
                                        <InputNumber placeholder="الكمية" min={1} style={{ width: '100%' }} />
                                    </Form.Item>
                                    <Form.Item
                                        {...restField}
                                        name={[name, 'unitCost']}
                                        rules={[{ required: true, message: 'مطلوب' }]}
                                        style={{ width: 120, margin: 0 }}
                                    >
                                        <InputNumber placeholder="السعر (ج.م)" min={0} step={0.01} style={{ width: '100%' }} />
                                    </Form.Item>
                                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(name)} />
                                </div>
                            ))}
                            <Form.Item>
                                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                                    إضافة صنف
                                </Button>
                            </Form.Item>
                        </>
                    )}
                </Form.List>
                <Divider />
                <Row justify="end">
                    <Col>
                        <Title level={4}>الإجمالي الفرعي: {total.toFixed(2)} ج.م</Title>
                    </Col>
                </Row>
            </Card>

            <Card title="الدفع" style={{ marginBottom: 24 }}>
                <Row gutter={16}>
                    <Col span={8}>
                        <Form.Item name="paidAmount" label="المبلغ المدفوع (ج.م)" help="اتركه 0 إذا لم يتم الدفع">
                            <InputNumber min={0} step={0.01} style={{ width: '100%' }} max={total === 0 ? undefined : total} />
                        </Form.Item>
                    </Col>
                </Row>
            </Card>

            <Form.Item>
                <Button type="primary" htmlType="submit" loading={isSubmitting} size="large" block>
                    حفظ فاتورة المورد
                </Button>
            </Form.Item>
        </Form>
    );
}
