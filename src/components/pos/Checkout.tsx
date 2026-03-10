'use client';

import { useState } from 'react';
import { Card, InputNumber, Button, Space, Typography, Select, App, Grid } from 'antd';
import ar from '@/i18n/ar';
import MoneyDisplay from '../common/MoneyDisplay';
import type { PaymentMode } from '@/lib/types';
import { useQuery } from '@tanstack/react-query';
import StickySubmitBar from '../common/StickySubmitBar';

const { Text } = Typography;
const { useBreakpoint } = Grid;

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
    const { message } = App.useApp();
    const screens = useBreakpoint();
    const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash');
    const [paidAmount, setPaidAmount] = useState<number>(0);
    const [customerId, setCustomerId] = useState<string | null>(null);

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

        setPaymentMode('cash');
        setPaidAmount(0);
        setCustomerId(null);
    };

    const checkoutContent = (
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
            <div>
                <Text strong style={{ display: 'block', marginBottom: 8 }}>{ar.pos.paymentMode}</Text>
                <div style={{ display: 'flex', flexDirection: screens.md !== false ? 'row' : 'column', gap: 8 }}>
                    <Button
                        size="large"
                        type={paymentMode === 'cash' ? 'primary' : 'default'}
                        onClick={() => { setPaymentMode('cash'); setPaidAmount(0); }}
                        style={{ flex: 1 }}
                    >
                        {ar.pos.cash}
                    </Button>
                    <Button
                        size="large"
                        type={paymentMode === 'credit' ? 'primary' : 'default'}
                        onClick={() => { setPaymentMode('credit'); setPaidAmount(0); }}
                        style={{ flex: 1 }}
                    >
                        {ar.pos.credit}
                    </Button>
                    <Button
                        size="large"
                        type={paymentMode === 'partial' ? 'primary' : 'default'}
                        onClick={() => { setPaymentMode('partial'); setPaidAmount(total); }}
                        style={{ flex: 1 }}
                    >
                        {ar.pos.partial}
                    </Button>
                </div>
            </div>

            {(paymentMode === 'credit' || paymentMode === 'partial') && (
                <div>
                    <Text style={{ display: 'block', marginBottom: 8 }}>{ar.nav.customers}</Text>
                    <Select
                        showSearch
                        size="large"
                        placeholder="اختر عميل"
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
                        size="large"
                        style={{ width: '100%' }}
                        value={paidAmount / 100}
                        onChange={(val) => setPaidAmount((val || 0) * 100)}
                        min={0}
                        max={total / 100}
                        inputMode="decimal"
                    />
                </div>
            )}

            {paymentMode === 'cash' && (
                <div>
                    <Text style={{ display: 'block', marginBottom: 8 }}>المبلغ المدفوع (لحساب الباقي)</Text>
                    <InputNumber
                        size="large"
                        style={{ width: '100%' }}
                        value={paidAmount / 100}
                        onChange={(val) => setPaidAmount((val || 0) * 100)}
                        min={0}
                        inputMode="decimal"
                    />
                    {paidAmount > total && (
                        <div style={{ marginTop: 8 }}>
                            <Text type="secondary">الباقي للعميل: </Text>
                            <Text strong className="money-positive"><MoneyDisplay amount={paidAmount - total} /></Text>
                        </div>
                    )}
                </div>
            )}
        </Space>
    );

    const completeBtn = (
        <Button
            type="primary"
            size="large"
            block
            onClick={handleComplete}
            loading={isSubmitting}
            disabled={total === 0}
            style={{ height: screens.md !== false ? undefined : 56 }}
        >
            {ar.pos.completeSale}
        </Button>
    );

    if (screens.md === false) {
        return (
            <div style={{ padding: 16, paddingBottom: 100 }}>
                {checkoutContent}
                <StickySubmitBar>
                    {completeBtn}
                </StickySubmitBar>
            </div>
        );
    }

    return (
        <Card title={ar.pos.checkout} variant="borderless">
            {checkoutContent}
            <div style={{ marginTop: 24 }}>
                {completeBtn}
            </div>
        </Card>
    );
}
