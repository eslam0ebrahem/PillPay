'use client';

import { Table, InputNumber, Button, Space, Select, Typography, Row } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import MoneyDisplay from '../common/MoneyDisplay';
import ar from '@/i18n/ar';
import type { CartItem, DiscountObj } from '@/lib/types';
import { calcSubtotal } from '@/lib/utils/money';

const { Text } = Typography;

interface CartProps {
    items: CartItem[];
    onUpdateQuantity: (id: string, qty: number) => void;
    onUpdateDiscount: (id: string, discount?: DiscountObj) => void;
    onRemoveItem: (id: string) => void;
    invoiceDiscount?: DiscountObj;
    onUpdateInvoiceDiscount: (discount?: DiscountObj) => void;
}

export default function Cart({
    items,
    onUpdateQuantity,
    onUpdateDiscount,
    onRemoveItem,
    invoiceDiscount,
    onUpdateInvoiceDiscount,
}: CartProps) {
    // Derive subtotal and totals on the fly
    const invoiceSubtotal = items.reduce((sum, item) => sum + item.computedSubtotal, 0);

    // Recalculate total with invoice discount
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
            dataIndex: ['product', 'nameAr'],
            key: 'name',
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
                            // Convert value to DB format
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

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Table
                dataSource={items}
                columns={columns}
                rowKey="id"
                pagination={false}
                scroll={{ y: 300 }}
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
        </div>
    );
}
