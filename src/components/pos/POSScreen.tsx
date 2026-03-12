'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button, Col, Row, App, Grid, Segmented, Badge, Flex, Typography, Tag } from 'antd';
import { RollbackOutlined, ShoppingCartOutlined, SearchOutlined, CreditCardOutlined } from '@ant-design/icons';
import ProductSearch from './ProductSearch';
import Cart from './Cart';
import Checkout from './Checkout';
import RefundDialog from './RefundDialog';
import type {
    CartItem,
    DiscountObj,
    PaymentMode,
    ProductSearchResult,
    UnitSold,
} from '@/lib/types';
import { calcSubtotal } from '@/lib/utils/money';
import ar from '@/i18n/ar';

const { useBreakpoint } = Grid;
const { Text } = Typography;

type ActiveTab = 'search' | 'cart' | 'checkout';

export default function POSScreen() {
    const { message } = App.useApp();
    const screens = useBreakpoint();
    const [mounted, setMounted] = useState(false);

    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [invoiceDiscount, setInvoiceDiscount] = useState<DiscountObj | undefined>();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<ActiveTab>('search');

    useEffect(() => {
        setMounted(true);
    }, []);

    // Memoized to avoid recalculating on every render
    const isMobile = useMemo(
        () => mounted && (screens.xs || (screens.sm && !screens.md)),
        [mounted, screens.xs, screens.sm, screens.md]
    );

    // Stable reference — used inside other callbacks
    const calculateItemPriceAndSubtotal = useCallback(
        (
            product: ProductSearchResult,
            quantity: number,
            unitSold: UnitSold,
            discount?: DiscountObj
        ) => {
            let unitPrice = product.sellingPrice;

            if (unitSold === 'sub' && product.subUnitConversionFactor) {
                unitPrice = Math.round(product.sellingPrice / product.subUnitConversionFactor);
            }

            return {
                unitPrice,
                subtotal: calcSubtotal(unitPrice, quantity, discount),
            };
        },
        []
    );

    const handleAddToCart = useCallback(
        ({
            product,
            quantity,
            unitSold,
        }: {
            product: ProductSearchResult;
            quantity: number;
            unitSold: UnitSold;
        }) => {
            setCartItems((previousItems) => {
                const lineId = `${product._id}-${unitSold}`;
                const existingItem = previousItems.find((item) => item.id === lineId);
                const existingQuantity = existingItem?.quantity ?? 0;
                const requestedQuantity = existingQuantity + quantity;
                const requestedBaseUnits =
                    unitSold === 'sub'
                        ? Math.ceil(requestedQuantity / (product.subUnitConversionFactor || 1))
                        : requestedQuantity;

                if (requestedBaseUnits > product.floorStock) {
                    message.warning(
                        `${ar.pos.insufficientStock}. المتاح حالياً: ${product.floorStock} ${product.baseUnit}`
                    );
                    return previousItems;
                }

                if (isMobile) {
                    // Auto-navigate to cart so user sees what was added
                    message.success(`تم إضافة ${product.nameAr} للسلة`);
                    setActiveTab('cart');
                }

                if (!existingItem) {
                    const { unitPrice, subtotal } = calculateItemPriceAndSubtotal(
                        product,
                        quantity,
                        unitSold
                    );

                    return [
                        ...previousItems,
                        {
                            id: lineId,
                            product,
                            quantity,
                            unitSold,
                            computedUnitPrice: unitPrice,
                            computedSubtotal: subtotal,
                        },
                    ];
                }

                return previousItems.map((item) => {
                    if (item.id !== lineId) return item;

                    const { unitPrice, subtotal } = calculateItemPriceAndSubtotal(
                        product,
                        requestedQuantity,
                        unitSold,
                        item.discount
                    );

                    return {
                        ...item,
                        quantity: requestedQuantity,
                        computedUnitPrice: unitPrice,
                        computedSubtotal: subtotal,
                    };
                });
            });
        },
        [isMobile, message, calculateItemPriceAndSubtotal]
    );

    const handleUpdateQuantity = useCallback(
        (id: string, quantity: number) => {
            setCartItems((previousItems) =>
                previousItems.map((item) => {
                    if (item.id !== id) return item;

                    const { unitPrice, subtotal } = calculateItemPriceAndSubtotal(
                        item.product,
                        quantity,
                        item.unitSold,
                        item.discount
                    );

                    return { ...item, quantity, computedUnitPrice: unitPrice, computedSubtotal: subtotal };
                })
            );
        },
        [calculateItemPriceAndSubtotal]
    );

    const handleUpdateDiscount = useCallback(
        (id: string, discount?: DiscountObj) => {
            setCartItems((previousItems) =>
                previousItems.map((item) => {
                    if (item.id !== id) return item;

                    const { unitPrice, subtotal } = calculateItemPriceAndSubtotal(
                        item.product,
                        item.quantity,
                        item.unitSold,
                        discount
                    );

                    return { ...item, discount, computedUnitPrice: unitPrice, computedSubtotal: subtotal };
                })
            );
        },
        [calculateItemPriceAndSubtotal]
    );

    const handleRemoveItem = useCallback((id: string) => {
        setCartItems((previousItems) => previousItems.filter((item) => item.id !== id));
    }, []);

    const handleCheckout = useCallback(
        async (paymentMode: PaymentMode, paidAmount: number, customerId: string | null) => {
            if (cartItems.length === 0) {
                message.error(ar.pos.emptyCart);
                return;
            }

            setIsSubmitting(true);

            try {
                const response = await fetch('/api/pos/checkout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        items: cartItems.map((item) => ({
                            productId: item.product._id,
                            quantity: item.quantity,
                            unitSold: item.unitSold,
                            discount: item.discount,
                        })),
                        invoiceDiscount,
                        paymentMode,
                        paidAmount,
                        customerId,
                    }),
                });

                const payload = await response.json();

                if (!response.ok) {
                    throw new Error(payload.error?.message || 'تعذر إتمام عملية البيع');
                }

                message.success(ar.messages.saleCompleted);
                setCartItems([]);
                setInvoiceDiscount(undefined);
                setActiveTab('search');
            } catch (error) {
                const messageText =
                    error instanceof Error ? error.message : 'تعذر إتمام عملية البيع';
                message.error(messageText);
            } finally {
                setIsSubmitting(false);
            }
        },
        [cartItems, invoiceDiscount, message]
    );

    // --- Derived values ---

    const invoiceSubtotal = useMemo(
        () => cartItems.reduce((sum, item) => sum + item.computedSubtotal, 0),
        [cartItems]
    );

    const total = useMemo(() => {
        if (!invoiceDiscount) return invoiceSubtotal;
        if (invoiceDiscount.type === 'amount')
            return Math.max(0, invoiceSubtotal - invoiceDiscount.value);
        if (invoiceDiscount.type === 'percentage')
            return Math.max(
                0,
                invoiceSubtotal - Math.round((invoiceSubtotal * invoiceDiscount.value) / 10000)
            );
        return invoiceSubtotal;
    }, [invoiceSubtotal, invoiceDiscount]);

    const cartCount = useMemo(
        () => cartItems.reduce((acc, item) => acc + item.quantity, 0),
        [cartItems]
    );

    if (!mounted) return null;

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: isMobile ? 0 : 16,
                height: isMobile ? 'calc(100dvh - 64px)' : 'calc(100vh - 120px)',
            }}
        >
            {!isMobile ? (
                // --- DESKTOP LAYOUT ---
                <>
                    <Flex justify="space-between" align="center" style={{ paddingBottom: 16 }}>
                        <Flex gap={8} align="center">
                            <Text strong style={{ fontSize: 18 }}>
                                نقطة البيع
                            </Text>
                            {cartCount > 0 && (
                                <Tag color="blue" style={{ margin: 0 }}>
                                    {cartCount} صنف في السلة
                                </Tag>
                            )}
                        </Flex>
                        <Button
                            danger
                            icon={<RollbackOutlined />}
                            onClick={() => setIsRefundDialogOpen(true)}
                        >
                            إرجاع أو إلغاء فاتورة
                        </Button>
                    </Flex>

                    <Row gutter={[16, 16]} style={{ flex: 1, minHeight: 0 }}>
                        <Col xs={24} lg={16}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
                                <ProductSearch onAddToCart={handleAddToCart} />
                                <div style={{ flex: 1, minHeight: 0 }}>
                                    <Cart
                                        items={cartItems}
                                        onUpdateQuantity={handleUpdateQuantity}
                                        onUpdateDiscount={handleUpdateDiscount}
                                        onRemoveItem={handleRemoveItem}
                                        invoiceDiscount={invoiceDiscount}
                                        onUpdateInvoiceDiscount={setInvoiceDiscount}
                                        onGoToCheckout={() => {}}
                                    />
                                </div>
                            </div>
                        </Col>

                        <Col xs={24} lg={8} style={{ height: '100%', overflowY: 'auto' }}>
                            <Checkout
                                total={total}
                                isSubmitting={isSubmitting}
                                onCheckout={handleCheckout}
                            />
                        </Col>
                    </Row>
                </>
            ) : (
                // --- MOBILE LAYOUT ---
                <>
                    <div
                        style={{
                            position: 'sticky',
                            top: 0,
                            zIndex: 10,
                            background: '#fff',
                            padding: '12px 16px',
                            borderBottom: '1px solid #f0f0f0',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                        }}
                    >
                        <Flex justify="space-between" align="center" style={{ marginBottom: 12 }}>
                            <Flex gap={8} align="center">
                                <Text strong style={{ fontSize: 16 }}>
                                    نقطة البيع
                                </Text>
                                {/* Live running total in header — visible on all tabs */}
                                {cartCount > 0 && (
                                    <Tag color="green" style={{ margin: 0 }}>
                                        {total.toLocaleString('ar-EG')} ر.س
                                    </Tag>
                                )}
                            </Flex>
                            <Button
                                danger
                                type="dashed"
                                size="small"
                                icon={<RollbackOutlined />}
                                onClick={() => setIsRefundDialogOpen(true)}
                            >
                                إرجاع فاتورة
                            </Button>
                        </Flex>

                        <Segmented
                            block
                            size="large"
                            options={[
                                {
                                    label: (
                                        <div style={{ padding: '4px 0' }}>
                                            <SearchOutlined /> البحث
                                        </div>
                                    ),
                                    value: 'search',
                                },
                                {
                                    label: (
                                        <Badge count={cartCount} offset={[10, 0]} size="small">
                                            <div style={{ padding: '4px 0' }}>
                                                <ShoppingCartOutlined /> السلة
                                            </div>
                                        </Badge>
                                    ),
                                    value: 'cart',
                                },
                                {
                                    label: (
                                        <div style={{ padding: '4px 0' }}>
                                            <CreditCardOutlined /> الدفع
                                        </div>
                                    ),
                                    value: 'checkout',
                                    disabled: cartItems.length === 0,
                                },
                            ]}
                            value={activeTab}
                            onChange={(val) => setActiveTab(val as ActiveTab)}
                        />
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', background: '#f5f5f5' }}>
                        {activeTab === 'search' && (
                            <div style={{ padding: 12 }}>
                                <ProductSearch onAddToCart={handleAddToCart} />
                            </div>
                        )}

                        {activeTab === 'cart' && (
                            <div style={{ padding: 12 }}>
                                <Cart
                                    items={cartItems}
                                    onUpdateQuantity={handleUpdateQuantity}
                                    onUpdateDiscount={handleUpdateDiscount}
                                    onRemoveItem={handleRemoveItem}
                                    invoiceDiscount={invoiceDiscount}
                                    onUpdateInvoiceDiscount={setInvoiceDiscount}
                                    onGoToCheckout={() => setActiveTab('checkout')}
                                />
                            </div>
                        )}

                        {activeTab === 'checkout' && (
                            <div style={{ padding: 0 }}>
                                <Checkout
                                    total={total}
                                    isSubmitting={isSubmitting}
                                    onCheckout={handleCheckout}
                                />
                            </div>
                        )}
                    </div>
                </>
            )}

            <RefundDialog
                open={isRefundDialogOpen}
                onClose={() => setIsRefundDialogOpen(false)}
            />
        </div>
    );
}
