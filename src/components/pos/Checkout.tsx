'use client';

import { useState, useEffect } from 'react';
import { Card, InputNumber, Button, Typography, Select, App, Grid, Flex, Radio, Divider, Space } from 'antd';
import { DollarOutlined, UserOutlined } from '@ant-design/icons';
import ar from '@/i18n/ar';
import MoneyDisplay from '../common/MoneyDisplay';
import type { PaymentMode } from '@/lib/types';
import { useQuery } from '@tanstack/react-query';
import StickySubmitBar from '../common/StickySubmitBar';

const { Text, Title } = Typography;
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
    const [mounted, setMounted] = useState(false);
    
    const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash');
    const [paidAmount, setPaidAmount] = useState<number>(0);
    const [customerId, setCustomerId] = useState<string | null>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    const isMobile = screens.xs || (screens.sm && !screens.md);

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

    const handlePaymentModeChange = (mode: PaymentMode) => {
        setPaymentMode(mode);
        if (mode === 'partial') {
            setPaidAmount(total);
        } else {
            setPaidAmount(0);
        }
    };

    if (!mounted) return null; // Prevent hydration mismatch

    const checkoutContent = (
        <Flex vertical gap={24} style={{ width: '100%' }}>
            
            {/* Added Prominent Total Display for Mobile Context */}
            {isMobile && (
                <Card size="small" style={{ background: '#e6f4ff', borderColor: '#91caff', textAlign: 'center' }}>
                    <Text type="secondary" style={{ fontSize: 14 }}>المبلغ الإجمالي المطلوب</Text>
                    <Title level={2} style={{ margin: '4px 0 0 0', color: '#1677ff' }}>
                        <MoneyDisplay amount={total} />
                    </Title>
                </Card>
            )}

            <div>
                <Text strong style={{ display: 'block', marginBottom: 12, fontSize: 16 }}>{ar.pos.paymentMode}</Text>
                <Radio.Group
                    value={paymentMode}
                    onChange={(e) => handlePaymentModeChange(e.target.value)}
                    style={{ display: 'flex', width: '100%' }}
                    size="large"
                    buttonStyle="solid"
                >
                    <Radio.Button value="cash" style={{ flex: 1, textAlign: 'center' }}>
                        {ar.pos.cash}
                    </Radio.Button>
                    <Radio.Button value="credit" style={{ flex: 1, textAlign: 'center' }}>
                        {ar.pos.credit}
                    </Radio.Button>
                    <Radio.Button value="partial" style={{ flex: 1, textAlign: 'center' }}>
                        {ar.pos.partial}
                    </Radio.Button>
                </Radio.Group>
            </div>

            {(paymentMode === 'credit' || paymentMode === 'partial') && (
                <div style={{ background: '#fafafa', padding: 16, borderRadius: 8, border: '1px solid #f0f0f0' }}>
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>
                        <UserOutlined /> {ar.nav.customers} <Text type="danger">*</Text>
                    </Text>
                    <Select
                        showSearch
                        size="large"
                        placeholder="اختر العميل المعني بالآجل..."
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
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>{ar.pos.paidAmount} (نقداً)</Text>
                    <Space.Compact style={{ width: '100%' }}>
                        <InputNumber
                            size="large"
                            style={{ flex: 1, fontSize: 18 }}
                            value={paidAmount / 100}
                            onChange={(val) => setPaidAmount((val || 0) * 100)}
                            min={0}
                            max={total / 100}
                            inputMode="decimal"
                        />
                        <Button size="large" disabled style={{ background: '#f5f5f5', color: '#000', cursor: 'default' }}>
                            ج.م
                        </Button>
                    </Space.Compact>
                    <Flex justify="space-between" style={{ marginTop: 8, padding: '0 4px' }}>
                        <Text type="secondary">المتبقي آجل:</Text>
                        <Text strong type="danger"><MoneyDisplay amount={total - paidAmount} /></Text>
                    </Flex>
                </div>
            )}

            {paymentMode === 'cash' && (
                <div>
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>
                        المبلغ المدفوع من العميل (لحساب الباقي)
                    </Text>
                    <Space.Compact style={{ width: '100%' }}>
                        <InputNumber
                            size="large"
                            style={{ flex: 1, fontSize: 18 }}
                            value={paidAmount / 100}
                            onChange={(val) => setPaidAmount((val || 0) * 100)}
                            min={0}
                            inputMode="decimal"
                            placeholder="أدخل المبلغ لحساب الباقي..."
                        />
                        <Button size="large" disabled style={{ background: '#f5f5f5', color: '#000', cursor: 'default' }}>
                            ج.م
                        </Button>
                    </Space.Compact>
                    {paidAmount > total && (
                        <Card size="small" style={{ marginTop: 12, background: '#f6ffed', borderColor: '#b7eb8f' }}>
                            <Flex justify="space-between" align="center">
                                <Text style={{ fontSize: 16 }}>الباقي للعميل:</Text>
                                <Text strong style={{ fontSize: 20, color: '#389e0d' }}>
                                    <MoneyDisplay amount={paidAmount - total} />
                                </Text>
                            </Flex>
                        </Card>
                    )}
                </div>
            )}
        </Flex>
    );

    const completeBtn = (
        <Button
            type="primary"
            size="large"
            block
            onClick={handleComplete}
            loading={isSubmitting}
            disabled={total === 0}
            style={{ 
                height: isMobile ? 56 : 48, 
                fontSize: 18, 
                fontWeight: 'bold', 
                borderRadius: 8 
            }}
            icon={<DollarOutlined />}
        >
            {ar.pos.completeSale}
        </Button>
    );

    if (isMobile) {
        return (
            <div style={{ padding: 16, paddingBottom: 120 }}>
                {checkoutContent}
                <StickySubmitBar>
                    {completeBtn}
                </StickySubmitBar>
            </div>
        );
    }

    return (
        <Card title={ar.pos.checkout} variant="outlined" styles={{ header: { fontSize: 18 } }}>
            {/* Desktop prominent total display */}
            <Flex justify="space-between" align="center" style={{ marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid #f0f0f0' }}>
                <Text type="secondary" style={{ fontSize: 16 }}>الإجمالي المطلوب:</Text>
                <Title level={3} style={{ margin: 0, color: '#1677ff' }}>
                    <MoneyDisplay amount={total} />
                </Title>
            </Flex>

            {checkoutContent}
            
            <div style={{ marginTop: 32 }}>
                {completeBtn}
            </div>
        </Card>
    );
}