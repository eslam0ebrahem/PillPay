'use client';

import { useState, useEffect } from 'react';
import { Table, InputNumber, Button, Space, Select, Typography, Row, Image, Col, Grid, Flex, Divider, Empty } from 'antd';
import { DeleteOutlined, PictureOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import MoneyDisplay from '../common/MoneyDisplay';
import ResponsiveDataView from '../common/ResponsiveDataView';
import StickySubmitBar from '../common/StickySubmitBar';
import ar from '@/i18n/ar';
import type { CartItem, DiscountObj } from '@/lib/types';
import { DataCard } from '../common/DataCard';

const { Text, Title } = Typography;
const { useBreakpoint } = Grid;

interface CartProps {
    items: CartItem[];
    onUpdateQuantity: (id: string, qty: number) => void;
    onUpdateDiscount: (id: string, discount?: DiscountObj) => void;
    onRemoveItem: (id: string) => void;
    invoiceDiscount?: DiscountObj;
    onUpdateInvoiceDiscount: (discount?: DiscountObj) => void;
    onGoToCheckout?: () => void;
}

export default function Cart({
    items,
    onUpdateQuantity,
    onUpdateDiscount,
    onRemoveItem,
    invoiceDiscount,
    onUpdateInvoiceDiscount,
    onGoToCheckout,
}: CartProps) {
    const screens = useBreakpoint();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const isMobile = screens.xs || (screens.sm && !screens.md);

    // --- Calculations ---
    const invoiceSubtotal = items.reduce((sum, item) => sum + item.computedSubtotal, 0);

    let total = invoiceSubtotal;
    if (invoiceDiscount) {
        if (invoiceDiscount.type === 'amount') {
            total = Math.max(0, invoiceSubtotal - invoiceDiscount.value);
        } else {
            total = Math.max(0, invoiceSubtotal - Math.round((invoiceSubtotal * invoiceDiscount.value) / 10000));
        }
    }

    // --- Desktop Table Columns ---
    const columns = [
        {
            title: ar.products.nameAr,
            key: 'name',
            render: (_: any, record: CartItem) => (
                <Flex gap={12} align="center">
                    <div style={{ flexShrink: 0 }}>
                        {record.product.imageUrl ? (
                            <Image
                                src={record.product.imageUrl}
                                alt={record.product.nameAr}
                                width={48}
                                height={48}
                                style={{ objectFit: 'cover', borderRadius: 6 }}
                                fallback="https://via.placeholder.com/48?text=No+Image"
                            />
                        ) : (
                            <div style={{ width: 48, height: 48, backgroundColor: '#f5f5f5', display: 'flex', justifyContent: 'center', alignItems: 'center', borderRadius: 6 }}>
                                <PictureOutlined style={{ fontSize: 20, color: '#d9d9d9' }} />
                            </div>
                        )}
                    </div>
                    <div>
                        <div style={{ fontWeight: 500, fontSize: 15 }}>{record.product.nameAr}</div>
                        {record.product.nameEn && (
                            <div style={{ color: '#8c8c8c', fontSize: '13px' }}>{record.product.nameEn}</div>
                        )}
                    </div>
                </Flex>
            ),
        },
        {
            title: ar.pos.quantity,
            key: 'quantity',
            width: 150,
            render: (_: any, record: CartItem) => (
                <Space.Compact>
                    <InputNumber
                        min={1}
                        value={record.quantity}
                        onChange={(val) => onUpdateQuantity(record.id, val || 1)}
                        style={{ width: 70, textAlign: 'center' }}
                    />
                    <Button disabled style={{ color: '#595959', backgroundColor: '#fafafa' }}>
                        {record.unitSold === 'sub' ? record.product.subUnit : record.product.baseUnit}
                    </Button>
                </Space.Compact>
            ),
        },
        {
            title: ar.pos.unitPrice,
            key: 'price',
            width: 120,
            render: (_: any, record: CartItem) => <MoneyDisplay amount={record.computedUnitPrice} />,
        },
        {
            title: ar.pos.discount,
            key: 'discount',
            width: 180,
            render: (_: any, record: CartItem) => (
                <Space.Compact style={{ width: '100%' }}>
                    <Select
                        value={record.discount?.type || 'amount'}
                        onChange={(val) => {
                            const currentVal = record.discount?.value || 0;
                            onUpdateDiscount(record.id, { type: val, value: currentVal });
                        }}
                        style={{ width: 65 }}
                        options={[
                            { value: 'amount', label: 'EGP' },
                            { value: 'percentage', label: '%' },
                        ]}
                    />
                    <InputNumber
                        min={0}
                        value={record.discount?.type === 'percentage' ? (record.discount.value / 100) : (record.discount?.value ? record.discount.value / 100 : 0)}
                        onChange={(val) => {
                            if (val === null || val === undefined) {
                                onUpdateDiscount(record.id, undefined);
                                return;
                            }
                            const type = record.discount?.type || 'amount';
                            const dbValue = type === 'percentage' ? val * 100 : val * 100;
                            onUpdateDiscount(record.id, { type, value: Math.round(dbValue) });
                        }}
                        style={{ width: '100%' }}
                    />
                </Space.Compact>
            ),
        },
        {
            title: ar.pos.subtotal,
            key: 'subtotal',
            width: 120,
            render: (_: any, record: CartItem) => <Text strong><MoneyDisplay amount={record.computedSubtotal} /></Text>,
        },
        {
            title: '',
            key: 'action',
            width: 60,
            align: 'center' as const,
            render: (_: any, record: CartItem) => (
                <Button danger type="text" icon={<DeleteOutlined />} onClick={() => onRemoveItem(record.id)} />
            ),
        },
    ];

    // --- Mobile Card Layout ---
    const renderMobileCard = (record: CartItem) => {
        const titleContent = (
            <Flex gap={12} align="center" style={{ width: '100%' }}>
                <div style={{ flexShrink: 0 }}>
                    {record.product.imageUrl ? (
                        <Image
                            src={record.product.imageUrl}
                            alt={record.product.nameAr}
                            width={56}
                            height={56}
                            style={{ objectFit: 'cover', borderRadius: 8 }}
                            fallback="https://via.placeholder.com/56?text=No+Image"
                        />
                    ) : (
                        <div style={{ width: 56, height: 56, backgroundColor: '#f5f5f5', display: 'flex', justifyContent: 'center', alignItems: 'center', borderRadius: 8 }}>
                            <PictureOutlined style={{ fontSize: 24, color: '#d9d9d9' }} />
                        </div>
                    )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <Flex justify="space-between" align="flex-start">
                        <div style={{ fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: 8 }}>
                            {record.product.nameAr}
                        </div>
                        <Button danger type="text" icon={<DeleteOutlined />} size="small" onClick={() => onRemoveItem(record.id)} style={{ marginTop: -4, marginRight: -8 }} />
                    </Flex>
                    <Text type="secondary" style={{ fontSize: 13 }}>
                        <MoneyDisplay amount={record.computedUnitPrice} />
                        {' / '}
                        {record.unitSold === 'sub' ? record.product.subUnit : record.product.baseUnit}
                    </Text>
                </div>
            </Flex>
        );

        return (
            <DataCard
                title={titleContent}
                properties={[
                    {
                        label: 'الكمية',
                        fullWidth: true,
                        value: (
                            <Flex align="center" style={{ width: '100%', marginTop: 4 }}>
                                <Button
                                    size="large"
                                    onClick={() => onUpdateQuantity(record.id, Math.max(1, record.quantity - 1))}
                                    style={{ borderRadius: '8px 0 0 8px', width: 44 }}
                                >
                                    -
                                </Button>
                                <InputNumber
                                    min={1}
                                    size="large"
                                    value={record.quantity}
                                    onChange={(val) => onUpdateQuantity(record.id, val || 1)}
                                    style={{ flex: 1, textAlign: 'center', borderRadius: 0 }}
                                    controls={false}
                                />
                                <Button
                                    size="large"
                                    onClick={() => onUpdateQuantity(record.id, record.quantity + 1)}
                                    style={{ borderRadius: '0 8px 8px 0', width: 44 }}
                                >
                                    +
                                </Button>
                            </Flex>
                        )
                    },
                    {
                        label: 'خصم الصنف',
                        fullWidth: true,
                        value: (
                            <Space.Compact style={{ width: '100%', marginTop: 4 }}>
                                <Select
                                    size="large"
                                    value={record.discount?.type || 'amount'}
                                    onChange={(val) => {
                                        const currentVal = record.discount?.value || 0;
                                        onUpdateDiscount(record.id, { type: val, value: currentVal });
                                    }}
                                    style={{ width: 80 }}
                                    options={[
                                        { value: 'amount', label: 'ج.م' },
                                        { value: 'percentage', label: '%' },
                                    ]}
                                />
                                <InputNumber
                                    size="large"
                                    min={0}
                                    placeholder="بدون خصم"
                                    value={record.discount?.type === 'percentage' ? (record.discount.value / 100) : (record.discount?.value ? record.discount.value / 100 : undefined)}
                                    onChange={(val) => {
                                        if (val === null || val === undefined) {
                                            onUpdateDiscount(record.id, undefined);
                                            return;
                                        }
                                        const type = record.discount?.type || 'amount';
                                        const dbValue = type === 'percentage' ? val * 100 : val * 100;
                                        onUpdateDiscount(record.id, { type, value: Math.round(dbValue) });
                                    }}
                                    style={{ width: '100%' }}
                                />
                            </Space.Compact>
                        )
                    },
                    {
                        label: 'الإجمالي',
                        value: (
                            <div style={{ fontSize: 18, fontWeight: 'bold', color: '#1677ff', paddingTop: 8 }}>
                                <MoneyDisplay amount={record.computedSubtotal} />
                            </div>
                        )
                    }
                ]}
            />
        );
    };

    if (!mounted) return null;

    if (items.length === 0) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: 300 }}>
                <Empty 
                    image={<ShoppingCartOutlined style={{ fontSize: 64, color: '#e6e6e6' }} />} 
                    description={<Text type="secondary" style={{ fontSize: 16 }}>السلة فارغة حالياً</Text>} 
                />
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', paddingBottom: isMobile && onGoToCheckout ? 100 : 0 }}>
            <div style={{ flex: 1, minHeight: 0 }}>
                <ResponsiveDataView
                    data={items}
                    tableColumns={columns}
                    rowKey="id"
                    renderCard={renderMobileCard}
                    pagination={false}
                    tableProps={{
                        scroll: { x: 'max-content', y: isMobile ? undefined : 400 },
                        size: 'middle'
                    }}
                />
            </div>

            {/* --- Invoice Summary Bottom Bar --- */}
            <div style={{ 
                marginTop: 'auto', 
                padding: isMobile ? '16px 0 0 0' : 24, 
                borderTop: '2px dashed #f0f0f0',
                background: isMobile ? 'transparent' : '#fafafa',
                borderRadius: isMobile ? 0 : '0 0 8px 8px'
            }}>
                <Flex vertical gap={12}>
                    <Flex justify="space-between" align="center">
                        <Text style={{ fontSize: 15 }}>{ar.pos.subtotal}</Text>
                        <Text strong style={{ fontSize: 16 }}><MoneyDisplay amount={invoiceSubtotal} /></Text>
                    </Flex>
                    
                    <Flex justify="space-between" align="center" wrap="wrap" gap={8}>
                        <Text style={{ fontSize: 15 }}>{ar.pos.invoiceDiscount}</Text>
                        <Flex gap={8} align="center">
                            <Space.Compact>
                                <Select
                                    size="middle"
                                    value={invoiceDiscount?.type || 'amount'}
                                    onChange={(val) => {
                                        const currentVal = invoiceDiscount?.value || 0;
                                        onUpdateInvoiceDiscount({ type: val as 'amount' | 'percentage', value: currentVal });
                                    }}
                                    options={[
                                        { value: 'amount', label: 'ج.م' },
                                        { value: 'percentage', label: '%' },
                                    ]}
                                    style={{ width: 70 }}
                                />
                                <InputNumber
                                    size="middle"
                                    min={0}
                                    placeholder="0"
                                    value={invoiceDiscount?.type === 'percentage' ? (invoiceDiscount.value / 100) : (invoiceDiscount?.value ? invoiceDiscount.value / 100 : undefined)}
                                    onChange={(val) => {
                                        if (!val) {
                                            onUpdateInvoiceDiscount(undefined);
                                            return;
                                        }
                                        const type = invoiceDiscount?.type || 'amount';
                                        const dbValue = type === 'percentage' ? val * 100 : val * 100;
                                        onUpdateInvoiceDiscount({ type, value: Math.round(dbValue) });
                                    }}
                                    style={{ width: 100 }}
                                />
                            </Space.Compact>
                            {invoiceSubtotal - total > 0 && (
                                <Text type="danger" strong>
                                    - <MoneyDisplay amount={invoiceSubtotal - total} />
                                </Text>
                            )}
                        </Flex>
                    </Flex>

                    <Divider style={{ margin: '8px 0' }} />

                    <Flex justify="space-between" align="center">
                        <Title level={isMobile ? 4 : 3} style={{ margin: 0 }}>{ar.pos.total}:</Title>
                        <Title level={isMobile ? 3 : 2} style={{ margin: 0, color: '#1677ff' }}>
                            <MoneyDisplay amount={total} />
                        </Title>
                    </Flex>
                </Flex>
            </div>

            {onGoToCheckout && items.length > 0 && isMobile && (
                <StickySubmitBar>
                    <Button 
                        type="primary" 
                        size="large" 
                        block 
                        onClick={onGoToCheckout}
                        style={{ height: 56, fontSize: 18, borderRadius: 8 }}
                    >
                        الانتقال للدفع
                    </Button>
                </StickySubmitBar>
            )}
        </div>
    );
}