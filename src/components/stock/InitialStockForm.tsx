'use client';

import React, { useState, useEffect } from 'react';
import { Form, Input, InputNumber, Button, Select, DatePicker, Radio, Flex, Card, Row, Col, Typography, Grid } from 'antd';
import { PlusOutlined, DeleteOutlined, SaveOutlined } from '@ant-design/icons';
import BarcodeScanner from '../common/BarcodeScanner';
import StickySubmitBar from '../common/StickySubmitBar';
import { toPiasters, toEGP } from '@/lib/utils/money';
import ar from '@/i18n/ar';

const { Text } = Typography;
const { useBreakpoint } = Grid;

interface InitialStockFormProps {
    products: any[];
    preselectedProductId?: string;
    onSubmit: (values: any) => Promise<void>;
    isLoading: boolean;
}

export default function InitialStockForm({ products, preselectedProductId, onSubmit, isLoading }: InitialStockFormProps) {
    const screens = useBreakpoint();
    const [mounted, setMounted] = useState(false);
    
    const [form] = Form.useForm();
    const [selectedProduct, setSelectedProduct] = useState<string | null>(preselectedProductId || null);

    useEffect(() => {
        setMounted(true);
    }, []);

    const isMobile = screens.xs || (screens.sm && !screens.md);

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
        if (changedValues.productId !== undefined) {
            setSelectedProduct(changedValues.productId);
            return;
        }

        if (!selectedProduct) return;

        const product = products.find(p => p._id === selectedProduct);
        if (!product) return;

        const sellingPrice = toEGP(product.sellingPrice);

        if (allValues.batches) {
            const changedBatches = changedValues.batches;
            if (changedBatches) {
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

    if (!mounted) return null;

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
            // Add massive padding to the bottom on mobile so the form isn't hidden behind the StickySubmitBar
            style={{ paddingBottom: isMobile ? 100 : 0 }}
        >
            <Form.Item label={ar.initialStock.product} required>
                <Flex gap={12} align="stretch">
                    <Form.Item
                        name="productId"
                        noStyle
                        rules={[{ required: true, message: 'يرجى اختيار المنتج' }]}
                    >
                        <Select
                            showSearch
                            size={isMobile ? "large" : "middle"}
                            placeholder="ابحث عن منتج بالاسم..."
                            disabled={!!preselectedProductId}
                            options={products.map(p => ({
                                value: p._id as string,
                                label: `${p.nameAr} ${p.barcode ? `| ${p.barcode}` : ''}`,
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
                            buttonText="" // Hide text on mobile to save space
                            buttonProps={{ 
                                type: 'primary', 
                                ghost: true, 
                                size: isMobile ? 'large' : 'middle',
                                style: { width: isMobile ? 56 : 40, padding: 0 } 
                            }}
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
                                size={isMobile ? "small" : "default"}
                                style={{ 
                                    marginBottom: 16, 
                                    backgroundColor: '#fafafa', 
                                    borderRadius: 8,
                                    border: '1px solid #e6e6e6'
                                }}
                                title={<Text strong>التشغيلة #{name + 1}</Text>}
                                extra={
                                    fields.length > 1 && (
                                        <Button 
                                            type="text" 
                                            danger 
                                            icon={<DeleteOutlined />} 
                                            onClick={() => remove(name)} 
                                            size="middle"
                                        />
                                    )
                                }
                            >
                                <Row gutter={[16, isMobile ? 8 : 16]}>
                                    <Col xs={24} md={12}>
                                        <Form.Item
                                            {...restField}
                                            name={[name, 'batchNumber']}
                                            label={ar.initialStock.batchNumber}
                                            rules={[{ required: true, message: 'مطلوب' }]}
                                        >
                                            <Input size={isMobile ? "large" : "middle"} placeholder="مثال: SHELF-001" />
                                        </Form.Item>
                                    </Col>
                                    
                                    <Col xs={24} md={12}>
                                        <Form.Item
                                            {...restField}
                                            name={[name, 'expirationDate']}
                                            label={ar.initialStock.expirationDate}
                                            rules={[{ required: true, message: 'مطلوب' }]}
                                        >
                                            <DatePicker
                                                picker="month"
                                                format="YYYY-MM"
                                                size={isMobile ? "large" : "middle"}
                                                style={{ width: '100%' }}
                                                placeholder="اختر شهر الانتهاء"
                                            />
                                        </Form.Item>
                                    </Col>
                                    
                                    <Col xs={12} md={8}>
                                        <Form.Item
                                            {...restField}
                                            name={[name, 'quantity']}
                                            label={ar.initialStock.quantity}
                                            rules={[{ required: true, message: 'مطلوب' }]}
                                        >
                                            <InputNumber min={1} size={isMobile ? "large" : "middle"} style={{ width: '100%' }} placeholder="العدد" />
                                        </Form.Item>
                                    </Col>

                                    <Col xs={12} md={8}>
                                        <Form.Item
                                            {...restField}
                                            name={[name, 'discount']}
                                            label="خصم %"
                                        >
                                            <InputNumber
                                                min={0}
                                                max={100}
                                                step={0.1}
                                                size={isMobile ? "large" : "middle"}
                                                style={{ width: '100%' }}
                                                placeholder="%"
                                            />
                                        </Form.Item>
                                    </Col>

                                    <Col xs={24} md={8}>
                                        <Form.Item
                                            {...restField}
                                            name={[name, 'purchasePrice']}
                                            label={ar.initialStock.purchasePrice}
                                            rules={[{ required: true, message: 'مطلوب' }]}
                                        >
                                            <InputNumber
                                                min={0}
                                                step={0.25}
                                                size={isMobile ? "large" : "middle"}
                                                style={{ width: '100%' }}
                                                addonAfter="ج.م"
                                            />
                                        </Form.Item>
                                    </Col>

                                    <Col xs={24} md={12}>
                                        <Form.Item
                                            {...restField}
                                            name={[name, 'location']}
                                            label={ar.initialStock.location}
                                        >
                                            <Radio.Group 
                                                buttonStyle="solid" 
                                                size={isMobile ? "large" : "middle"}
                                                style={{ width: '100%', display: 'flex' }}
                                            >
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
                                            style={{ marginBottom: 0 }}
                                        >
                                            <Input.TextArea 
                                                rows={isMobile ? 2 : 1} 
                                                size={isMobile ? "large" : "middle"}
                                                placeholder={ar.initialStock.notesPlaceholder} 
                                            />
                                        </Form.Item>
                                    </Col>
                                </Row>
                            </Card>
                        ))}

                        <Button
                            type="dashed"
                            size={isMobile ? "large" : "middle"}
                            onClick={() => add({ location: 'floor', quantity: 1, batchNumber: '' })}
                            block
                            icon={<PlusOutlined />}
                            style={{ marginBottom: 24, height: isMobile ? 50 : undefined, borderRadius: 8 }}
                        >
                            إضافة تشغيلة أخرى للمنتج
                        </Button>
                    </>
                )}
            </Form.List>

            {/* Sticky Submit Bar integration for Mobile, inline button for Desktop */}
            {isMobile ? (
                <StickySubmitBar>
                    <Button
                        type="primary"
                        htmlType="submit"
                        size="large"
                        icon={<SaveOutlined />}
                        loading={isLoading}
                        disabled={!selectedProduct}
                        block
                        style={{ height: 50, fontSize: 16, borderRadius: 8 }}
                    >
                        {ar.initialStock.submit}
                    </Button>
                </StickySubmitBar>
            ) : (
                <Form.Item style={{ marginBottom: 0, textAlign: 'left' }}>
                    <Button
                        type="primary"
                        htmlType="submit"
                        size="large"
                        icon={<SaveOutlined />}
                        loading={isLoading}
                        disabled={!selectedProduct}
                        style={{ minWidth: 150 }}
                    >
                        {ar.initialStock.submit}
                    </Button>
                </Form.Item>
            )}
        </Form>
    );
}