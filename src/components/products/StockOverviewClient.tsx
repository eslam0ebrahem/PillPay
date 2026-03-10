'use client';

import { useState } from 'react';
import { Table, Button, Modal, Form, InputNumber, Select, Input, Tag, Image, App } from 'antd';
import { EditOutlined, PictureOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import ar from '@/i18n/ar';
import dayjs from 'dayjs';
import MobileFormWrapper from '../common/MobileFormWrapper';

interface StockOverviewClientProps {
    batches: any[];
}

export default function StockOverviewClient({ batches }: StockOverviewClientProps) {
    const { message } = App.useApp();
    const router = useRouter();
    const [isAdjusting, setIsAdjusting] = useState(false);
    const [selectedBatch, setSelectedBatch] = useState<any>(null);
    const [form] = Form.useForm();

    const openAdjustModal = (batch: any) => {
        setSelectedBatch(batch);
        form.setFieldsValue({
            location: 'floor',
            newQuantity: batch.floorQty,
            reason: '',
        });
        setIsAdjusting(true);
    };

    const handleFormChange = (changedValues: any, allValues: any) => {
        if (changedValues.location && selectedBatch) {
            form.setFieldsValue({
                newQuantity: changedValues.location === 'floor' ? selectedBatch.floorQty : selectedBatch.warehouseQty
            });
        }
    };

    const handleAdjust = async (values: any) => {
        try {
            const res = await fetch('/api/stock/adjustments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId: selectedBatch.productId._id,
                    batchId: selectedBatch._id,
                    location: values.location,
                    newQuantity: values.newQuantity,
                    reason: values.reason,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error?.message || 'فشل تعديل المخزون');
            }

            const data = await res.json();
            message.success(data.message || 'تم التعديل بنجاح');
            setIsAdjusting(false);
            router.refresh();
        } catch (error: any) {
            message.error(error.message);
        }
    };

    const columns = [
        {
            title: ar.products.nameAr,
            key: 'productName',
            render: (_: any, record: any) => {
                const product = record.productId;
                if (!product) return '-';
                return (
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <div>
                            {product.imageUrl ? (
                                <Image
                                    src={product.imageUrl}
                                    alt={product.nameAr}
                                    width={40}
                                    height={40}
                                    style={{ objectFit: 'cover', borderRadius: 4 }}
                                    fallback="https://via.placeholder.com/40?text=No+Image"
                                />
                            ) : (
                                <div style={{ width: 40, height: 40, backgroundColor: '#f5f5f5', display: 'flex', justifyContent: 'center', alignItems: 'center', borderRadius: 4 }}>
                                    <PictureOutlined style={{ fontSize: 16, color: '#d9d9d9' }} />
                                </div>
                            )}
                        </div>
                        <div>
                            <div>{product.nameAr}</div>
                            {product.nameEn && (
                                <div style={{ color: '#8c8c8c', fontSize: '12px' }}>{product.nameEn}</div>
                            )}
                        </div>
                    </div>
                );
            },
        },
        {
            title: ar.batches.batchNumber,
            dataIndex: 'batchNumber',
            key: 'batchNumber',
        },
        {
            title: ar.batches.expirationDate,
            dataIndex: 'expirationDate',
            key: 'expirationDate',
            render: (date: string) => {
                const exp = dayjs(date);
                const isExpired = exp.isBefore(dayjs());
                return (
                    <Tag color={isExpired ? 'error' : 'default'}>
                        {exp.format('YYYY-MM-DD')}
                    </Tag>
                );
            }
        },
        {
            title: ar.batches.floorQty,
            dataIndex: 'floorQty',
            key: 'floorQty',
        },
        {
            title: ar.batches.warehouseQty,
            dataIndex: 'warehouseQty',
            key: 'warehouseQty',
        },
        {
            title: 'تعديل يدوي',
            key: 'actions',
            render: (_: any, record: any) => (
                <Button
                    icon={<EditOutlined />}
                    size="small"
                    onClick={() => openAdjustModal(record)}
                >
                    تعديل
                </Button>
            ),
        },
    ];

    return (
        <div>
            <Table
                columns={columns}
                dataSource={batches}
                rowKey="_id"
                pagination={{ pageSize: 20 }}
                scroll={{ x: 'max-content' }}
            />

            <MobileFormWrapper
                title={`تعديل الرصيد - ${selectedBatch?.productId?.nameAr}`}
                open={isAdjusting}
                onClose={() => setIsAdjusting(false)}
                destroyOnHidden
            >
                <Form form={form} layout="vertical" onFinish={handleAdjust} onValuesChange={handleFormChange}>
                    <Form.Item name="location" label="الموقع" rules={[{ required: true }]}>
                        <Select>
                            <Select.Option value="floor">صيدلية (الحالي: {selectedBatch?.floorQty})</Select.Option>
                            <Select.Option value="warehouse">مخزن (الحالي: {selectedBatch?.warehouseQty})</Select.Option>
                        </Select>
                    </Form.Item>
                    <Form.Item name="newQuantity" label="الكمية الجديدة" rules={[{ required: true }]}>
                        <InputNumber min={0} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="reason" label="السبب" rules={[{ required: true, min: 5, message: 'يجب إدخال سبب واضح (5 حروف على الأقل)' }]}>
                        <Input.TextArea rows={2} placeholder="مثال: جرد يدوي، تلف، خطأ إدخال..." />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" block>
                        حفظ التعديل
                    </Button>
                </Form>
            </MobileFormWrapper>
        </div>
    );
}
