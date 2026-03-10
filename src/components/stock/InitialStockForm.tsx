'use client';

import React, { useState } from 'react';
import { Form, Input, InputNumber, Button, Select, DatePicker, Radio, Flex, Space, Card, Row, Col, Typography } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import BarcodeScanner from '../common/BarcodeScanner';
import { toPiasters, toEGP } from '@/lib/utils/money';
import ar from '@/i18n/ar';

const { Text } = Typography;

interface InitialStockFormProps {
    products: any[];
    preselectedProductId?: string;
    onSubmit: (values: any) => Promise<void>;
    isLoading: boolean;
}

export default function InitialStockForm({ products, preselectedProductId, onSubmit, isLoading }: InitialStockFormProps) {
    const [form] = Form.useForm();
    const [selectedProduct, setSelectedProduct] = useState<string | null>(preselectedProductId || null);

    const handleFinish = async (values: any) => {
        const payload = {
            productId: values.productId,
            batches: values.batches.map((batch: any) => ({
                ...batch,
                expirationDate: batch.expirationDate?.endOf('month').toISOString(),
                purchasePrice: toPiasters(batch.purchasePrice || 0),
            })),
        };
        await onSubmit(payload);
    };

    const handleValuesChange = (changedValues: any, allValues: any) => {
        // Handle product selection change
        if (changedValues.productId !== undefined) {
            setSelectedProduct(changedValues.productId);
            return;
        }

        if (!selectedProduct) return;

        const product = products.find(p => p._id === selectedProduct);
        if (!product) return;

        const sellingPrice = toEGP(product.sellingPrice);

        // Batch price/discount sync
        if (allValues.batches) {
            const changedBatches = changedValues.batches;
            if (changedBatches) {
                // In Ant Design Form.List, changedValues.batches is an array with undefined for unchanged items
                const index = changedBatches.findIndex((b: any) => b !== undefined);
                if (index !== -1) {
                    const changedItem = changedBatches[index];
                    const currentBatches = [...allValues.batches];
                    const currentItem = currentBatches[index];

                    if (!currentItem) return;

                    // Discount -> Purchase Price
                    if (changedItem.discount !== undefined) {
                        const discount = changedItem.discount;
                        if (sellingPrice) {
                            const newPurchasePrice = sellingPrice * (1 - discount / 100);
                            currentItem.purchasePrice = Number(newPurchasePrice.toFixed(2));
                            form.setFieldsValue({ batches: currentBatches });
                        }
                    }

                    // Purchase Price -> Discount
                    if (changedItem.purchasePrice !== undefined) {
                        const purchasePrice = changedItem.purchasePrice;
                        if (sellingPrice && sellingPrice > 0) {
                            const newDiscount = (1 - purchasePrice / sellingPrice) * 100;
                            currentItem.discount = Number(newDiscount.toFixed(2));
                            form.setFieldsValue({ batches: currentBatches });
                        }
                    }
                }
            }
        }
    };

    return (
        <Form
            form={form}
            layout="vertical"
            onFinish={handleFinish}
            onValuesChange={handleValuesChange}
            initialValues={{
                batches: [{ location: 'floor', quantity: 1 }],
                productId: preselectedProductId,
            }}
        >
            <Form.Item
                label={ar.initialStock.product}
                required
            >
                <Flex gap="small">
                    <Form.Item
                        name="productId"
                        noStyle
                        rules={[{ required: true, message: 'يرجى اختيار المنتج' }]}
                    >
                        <Select
                            showSearch
                            placeholder="اختر منتج"
                            disabled={!!preselectedProductId}
                            options={products.map(p => ({
                                value: p._id as string,
                                label: `${p.nameAr} | ${p.barcode || ''}`,
                                barcode: p.barcode,
                                barcode2: p.barcode2,
                            }))}
                            filterOption={(input, option) =>
                                (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                            }
                            style={{ flex: 1 }}
                        />
                    </Form.Item>
                    {!preselectedProductId && (
                        <BarcodeScanner
                            onScan={(text) => {
                                const product = products.find(p => p.barcode === text || p.barcode2 === text);
                                if (product) {
                                    form.setFieldValue('productId', product._id);
                                    setSelectedProduct(product._id);
                                }
                            }}
                            buttonProps={{ type: 'default' }}
                        />
                    )}
                </Flex>
            </Form.Item>

            <Form.List name="batches">
                {(fields, { add, remove }) => (
                    <>
                        {fields.map(({ key, name, ...restField }) => (
                            <Card
                                key={key}
                                size="small"
                                style={{ marginBottom: 16, backgroundColor: '#fafafa' }}
                                title={<Text strong>التشغيلة #{name + 1}</Text>}
                                extra={fields.length > 1 && <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(name)} />}
                            >
                                <Row gutter={16}>
                                    <Col xs={24} md={12}>
                                        <Form.Item
                                            {...restField}
                                            name={[name, 'batchNumber']}
                                            label={ar.initialStock.batchNumber}
                                            rules={[{ required: true, message: 'رقم التشغيلة مطلوب' }]}
                                        >
                                            <Input placeholder="مثال: SHELF-001" />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} md={12}>
                                        <Form.Item
                                            {...restField}
                                            name={[name, 'expirationDate']}
                                            label={ar.initialStock.expirationDate}
                                            rules={[{ required: true, message: 'تاريخ الانتهاء مطلوب' }]}
                                        >
                                            <DatePicker
                                                picker="month"
                                                format="YYYY-MM"
                                                style={{ width: '100%' }}
                                                placeholder="اختر شهر الانتهاء"
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} md={8}>
                                        <Form.Item
                                            {...restField}
                                            name={[name, 'quantity']}
                                            label={ar.initialStock.quantity}
                                            rules={[{ required: true, message: 'الكمية مطلوبة' }]}
                                        >
                                            <InputNumber min={1} style={{ width: '100%' }} placeholder="عدد الوحدات" />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} md={8}>
                                        <Form.Item
                                            {...restField}
                                            name={[name, 'discount']}
                                            label="خصم %"
                                        >
                                            <InputNumber
                                                min={0}
                                                max={100}
                                                step={0.1}
                                                style={{ width: '100%' }}
                                                suffix="%"
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} md={8}>
                                        <Form.Item
                                            {...restField}
                                            name={[name, 'purchasePrice']}
                                            label={ar.initialStock.purchasePrice}
                                            rules={[{ required: true, message: 'سعر الشراء مطلوب' }]}
                                        >
                                            <InputNumber
                                                min={0}
                                                step={0.25}
                                                style={{ width: '100%' }}
                                                suffix="ج.م"
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} md={12}>
                                        <Form.Item
                                            {...restField}
                                            name={[name, 'location']}
                                            label={ar.initialStock.location}
                                        >
                                            <Radio.Group buttonStyle="solid" style={{ width: '100%', display: 'flex' }}>
                                                <Radio.Button value="floor" style={{ flex: 1, textAlign: 'center' }}>
                                                    {ar.initialStock.floor}
                                                </Radio.Button>
                                                <Radio.Button value="warehouse" style={{ flex: 1, textAlign: 'center' }}>
                                                    {ar.initialStock.warehouse}
                                                </Radio.Button>
                                            </Radio.Group>
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24}>
                                        <Form.Item
                                            {...restField}
                                            name={[name, 'notes']}
                                            label={ar.initialStock.notes}
                                        >
                                            <Input.TextArea rows={1} placeholder={ar.initialStock.notesPlaceholder} />
                                        </Form.Item>
                                    </Col>
                                </Row>
                            </Card>
                        ))}
                        <Button
                            type="dashed"
                            onClick={() => add({ location: 'floor', quantity: 1, batchNumber: '' })}
                            block
                            icon={<PlusOutlined />}
                            style={{ marginBottom: 24 }}
                        >
                            إضافة تشغيلة أخرى للمنتج
                        </Button>
                    </>
                )}
            </Form.List>

            <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                <Button
                    type="primary"
                    htmlType="submit"
                    loading={isLoading}
                    disabled={!selectedProduct}
                >
                    {ar.initialStock.submit}
                </Button>
            </Form.Item>
        </Form>
    );
}
