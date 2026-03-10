'use client';

import React, { useState } from 'react';
import { Form, Input, InputNumber, Button, Select, DatePicker, Radio, Flex } from 'antd';
import BarcodeScanner from '../common/BarcodeScanner';
import { toPiasters } from '@/lib/utils/money';
import ar from '@/i18n/ar';

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
            ...values,
            expirationDate: values.expirationDate?.endOf('month').toISOString(),
            purchasePrice: toPiasters(values.purchasePrice || 0),
        };
        await onSubmit(payload);
    };

    return (
        <Form
            form={form}
            layout="vertical"
            onFinish={handleFinish}
            initialValues={{
                location: 'floor',
                productId: preselectedProductId,
            }}
        >
            <Form.Item
                name="productId"
                label={ar.initialStock.product}
                rules={[{ required: true, message: 'يرجى اختيار المنتج' }]}
            >
                <Flex gap="small">
                    <Select
                        showSearch
                        placeholder="اختر منتج"
                        disabled={!!preselectedProductId}
                        onChange={(val) => setSelectedProduct(val)}
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

            <Form.Item
                name="batchNumber"
                label={ar.initialStock.batchNumber}
                rules={[{ required: true, message: 'رقم التشغيلة مطلوب' }]}
            >
                <Input placeholder="مثال: SHELF-001" />
            </Form.Item>

            <Form.Item
                name="expirationDate"
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

            <Form.Item
                name="quantity"
                label={ar.initialStock.quantity}
                rules={[{ required: true, message: 'الكمية مطلوبة' }]}
            >
                <InputNumber min={1} style={{ width: '100%' }} placeholder="عدد الوحدات" />
            </Form.Item>

            <Form.Item
                name="purchasePrice"
                label={ar.initialStock.purchasePrice}
                rules={[{ required: true, message: 'سعر الشراء مطلوب' }]}
            >
                <InputNumber min={0} step={0.25} style={{ width: '100%' }} placeholder="السعر بالجنيه" addonAfter="ج.م" />
            </Form.Item>

            <Form.Item
                name="location"
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

            <Form.Item
                name="notes"
                label={ar.initialStock.notes}
            >
                <Input.TextArea rows={2} placeholder={ar.initialStock.notesPlaceholder} />
            </Form.Item>

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
