'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, Flex, Grid, Segmented, Space, App } from 'antd';
import { UndoOutlined } from '@ant-design/icons';
import type { ProductSearchResult } from '@/lib/types';
import MobileFormWrapper from '../common/MobileFormWrapper';
import InvoiceRefundTab from './refund/InvoiceRefundTab';
import StandaloneRefundTab from './refund/StandaloneRefundTab';
import {
    createStandaloneItem,
    type CustomerOption,
    type InvoiceLookupItem,
    type InvoiceLookupResult,
    type StandaloneRefundItem,
} from './refund/refundTypes';

const { useBreakpoint } = Grid;

interface RefundDialogProps {
    open: boolean;
    onClose: () => void;
}

export default function RefundDialog({ open, onClose }: RefundDialogProps) {
    const { message } = App.useApp();
    const screens = useBreakpoint();
    const [mounted, setMounted] = useState(false);

    const [mode, setMode] = useState<'invoice' | 'standalone'>('invoice');
    const [invoiceReference, setInvoiceReference] = useState('');
    const [invoiceData, setInvoiceData] = useState<InvoiceLookupResult | null>(null);
    const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});
    const [standaloneItems, setStandaloneItems] = useState<StandaloneRefundItem[]>([
        createStandaloneItem(),
    ]);
    const [productOptions, setProductOptions] = useState<ProductSearchResult[]>([]);
    const [customerOptions, setCustomerOptions] = useState<CustomerOption[]>([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>();

    const [searchingInvoice, setSearchingInvoice] = useState(false);
    const [submittingRefund, setSubmittingRefund] = useState(false);
    const [cancellingSale, setCancellingSale] = useState(false);
    const [searchingProducts, setSearchingProducts] = useState(false);

    const isMobile = screens.xs || (screens.sm && !screens.md);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!open) return;
        const loadCustomers = async () => {
            try {
                const res = await fetch('/api/customers?page=1&limit=100');
                if (!res.ok) return;
                const payload = await res.json();
                setCustomerOptions(payload.data ?? []);
            } catch {
                setCustomerOptions([]);
            }
        };
        void loadCustomers();
    }, [open]);

    const resetState = () => {
        setMode('invoice');
        setInvoiceReference('');
        setInvoiceData(null);
        setSelectedQuantities({});
        setStandaloneItems([createStandaloneItem()]);
        setProductOptions([]);
        setSelectedCustomerId(undefined);
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const handleInvoiceLookup = async () => {
        if (!invoiceReference.trim()) {
            message.error('أدخل رقم الفاتورة أو معرفها');
            return;
        }
        setSearchingInvoice(true);
        try {
            const res = await fetch(
                `/api/pos/cancel/${encodeURIComponent(invoiceReference.trim())}`
            );
            const payload = await res.json();
            if (!res.ok) throw new Error(payload.error?.message || 'تعذر العثور على الفاتورة');
            setInvoiceData(payload.data);
            setSelectedQuantities(
                Object.fromEntries(
                    (payload.data.items as InvoiceLookupItem[]).map((item) => [item.saleItemId, 0])
                )
            );
        } catch (error) {
            message.error(error instanceof Error ? error.message : 'تعذر العثور على الفاتورة');
            setInvoiceData(null);
            setSelectedQuantities({});
        } finally {
            setSearchingInvoice(false);
        }
    };

    const handleProductSearch = async (query: string) => {
        if (query.trim().length < 2) {
            setProductOptions([]);
            return;
        }
        setSearchingProducts(true);
        try {
            const res = await fetch('/api/pos/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, type: 'text' }),
            });
            if (!res.ok) throw new Error();
            setProductOptions(await res.json());
        } catch {
            setProductOptions([]);
        } finally {
            setSearchingProducts(false);
        }
    };

    const linkedRefundTotal = useMemo(() => {
        if (!invoiceData) return 0;
        return invoiceData.items.reduce((sum, item) => {
            const quantity = selectedQuantities[item.saleItemId] || 0;
            return quantity > 0
                ? sum + Math.round((item.subtotal / item.quantity) * quantity)
                : sum;
        }, 0);
    }, [invoiceData, selectedQuantities]);

    const standaloneRefundTotal = useMemo(
        () =>
            standaloneItems.reduce(
                (sum, item) => sum + Math.round(item.quantity * item.unitPrice * 100),
                0
            ),
        [standaloneItems]
    );

    const submitRefund = async () => {
        setSubmittingRefund(true);
        try {
            const payload =
                mode === 'invoice'
                    ? {
                          originalInvoiceId: invoiceData?._id,
                          items:
                              invoiceData?.items
                                  .filter((item) => (selectedQuantities[item.saleItemId] || 0) > 0)
                                  .map((item) => ({
                                      productId: item.productId,
                                      quantity: selectedQuantities[item.saleItemId],
                                  })) ?? [],
                      }
                    : {
                          customerId: selectedCustomerId,
                          items: standaloneItems.map((item) => ({
                              productId: item.productId,
                              quantity: item.quantity,
                              unitPrice: Math.round(item.unitPrice * 100),
                          })),
                      };

            if (payload.items.length === 0)
                throw new Error('حدد صنفاً واحداً على الأقل لإتمام المرتجع');
            if (
                mode === 'standalone' &&
                payload.items.some((item) => !item.productId || item.quantity <= 0)
            ) {
                throw new Error('أكمل بيانات الأصناف اليدوية قبل الحفظ');
            }

            const res = await fetch('/api/refunds', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error?.message || 'تعذر إنشاء المرتجع');
            message.success('تم حفظ المرتجع بنجاح');
            handleClose();
        } catch (error) {
            message.error(error instanceof Error ? error.message : 'تعذر إنشاء المرتجع');
        } finally {
            setSubmittingRefund(false);
        }
    };

    const cancelSale = async () => {
        if (!invoiceData) return;
        setCancellingSale(true);
        try {
            const res = await fetch(`/api/pos/cancel/${encodeURIComponent(invoiceData._id)}`, {
                method: 'POST',
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error?.message || 'تعذر إلغاء الفاتورة');
            message.success('تم إلغاء الفاتورة واسترجاع المخزون');
            handleClose();
        } catch (error) {
            message.error(error instanceof Error ? error.message : 'تعذر إلغاء الفاتورة');
        } finally {
            setCancellingSale(false);
        }
    };

    if (!mounted) return null;

    return (
        <MobileFormWrapper
            title="إرجاع وإلغاء المبيعات"
            open={open}
            onClose={handleClose}
            width={960}
            footer={
                <Flex gap={12} align="center">
                    <Button
                        key="close"
                        block
                        size="large"
                        onClick={handleClose}
                        style={{ flex: 1 }}
                    >
                        إغلاق
                    </Button>
                    <Button
                        key="submit"
                        type="primary"
                        icon={<UndoOutlined />}
                        loading={submittingRefund}
                        onClick={() => void submitRefund()}
                        block
                        size="large"
                        style={{ flex: 1 }}
                        disabled={
                            (mode === 'invoice' && linkedRefundTotal === 0 && !invoiceData) ||
                            (mode === 'standalone' && standaloneRefundTotal === 0)
                        }
                    >
                        حفظ المرتجع
                    </Button>
                </Flex>
            }
        >
            <Space orientation="vertical" size="large" style={{ width: '100%', paddingBottom: 24 }}>
                <Segmented
                    block
                    size={isMobile ? 'large' : 'middle'}
                    value={mode}
                    options={[
                        { label: 'مرتجع فاتورة', value: 'invoice' },
                        { label: 'مرتجع يدوي', value: 'standalone' },
                    ]}
                    onChange={(value) => setMode(value as 'invoice' | 'standalone')}
                />

                {mode === 'invoice' ? (
                    <InvoiceRefundTab
                        invoiceReference={invoiceReference}
                        setInvoiceReference={setInvoiceReference}
                        searchingInvoice={searchingInvoice}
                        handleInvoiceLookup={() => void handleInvoiceLookup()}
                        invoiceData={invoiceData}
                        selectedQuantities={selectedQuantities}
                        setSelectedQuantities={setSelectedQuantities}
                        cancellingSale={cancellingSale}
                        cancelSale={() => void cancelSale()}
                        linkedRefundTotal={linkedRefundTotal}
                        isMobile={isMobile}
                    />
                ) : (
                    <StandaloneRefundTab
                        standaloneItems={standaloneItems}
                        setStandaloneItems={setStandaloneItems}
                        customerOptions={customerOptions}
                        selectedCustomerId={selectedCustomerId}
                        setSelectedCustomerId={setSelectedCustomerId}
                        productOptions={productOptions}
                        searchingProducts={searchingProducts}
                        handleProductSearch={(query) => void handleProductSearch(query)}
                        standaloneRefundTotal={standaloneRefundTotal}
                        isMobile={isMobile}
                    />
                )}
            </Space>
        </MobileFormWrapper>
    );
}
