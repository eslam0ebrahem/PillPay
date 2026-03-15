'use client';

import { Button, Card, Col, Flex, Image, InputNumber, Row, Select, Space, Typography } from 'antd';
import { DeleteOutlined, PictureOutlined, PlusOutlined } from '@ant-design/icons';
import type { CustomerOption, StandaloneRefundItem } from './refundTypes';
import { createStandaloneItem } from './refundTypes';
import { formatEGP } from '@/utils/money';
import type { ProductSearchResult } from '@/lib/types';

const { Text } = Typography;

interface Props {
    standaloneItems: StandaloneRefundItem[];
    setStandaloneItems: React.Dispatch<React.SetStateAction<StandaloneRefundItem[]>>;
    customerOptions: CustomerOption[];
    selectedCustomerId: string | undefined;
    setSelectedCustomerId: (v: string | undefined) => void;
    productOptions: ProductSearchResult[];
    searchingProducts: boolean;
    handleProductSearch: (query: string) => void;
    standaloneRefundTotal: number;
    isMobile: boolean | undefined;
}

export default function StandaloneRefundTab({
    standaloneItems,
    setStandaloneItems,
    customerOptions,
    selectedCustomerId,
    setSelectedCustomerId,
    productOptions,
    searchingProducts,
    handleProductSearch,
    standaloneRefundTotal,
    isMobile,
}: Props) {
    const updateItem = (itemId: string, updates: Partial<StandaloneRefundItem>) => {
        setStandaloneItems((items) =>
            items.map((item) => (item.id === itemId ? { ...item, ...updates } : item))
        );
    };

    return (
        <Card
            size={isMobile ? 'small' : 'default'}
            style={{ borderRadius: 8, borderColor: '#e6e6e6' }}
        >
            <Select
                size="large"
                allowClear
                showSearch
                placeholder="عميل المرتجع (اختياري)"
                value={selectedCustomerId}
                onChange={(value) => setSelectedCustomerId(value)}
                options={customerOptions.map((c) => ({ value: c._id, label: c.name }))}
                style={{ width: '100%', marginBottom: 16 }}
                filterOption={(input, option) =>
                    String(option?.label ?? '')
                        .toLowerCase()
                        .includes(input.toLowerCase())
                }
            />

            <Space orientation="vertical" style={{ width: '100%' }} size={isMobile ? 12 : 16}>
                {standaloneItems.map((item, index) => (
                    <Card
                        key={item.id}
                        size="small"
                        style={{ background: '#fafafa', borderRadius: 8 }}
                    >
                        <Flex vertical gap={12}>
                            <Flex justify="space-between" align="center">
                                <Text strong type="secondary">
                                    الصنف {index + 1}
                                </Text>
                                <Button
                                    danger
                                    type="text"
                                    icon={<DeleteOutlined />}
                                    disabled={standaloneItems.length === 1}
                                    onClick={() =>
                                        setStandaloneItems((items) =>
                                            items.filter((current) => current.id !== item.id)
                                        )
                                    }
                                />
                            </Flex>

                            <Select
                                size="large"
                                showSearch
                                style={{ width: '100%' }}
                                placeholder="ابحث عن الصنف..."
                                value={item.productId}
                                loading={searchingProducts}
                                filterOption={false}
                                onSearch={(value) => handleProductSearch(value)}
                                onChange={(value) => {
                                    const selected = productOptions.find((p) => p._id === value);
                                    updateItem(item.id, {
                                        productId: value,
                                        productName: selected?.nameAr ?? '',
                                        productNameEn: selected?.nameEn ?? '',
                                        imageUrl: selected?.imageUrl,
                                        unitPrice: (selected?.sellingPrice ?? 0) / 100,
                                    });
                                }}
                                options={productOptions.map((product) => ({
                                    value: product._id,
                                    label: (
                                        <Flex align="center" gap={8}>
                                            {product.imageUrl ? (
                                                <Image
                                                    src={product.imageUrl}
                                                    alt={product.nameAr}
                                                    width={28}
                                                    height={28}
                                                    style={{ objectFit: 'cover', borderRadius: 4 }}
                                                    preview={false}
                                                    fallback="/no-image.svg"
                                                />
                                            ) : (
                                                <PictureOutlined
                                                    style={{ color: '#d9d9d9', fontSize: 18 }}
                                                />
                                            )}
                                            <Flex vertical>
                                                <Text style={{ fontSize: 14 }}>
                                                    {product.nameAr}
                                                </Text>
                                                {product.nameEn && (
                                                    <Text type="secondary" style={{ fontSize: 11 }}>
                                                        {product.nameEn}
                                                    </Text>
                                                )}
                                            </Flex>
                                        </Flex>
                                    ),
                                }))}
                            />

                            <Row gutter={12}>
                                <Col xs={12}>
                                    <Text
                                        type="secondary"
                                        style={{ fontSize: 12, marginBottom: 4, display: 'block' }}
                                    >
                                        الكمية
                                    </Text>
                                    <InputNumber
                                        size="large"
                                        min={1}
                                        value={item.quantity}
                                        onChange={(value) =>
                                            updateItem(item.id, { quantity: Number(value ?? 1) })
                                        }
                                        style={{ width: '100%', textAlign: 'center' }}
                                    />
                                </Col>
                                <Col xs={12}>
                                    <Text
                                        type="secondary"
                                        style={{ fontSize: 12, marginBottom: 4, display: 'block' }}
                                    >
                                        السعر (ج.م)
                                    </Text>
                                    <InputNumber
                                        size="large"
                                        min={0}
                                        value={item.unitPrice}
                                        onChange={(value) =>
                                            updateItem(item.id, { unitPrice: Number(value ?? 0) })
                                        }
                                        style={{ width: '100%' }}
                                    />
                                </Col>
                            </Row>
                        </Flex>
                    </Card>
                ))}
            </Space>

            <Button
                type="dashed"
                block
                size="large"
                style={{ marginTop: 16 }}
                icon={<PlusOutlined />}
                onClick={() => setStandaloneItems((items) => [...items, createStandaloneItem()])}
            >
                إضافة صنف آخر للمرتجع
            </Button>

            <div style={{ paddingTop: 16, borderTop: '1px solid #f0f0f0', marginTop: 16 }}>
                <Flex justify="space-between" align="center">
                    <Text style={{ fontSize: 16 }}>إجمالي المرتجع اليدوي:</Text>
                    <Text strong style={{ fontSize: 24, color: '#1677ff' }}>
                        {formatEGP(standaloneRefundTotal)}
                    </Text>
                </Flex>
            </div>
        </Card>
    );
}
