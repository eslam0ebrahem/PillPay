'use client';

import React, { useState, useEffect } from 'react';
import { Form, Input, InputNumber, Button, Select, Radio, Alert, Flex, Typography, Grid, Tag, Divider } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { SwapOutlined, ArrowRightOutlined, InfoCircleOutlined } from '@ant-design/icons';
import BarcodeScanner from '../common/BarcodeScanner';
import StickySubmitBar from '../common/StickySubmitBar';

const { Text } = Typography;
const { useBreakpoint } = Grid;

interface TransferFormProps {
    products: any[];
    onSubmit: (values: any) => Promise<void>;
    isLoading: boolean;
}

export default function TransferForm({ products, onSubmit, isLoading }: TransferFormProps) {
    const [form] = Form.useForm();
    const screens = useBreakpoint();
    const [mounted, setMounted] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<string | null>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    const isMobile = screens.xs || (screens.sm && !screens.md);

    const { data: batches, isLoading: loadingBatches } = useQuery({
        queryKey: ['productBatches', selectedProduct],
        queryFn: async () => {
            if (!selectedProduct) return [];
            const res = await fetch(`/api/products/${selectedProduct}`);
            if (!res.ok) throw new Error('Failed to load product batches');
            const data = await res.json();
            return data.batches as any[];
        },
        enabled: !!selectedProduct,
    });

    const direction = Form.useWatch('direction', form);
    const selectedBatchId = Form.useWatch('batchId', form);
    const selectedBatch = batches?.find(b => b._id === selectedBatchId);

    const maxQty = selectedBatch
        ? (direction === 'to_floor' ? (selectedBatch.warehouseQty || 0) : (selectedBatch.floorQty || 0))
        : 0;

    if (!mounted) return null;

    return (
        <Form
            form={form}
            layout="vertical"
            onFinish={onSubmit}
            initialValues={{ direction: 'to_floor' }}
            style={{ paddingBottom: isMobile ? 80 : 0 }}
        >
            <Form.Item
                name="direction"
                label="مسار التحويل"
                rules={[{ required: true }]}
            >
                <Radio.Group buttonStyle="solid" style={{ width: '100%' }}>
                    <Flex gap={8}>
                        <Radio.Button value="to_floor" style={{ flex: 1, textAlign: 'center', height: 45, lineHeight: '45px' }}>
                            <Flex align="center" justify="center" gap={4}>
                                <ArrowRightOutlined /> إلى الصيدلية
                            </Flex>
                        </Radio.Button>
                        <Radio.Button value="to_warehouse" style={{ flex: 1, textAlign: 'center', height: 45, lineHeight: '45px' }}>
                            <Flex align="center" justify="center" gap={4}>
                                <ArrowRightOutlined style={{ transform: 'rotate(180deg)' }} /> إلى المخزن
                            </Flex>
                        </Radio.Button>
                    </Flex>
                </Radio.Group>
            </Form.Item>

            <Form.Item label="المنتج المراد نقله" required>
                <Flex gap={8}>
                    <Form.Item
                        name="productId"
                        noStyle
                        rules={[{ required: true, message: 'اختر المنتج' }]}
                    >
                        <Select
                            showSearch
                            size="large"
                            placeholder="ابحث بالاسم أو الباركود..."
                            onChange={(val) => {
                                setSelectedProduct(val);
                                form.setFieldsValue({ batchId: undefined, quantity: undefined });
                            }}
                            options={products.map(p => ({
                                value: p._id as string,
                                label: `${p.nameAr} | ${p.barcode}`,
                            }))}
                            style={{ flex: 1 }}
                        />
                    </Form.Item>
                    <BarcodeScanner
                        onScan={(text) => {
                            const product = products.find(p => p.barcode === text || p.barcode2 === text);
                            if (product) {
                                form.setFieldValue('productId', product._id);
                                setSelectedProduct(product._id);
                                form.setFieldsValue({ batchId: undefined, quantity: undefined });
                            }
                        }}
                        buttonProps={{ type: 'primary', ghost: true, size: 'large' }}
                    />
                </Flex>
            </Form.Item>

            <Form.Item
                name="batchId"
                label="اختر الدفعة (Batch)"
                rules={[{ required: true, message: 'اختر الدفعة' }]}
            >
                <Select
                    loading={loadingBatches}
                    size="large"
                    disabled={!selectedProduct || loadingBatches}
                    placeholder="اختر الدفعة لتحديد الرصيد"
                    options={batches?.map(b => ({
                        value: b._id as string,
                        label: `رقم ${b.batchNumber} - ينتهي ${new Date(b.expirationDate).toLocaleDateString('ar-EG')}`,
                    }))}
                />
            </Form.Item>

            {selectedBatch && (
                <div style={{ background: '#f5f5f5', padding: '12px', borderRadius: '8px', marginBottom: '24px' }}>
                    <Flex justify="space-between" align="center">
                        <Text type="secondary">الرصيد المتاح حالياً:</Text>
                        <Tag color={maxQty > 0 ? "green" : "red"} style={{ fontSize: '16px', padding: '4px 12px' }}>
                            {maxQty} وحدة
                        </Tag>
                    </Flex>
                    <Divider style={{ margin: '8px 0' }} />
                    <Text type="secondary" italic style={{ fontSize: '13px' }}>
                        <InfoCircleOutlined /> يتم النقل من {direction === 'to_floor' ? 'المخزن الرئيسي' : 'أرفف الصيدلية'}
                    </Text>
                </div>
            )}

            <Form.Item
                name="quantity"
                label="الكمية المراد تحويلها"
                rules={[
                    { required: true, message: 'أدخل الكمية' },
                    {
                        validator: async (_, value) => {
                            if (value && value > maxQty) throw new Error(`الرصيد المتاح ${maxQty} فقط`);
                            if (value && value <= 0) throw new Error('الكمية يجب أن تكون أكبر من صفر');
                        }
                    }
                ]}
            >
                <InputNumber
                    min={1}
                    max={maxQty}
                    size="large"
                    style={{ width: '100%' }}
                    placeholder="0"
                    disabled={!selectedBatchId || maxQty === 0}
                />
            </Form.Item>

            <Form.Item
                name="reason"
                label="ملاحظات التحويل"
                rules={[{ required: true, message: 'يرجى كتابة سبب التحويل' }]}
            >
                <Input.TextArea 
                    rows={2} 
                    size="large" 
                    placeholder="مثال: تعويض نقص الأرفف / جرد دوري" 
                />
            </Form.Item>

            {isMobile ? (
                <StickySubmitBar>
                    <Button
                        type="primary"
                        htmlType="submit"
                        size="large"
                        loading={isLoading}
                        disabled={!selectedBatch || maxQty === 0}
                        block
                        icon={<SwapOutlined />}
                    >
                        تأكيد نقل الكمية
                    </Button>
                </StickySubmitBar>
            ) : (
                <Form.Item style={{ marginBottom: 0, textAlign: 'left' }}>
                    <Button
                        type="primary"
                        htmlType="submit"
                        size="large"
                        icon={<SwapOutlined />}
                        loading={isLoading}
                        disabled={!selectedBatch || maxQty === 0}
                        style={{ minWidth: 180 }}
                    >
                        تنفيذ التحويل
                    </Button>
                </Form.Item>
            )}
        </Form>
    );
}