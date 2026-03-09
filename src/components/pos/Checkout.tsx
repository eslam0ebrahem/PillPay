'use client';

import { useState } from 'react';
import { Card, Radio, InputNumber, Button, Space, Typography, Select, message } from 'antd';
import ar from '@/i18n/ar';
import MoneyDisplay from '../common/MoneyDisplay';
import type { PaymentMode } from '@/lib/types';
import { useQuery } from '@tanstack/react-query';

const { Text, Title } = Typography;

interface CheckoutProps {
    total: number; // in piasters
    onCheckout: (
        paymentMode: PaymentMode,
        paidAmount: number,
        customerId: string | null
    ) => Promise<void>;
    isSubmitting: boolean;
}

export default function Checkout({ total, onCheckout, isSubmitting }: CheckoutProps) {
    const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash');
    const [paidAmount, setPaidAmount] = useState<number>(0);
    const [customerId, setCustomerId] = useState<string | null>(null);

    // Simple query for customers (in a real app this would be a debounced search similar to ProductSearch)
    // For the sake of this phase, assuming an endpoint /api/customers exists later, but we mock it or fetch it.
    // We'll leave it as a standard fetch if implemented, otherwise empty options.
    const { data: customers, isLoading } = useQuery({
        queryKey: ['posCustomers'],
        queryFn: async () => {
            const res = await fetch('/api/customers');
            if (!res.ok) throw new Error('Failed to fetch customers');
            const { data } = await res.json();
            return data as { _id: string; name: string }[];
        },
    });

    const handleComplete = async () => {
        if ((paymentMode === 'credit' || paymentMode === 'partial') && !customerId) {
            message.error(ar.pos.creditRequiresCustomer);
            return;
        }

        let finalPaid = total;
        if (paymentMode === 'credit') finalPaid = 0;
        if (paymentMode === 'partial') finalPaid = paidAmount;

        await onCheckout(paymentMode, finalPaid, customerId);

        // Reset state after success (onCheckout throws and is handled in POSScreen if error)
        setPaymentMode('cash');
        setPaidAmount(0);
        setCustomerId(null);
    };

    return (
        <Card title={ar.pos.checkout} bordered={false}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <div>
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>{ar.pos.paymentMode}</Text>
                    <Radio.Group
                        value={paymentMode}
                        onChange={(e) => {
                            setPaymentMode(e.target.value);
                            if (e.target.value === 'partial') {
                                setPaidAmount(total); // Default paid amount to total, user can reduce it
                            }
                        }}
                        optionType="button"
                        buttonStyle="solid"
                        style={{ width: '100%', display: 'flex' }}
                    >
                        <Radio.Button value="cash" style={{ flex: 1, textAlign: 'center' }}>{ar.pos.cash}</Radio.Button>
                        <Radio.Button value="credit" style={{ flex: 1, textAlign: 'center' }}>{ar.pos.credit}</Radio.Button>
                        <Radio.Button value="partial" style={{ flex: 1, textAlign: 'center' }}>{ar.pos.partial}</Radio.Button>
                    </Radio.Group>
                </div>

                {(paymentMode === 'credit' || paymentMode === 'partial') && (
                    <div>
                        <Text style={{ display: 'block', marginBottom: 8 }}>{ar.nav.customers}</Text>
                        <Select
                            showSearch
                            placeholder="اختر عميل" // TODO: i18n
                            value={customerId}
                            onChange={setCustomerId}
                            style={{ width: '100%' }}
                            loading={isLoading}
                            options={customers?.map(c => ({ value: c._id, label: c.name })) || []}
                            filterOption={(input, option) =>
                                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                        />
                    </div>
                )}

                {paymentMode === 'partial' && (
                    <div>
                        <Text style={{ display: 'block', marginBottom: 8 }}>{ar.pos.paidAmount}</Text>
                        <InputNumber
                            style={{ width: '100%' }}
                            value={paidAmount / 100}
                            onChange={(val) => setPaidAmount((val || 0) * 100)}
                            min={0}
                            max={total / 100}
                        />
                    </div>
                )}

                {/* Change calculation for Cash mode (informational) */}
                {paymentMode === 'cash' && (
                    <div>
                        <Text style={{ display: 'block', marginBottom: 8 }}>المبلغ المدفوع (لحساب الباقي)</Text>
                        <InputNumber
                            style={{ width: '100%' }}
                            value={paidAmount / 100}
                            onChange={(val) => setPaidAmount((val || 0) * 100)}
                            min={0}
                        />
                        {paidAmount > total && (
                            <div style={{ marginTop: 8 }}>
                                <Text type="secondary">الباقي للعميل: </Text>
                                <Text strong type="success"><MoneyDisplay amount={paidAmount - total} /></Text>
                            </div>
                        )}
                    </div>
                )}

                <Button
                    type="primary"
                    size="large"
                    block
                    onClick={handleComplete}
                    loading={isSubmitting}
                    disabled={total === 0}
                >
                    {ar.pos.completeSale}
                </Button>
            </Space>
        </Card>
    );
}
