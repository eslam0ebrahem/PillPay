'use client';

import { useState, useEffect } from 'react';
import { Table, Button, Form, InputNumber, Select, Input, Tag, Image, App, Grid, List, Card, Space, Typography, Divider, Flex } from 'antd';
import { EditOutlined, PictureOutlined, CalendarOutlined, BarcodeOutlined, ShopOutlined, InboxOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import ar from '@/i18n/ar';
import dayjs from 'dayjs';
import MobileFormWrapper from '../common/MobileFormWrapper';

const { useBreakpoint } = Grid;
const { Text } = Typography;

// 1. Added strict TypeScript interfaces for better maintainability
interface Product {
    _id: string;
    nameAr: string;
    nameEn?: string;
    imageUrl?: string;
}

export interface Batch {
    _id: string;
    batchNumber: string;
    expirationDate: string;
    floorQty: number;
    warehouseQty: number;
    productId: Product;
}

interface StockOverviewClientProps {
    batches: Batch[];
}

export default function StockOverviewClient({ batches }: StockOverviewClientProps) {
    const { message } = App.useApp();
    const router = useRouter();
    const screens = useBreakpoint();
    const [mounted, setMounted] = useState(false);
    
    const [isAdjusting, setIsAdjusting] = useState(false);
    const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
    const [form] = Form.useForm();

    // Prevent hydration errors by waiting for the client to mount
    useEffect(() => {
        setMounted(true);
    }, []);

    const isMobile = screens.xs || (screens.sm && !screens.md);

    const openAdjustModal = (batch: Batch) => {
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
                    productId: selectedBatch?.productId._id,
                    batchId: selectedBatch?._id,
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

    // 2. Extracted rendering logic for reuse
    const renderProductInfo = (product: Product) => {
        if (!product) return <Text type="secondary">-</Text>;
        return (
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ flexShrink: 0 }}>
                    {product.imageUrl ? (
                        <Image
                            src={product.imageUrl}
                            alt={product.nameAr}
                            width={48}
                            height={48}
                            style={{ objectFit: 'cover', borderRadius: 8 }}
                            fallback="https://via.placeholder.com/48?text=No+Image"
                        />
                    ) : (
                        <div style={{ width: 48, height: 48, backgroundColor: '#f5f5f5', display: 'flex', justifyContent: 'center', alignItems: 'center', borderRadius: 8 }}>
                            <PictureOutlined style={{ fontSize: 20, color: '#d9d9d9' }} />
                        </div>
                    )}
                </div>
                <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {product.nameAr}
                    </div>
                    {product.nameEn && (
                        <div style={{ color: '#8c8c8c', fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {product.nameEn}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderExpirationTag = (date: string) => {
        const exp = dayjs(date);
        const isExpired = exp.isBefore(dayjs());
        return (
            <Tag color={isExpired ? 'error' : 'default'} style={{ margin: 0 }}>
                {exp.format('YYYY-MM-DD')}
            </Tag>
        );
    };

    // --- Desktop Table Columns ---
    const columns = [
        {
            title: ar.products.nameAr,
            key: 'productName',
            render: (_: any, record: Batch) => renderProductInfo(record.productId),
        },
        {
            title: ar.batches.batchNumber,
            dataIndex: 'batchNumber',
            key: 'batchNumber',
            render: (text: string) => <Text strong>{text}</Text>,
        },
        {
            title: ar.batches.expirationDate,
            dataIndex: 'expirationDate',
            key: 'expirationDate',
            render: renderExpirationTag,
        },
        {
            title: ar.batches.floorQty,
            dataIndex: 'floorQty',
            key: 'floorQty',
            render: (qty: number) => <Tag color="blue">{qty}</Tag>,
        },
        {
            title: ar.batches.warehouseQty,
            dataIndex: 'warehouseQty',
            key: 'warehouseQty',
            render: (qty: number) => <Tag color="purple">{qty}</Tag>,
        },
        {
            title: 'تعديل يدوي',
            key: 'actions',
            render: (_: any, record: Batch) => (
                <Button
                    icon={<EditOutlined />}
                    size="small"
                    type="primary"
                    ghost
                    onClick={() => openAdjustModal(record)}
                >
                    تعديل
                </Button>
            ),
        },
    ];

    if (!mounted) {
        return <Table loading={true} columns={columns} dataSource={[]} />;
    }

    return (
        <div>
            {/* 3. Conditional Layout: List for Mobile, Table for Desktop */}
            {isMobile ? (
                <List
                    dataSource={batches}
                    rowKey="_id"
                    renderItem={(batch) => (
                        <List.Item style={{ padding: '0 0 16px 0', border: 'none' }}>
                            <Card 
                                size="small" 
                                style={{ width: '100%', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
                            >
                                {renderProductInfo(batch.productId)}
                                
                                <Divider style={{ margin: '12px 0' }} />
                                
                                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                                    <Flex justify="space-between" align="center">
                                        <Text type="secondary"><BarcodeOutlined /> {ar.batches.batchNumber}</Text>
                                        <Text strong>{batch.batchNumber}</Text>
                                    </Flex>
                                    
                                    <Flex justify="space-between" align="center">
                                        <Text type="secondary"><CalendarOutlined /> {ar.batches.expirationDate}</Text>
                                        {renderExpirationTag(batch.expirationDate)}
                                    </Flex>

                                    <Divider style={{ margin: '8px 0', borderStyle: 'dashed' }} />

                                    <Flex justify="space-between" align="center">
                                        <Text type="secondary"><ShopOutlined /> {ar.batches.floorQty}</Text>
                                        <Tag color="blue" style={{ margin: 0, padding: '0 12px', fontSize: 14 }}>{batch.floorQty}</Tag>
                                    </Flex>

                                    <Flex justify="space-between" align="center">
                                        <Text type="secondary"><InboxOutlined /> {ar.batches.warehouseQty}</Text>
                                        <Tag color="purple" style={{ margin: 0, padding: '0 12px', fontSize: 14 }}>{batch.warehouseQty}</Tag>
                                    </Flex>
                                </Space>

                                <Button 
                                    type="primary" 
                                    icon={<EditOutlined />} 
                                    block 
                                    style={{ marginTop: 16 }}
                                    onClick={() => openAdjustModal(batch)}
                                >
                                    تعديل الرصيد
                                </Button>
                            </Card>
                        </List.Item>
                    )}
                />
            ) : (
                <Table
                    columns={columns}
                    dataSource={batches}
                    rowKey="_id"
                    pagination={{ pageSize: 20 }}
                    scroll={{ x: 'max-content' }}
                    size="middle"
                />
            )}

            {/* 4. Optimized Mobile Adjustment Form */}
            <MobileFormWrapper
                title={`تعديل الرصيد - ${selectedBatch?.productId?.nameAr || ''}`}
                open={isAdjusting}
                onClose={() => setIsAdjusting(false)}
            >
                <Form 
                    form={form} 
                    layout="vertical" 
                    onFinish={handleAdjust} 
                    onValuesChange={handleFormChange}
                    style={{ marginTop: 12 }}
                >
                    <Form.Item name="location" label="الموقع" rules={[{ required: true }]}>
                        <Select size="large">
                            <Select.Option value="floor">
                                الصيدلية (الرصيد الحالي: {selectedBatch?.floorQty})
                            </Select.Option>
                            <Select.Option value="warehouse">
                                المخزن (الرصيد الحالي: {selectedBatch?.warehouseQty})
                            </Select.Option>
                        </Select>
                    </Form.Item>

                    <Form.Item name="newQuantity" label="الكمية الجديدة" rules={[{ required: true }]}>
                        <InputNumber min={0} size="large" style={{ width: '100%' }} />
                    </Form.Item>

                    <Form.Item 
                        name="reason" 
                        label="سبب التعديل" 
                        rules={[{ required: true, min: 5, message: 'يجب إدخال سبب واضح (5 حروف على الأقل)' }]}
                    >
                        <Input.TextArea 
                            rows={3} 
                            size="large"
                            placeholder="مثال: جرد يدوي، بضاعة تالفة، خطأ إدخال سابق..." 
                        />
                    </Form.Item>

                    <Button type="primary" htmlType="submit" size="large" block style={{ marginTop: 8 }}>
                        حفظ التعديل
                    </Button>
                </Form>
            </MobileFormWrapper>
        </div>
    );
}