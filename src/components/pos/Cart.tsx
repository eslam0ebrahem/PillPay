'use client';

import { Table, InputNumber, Button, Space, Select, Typography, Row, Image, Col, Card } from 'antd';
import { DeleteOutlined, PictureOutlined } from '@ant-design/icons';
import MoneyDisplay from '../common/MoneyDisplay';
import ResponsiveDataView from '../common/ResponsiveDataView';
import StickySubmitBar from '../common/StickySubmitBar';
import ar from '@/i18n/ar';
import type { CartItem, DiscountObj } from '@/lib/types';

const { Text } = Typography;

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
    const invoiceSubtotal = items.reduce((sum, item) => sum + item.computedSubtotal, 0);

    let total = invoiceSubtotal;
    if (invoiceDiscount) {
        if (invoiceDiscount.type === 'amount') {
            total = Math.max(0, invoiceSubtotal - invoiceDiscount.value);
        } else {
            total = Math.max(0, invoiceSubtotal - Math.round((invoiceSubtotal * invoiceDiscount.value) / 10000));
        }
    }

    const columns = [
        {
            title: ar.products.nameAr,
            key: 'name',
            render: (_: any, record: CartItem) => (
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div>
                        {record.product.imageUrl ? (
                            <Image
                                src={record.product.imageUrl}
                                alt={record.product.nameAr}
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
                        <div>{record.product.nameAr}</div>
                        {record.product.nameEn && (
                            <div style={{ color: '#8c8c8c', fontSize: '12px' }}>{record.product.nameEn}</div>
                        )}
                    </div>
                </div>
            ),
        },
        {
            title: ar.pos.quantity,
            key: 'quantity',
            render: (_: any, record: CartItem) => (
                <Space>
                    <InputNumber
                        min={1}
                        value={record.quantity}
                        onChange={(val) => onUpdateQuantity(record.id, val || 1)}
                    />
                    <Text type="secondary">
                        {record.unitSold === 'sub' ? record.product.subUnit : record.product.baseUnit}
                    </Text>
                </Space>
            ),
        },
        {
            title: ar.pos.unitPrice,
            key: 'price',
            render: (_: any, record: CartItem) => <MoneyDisplay amount={record.computedUnitPrice} />,
        },
        {
            title: ar.pos.discount,
            key: 'discount',
            render: (_: any, record: CartItem) => (
                <Space.Compact>
                    <Select
                        value={record.discount?.type || 'amount'}
                        onChange={(val) => {
                            const currentVal = record.discount?.value || 0;
                            onUpdateDiscount(record.id, { type: val, value: currentVal });
                        }}
                        style={{ width: 80 }}
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
                    />
                </Space.Compact>
            ),
        },
        {
            title: ar.pos.subtotal,
            key: 'subtotal',
            render: (_: any, record: CartItem) => <MoneyDisplay amount={record.computedSubtotal} />,
        },
        {
            title: '',
            key: 'action',
            render: (_: any, record: CartItem) => (
                <Button danger icon={<DeleteOutlined />} onClick={() => onRemoveItem(record.id)} />
            ),
        },
    ];

    const renderMobileCard = (record: CartItem) => {
        return (
            <Card size="small" style={{ width: '100%', marginBottom: 8, borderRadius: 12 }}>
                <Row align="middle" style={{ marginBottom: 12 }}>
                    <Col flex="48px">
                        {record.product.imageUrl ? (
                            <Image
                                src={record.product.imageUrl}
                                alt={record.product.nameAr}
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
                    </Col>
                    <Col flex="auto" style={{ paddingLeft: 12, paddingRight: 12 }}>
                        <Text strong style={{ fontSize: 16 }}>{record.product.nameAr}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            <MoneyDisplay amount={record.computedUnitPrice} />
                            {' / '}
                            {record.unitSold === 'sub' ? record.product.subUnit : record.product.baseUnit}
                        </Text>
                    </Col>
                    <Col>
                        <Button danger type="text" icon={<DeleteOutlined />} onClick={() => onRemoveItem(record.id)} />
                    </Col>
                </Row>
                <div style={{ background: '#f5f5f5', padding: 8, borderRadius: 8 }}>
                    <Row align="middle" justify="space-between">
                        <Col>
                            <Space size="small">
                                <Button
                                    size="large"
                                    onClick={() => onUpdateQuantity(record.id, Math.max(1, record.quantity - 1))}
                                >
                                    -
                                </Button>
                                <InputNumber
                                    min={1}
                                    size="large"
                                    value={record.quantity}
                                    onChange={(val) => onUpdateQuantity(record.id, val || 1)}
                                    style={{ width: 60, textAlign: 'center' }}
                                    controls={false}
                                />
                                <Button
                                    size="large"
                                    onClick={() => onUpdateQuantity(record.id, record.quantity + 1)}
                                >
                                    +
                                </Button>
                            </Space>
                        </Col>
                        <Col>
                            <Text strong style={{ fontSize: 16 }}>
                                <MoneyDisplay amount={record.computedSubtotal} />
                            </Text>
                        </Col>
                    </Row>
                </div>
            </Card>
        );
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', paddingBottom: onGoToCheckout ? 140 : 0 }}>
            <ResponsiveDataView
                data={items}
                tableColumns={columns}
                rowKey="id"
                renderCard={renderMobileCard}
                pagination={false}
                tableProps={{
                    scroll: { x: 'max-content', y: 300 }
                }}
            />

            <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
                <Row justify="space-between" style={{ marginBottom: 8 }}>
                    <Text>{ar.pos.subtotal}:</Text>
                    <MoneyDisplay amount={invoiceSubtotal} />
                </Row>
                <Row justify="space-between" style={{ marginBottom: 8, alignItems: 'center' }}>
                    <Space>
                        <Text>{ar.pos.invoiceDiscount}:</Text>
                        <Select
                            size="small"
                            value={invoiceDiscount?.type || 'amount'}
                            onChange={(val) => {
                                const currentVal = invoiceDiscount?.value || 0;
                                onUpdateInvoiceDiscount({ type: val as 'amount' | 'percentage', value: currentVal });
                            }}
                            options={[
                                { value: 'amount', label: 'EGP' },
                                { value: 'percentage', label: '%' },
                            ]}
                        />
                        <InputNumber
                            size="small"
                            min={0}
                            value={invoiceDiscount?.type === 'percentage' ? (invoiceDiscount.value / 100) : (invoiceDiscount?.value ? invoiceDiscount.value / 100 : 0)}
                            onChange={(val) => {
                                if (!val) {
                                    onUpdateInvoiceDiscount(undefined);
                                    return;
                                }
                                const type = invoiceDiscount?.type || 'amount';
                                const dbValue = type === 'percentage' ? val * 100 : val * 100;
                                onUpdateInvoiceDiscount({ type, value: Math.round(dbValue) });
                            }}
                        />
                    </Space>
                    <Text type="danger">
                        - <MoneyDisplay amount={invoiceSubtotal - total} />
                    </Text>
                </Row>
                <Row justify="space-between">
                    <Text strong style={{ fontSize: 20 }}>{ar.pos.total}:</Text>
                    <h2 style={{ margin: 0, color: '#1677ff' }}><MoneyDisplay amount={total} /></h2>
                </Row>
            </div>

            {onGoToCheckout && items.length > 0 && (
                <StickySubmitBar>
                    <Button type="primary" size="large" block onClick={onGoToCheckout}>
                        الانتقال للدفع
                    </Button>
                </StickySubmitBar>
            )}
        </div>
    );
}
