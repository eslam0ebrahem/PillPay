'use client';

import React, { useState } from 'react';
import { Form, Input, InputNumber, Button, Select, Radio, Alert } from 'antd';
import { useQuery } from '@tanstack/react-query';
import BarcodeScanner from '../common/BarcodeScanner';
import { Flex } from 'antd';

interface TransferFormProps {
    products: any[];
    onSubmit: (values: any) => Promise<void>;
    isLoading: boolean;
}

export default function TransferForm({ products, onSubmit, isLoading }: TransferFormProps) {
    const [form] = Form.useForm();
    const [selectedProduct, setSelectedProduct] = useState<string | null>(null);

    const { data: batches, isLoading: loadingBatches } = useQuery({
        queryKey: ['productBatches', selectedProduct],
        queryFn: async () => {
            if (!selectedProduct) return [];
            const res = await fetch(`/api/products/${selectedProduct}`);
            if (!res.ok) throw new Error('Failed to load product batches');
            const data = await res.json();
            return data.data.batches as any[];
        },
        enabled: !!selectedProduct,
    });

    const direction = Form.useWatch('direction', form);
    const selectedBatchId = Form.useWatch('batchId', form);

    const selectedBatch = batches?.find(b => b._id === selectedBatchId);

    const maxQty = selectedBatch
        ? (direction === 'to_floor' ? selectedBatch.warehouseQty : selectedBatch.floorQty)
        : 0;

    return (
        <Form
            form={form}
            layout="vertical"
            onFinish={onSubmit}
            initialValues={{ direction: 'to_floor' }}
        >
            <Form.Item
                name="direction"
                label="نوع التحويل"
                rules={[{ required: true, message: 'مطلوب' }]}
            >
                <Radio.Group buttonStyle="solid" style={{ width: '100%', display: 'flex' }}>
                    <Radio.Button value="to_floor" style={{ flex: 1, textAlign: 'center' }}>
                        إلى الصيدلية
                    </Radio.Button>
                    <Radio.Button value="to_warehouse" style={{ flex: 1, textAlign: 'center' }}>
                        إلى المخزن
                    </Radio.Button>
                </Radio.Group>
            </Form.Item>

            <Form.Item
                name="productId"
                label="المنتج"
                rules={[{ required: true, message: 'يرجى اختيار المنتج' }]}
            >
                <Flex gap="small">
                    <Select
                        showSearch
                        placeholder="اختر منتج"
                        onChange={(val) => {
                            setSelectedProduct(val);
                            form.setFieldValue('batchId', undefined);
                            form.setFieldValue('quantity', undefined);
                        }}
                        options={products.map(p => ({
                            value: p._id as string,
                            label: `${p.nameAr} | ${p.barcode}`,
                            barcode: p.barcode,
                            barcode2: p.barcode2,
                        }))}
                        filterOption={(input, option) =>
                            (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                        }
                        style={{ flex: 1 }}
                    />
                    <BarcodeScanner
                        onScan={(text) => {
                            const product = products.find(p => p.barcode === text || p.barcode2 === text);
                            if (product) {
                                form.setFieldValue('productId', product._id);
                                setSelectedProduct(product._id);
                                form.setFieldValue('batchId', undefined);
                                form.setFieldValue('quantity', undefined);
                            }
                        }}
                        buttonProps={{ type: 'default' }}
                    />
                </Flex>
            </Form.Item>

            <Form.Item
                name="batchId"
                label="الدفعة"
                rules={[{ required: true, message: 'يرجى اختيار الدفعة' }]}
            >
                <Select
                    loading={loadingBatches}
                    disabled={!selectedProduct || loadingBatches}
                    placeholder="اختر دفعة"
                    options={batches?.map(b => ({
                        value: b._id as string,
                        label: `رقم ${b.batchNumber} - انتهاء ${new Date(b.expirationDate).toLocaleDateString()} (المخزن: ${b.warehouseQty}, الصيدلية: ${b.floorQty})`,
                    }))}
                />
            </Form.Item>

            <Form.Item
                name="quantity"
                label="الكمية المراد تحويلها"
                rules={[
                    { required: true, message: 'يرجى إدخال الكمية' },
                    {
                        validator: async (_, value) => {
                            if (value && value > maxQty) {
                                return Promise.reject(new Error(`الحد الأقصى المتاح ${maxQty}`));
                            }
                            return Promise.resolve();
                        }
                    }
                ]}
            >
                <InputNumber
                    min={1}
                    max={maxQty}
                    style={{ width: '100%' }}
                    disabled={!selectedBatchId || maxQty === 0}
                />
            </Form.Item>

            {selectedBatch && maxQty === 0 && (
                <Alert
                    title="عفواً، لا يوجد رصيد كافي لهذه الدفعة في الموقع المصدر للقيام بهذا التحويل."
                    type="error"
                    showIcon
                    style={{ marginBottom: 16 }}
                />
            )}

            <Form.Item
                name="reason"
                label="سبب التحويل"
                rules={[{ required: true, message: 'يرجى ذكر سبب التحويل' }]}
            >
                <Input.TextArea rows={2} placeholder="مثال: نقل بضاعة للعرض بالصيدلية" />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                <Button
                    type="primary"
                    htmlType="submit"
                    loading={isLoading}
                    disabled={!selectedBatch || maxQty === 0}
                >
                    تنفيذ التحويل
                </Button>
            </Form.Item>
        </Form>
    );
}
