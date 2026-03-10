'use client';

import { useState } from 'react';
import { Button, Col, Row, App, Grid, Segmented, Badge } from 'antd';
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

export default function POSScreen() {
    const { message } = App.useApp();
    const screens = useBreakpoint();
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [invoiceDiscount, setInvoiceDiscount] = useState<DiscountObj | undefined>();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'search' | 'cart' | 'checkout'>('search');

    const calculateItemPriceAndSubtotal = (
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
    };

    const handleAddToCart = ({
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
                if (item.id !== lineId) {
                    return item;
                }

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
    };

    const handleUpdateQuantity = (id: string, quantity: number) => {
        setCartItems((previousItems) =>
            previousItems.map((item) => {
                if (item.id !== id) {
                    return item;
                }

                const { unitPrice, subtotal } = calculateItemPriceAndSubtotal(
                    item.product,
                    quantity,
                    item.unitSold,
                    item.discount
                );

                return {
                    ...item,
                    quantity,
                    computedUnitPrice: unitPrice,
                    computedSubtotal: subtotal,
                };
            })
        );
    };

    const handleUpdateDiscount = (id: string, discount?: DiscountObj) => {
        setCartItems((previousItems) =>
            previousItems.map((item) => {
                if (item.id !== id) {
                    return item;
                }

                const { unitPrice, subtotal } = calculateItemPriceAndSubtotal(
                    item.product,
                    item.quantity,
                    item.unitSold,
                    discount
                );

                return {
                    ...item,
                    discount,
                    computedUnitPrice: unitPrice,
                    computedSubtotal: subtotal,
                };
            })
        );
    };

    const handleRemoveItem = (id: string) => {
        setCartItems((previousItems) => previousItems.filter((item) => item.id !== id));
    };

    const handleCheckout = async (
        paymentMode: PaymentMode,
        paidAmount: number,
        customerId: string | null
    ) => {
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
    };

    const invoiceSubtotal = cartItems.reduce(
        (sum, item) => sum + item.computedSubtotal,
        0
    );

    const total =
        invoiceDiscount?.type === 'amount'
            ? Math.max(0, invoiceSubtotal - invoiceDiscount.value)
            : invoiceDiscount?.type === 'percentage'
                ? Math.max(
                    0,
                    invoiceSubtotal -
                    Math.round((invoiceSubtotal * invoiceDiscount.value) / 10000)
                )
                : invoiceSubtotal;

    const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: screens.md !== false ? 16 : 0, minHeight: 'calc(100vh - 120px)' }}>
            {screens.md !== false ? (
                // DESKTOP LAYOUT
                <>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', paddingBottom: 16 }}>
                        <Button danger onClick={() => setIsRefundDialogOpen(true)}>
                            إرجاع أو إلغاء فاتورة
                        </Button>
                    </div>

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
                                        onGoToCheckout={() => { }} // not needed on desktop
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
                // MOBILE LAYOUT
                <>
                    <div style={{ padding: 12, borderBottom: '1px solid #d9d9d9', background: 'white' }}>
                        <Segmented
                            block
                            size="large"
                            options={[
                                { label: 'البحث', value: 'search' },
                                { label: <Badge count={cartCount} offset={[10, 0]}><span>السلة</span></Badge>, value: 'cart' },
                                { label: 'الدفع', value: 'checkout' },
                            ]}
                            value={activeTab}
                            onChange={(val) => setActiveTab(val as any)}
                        />
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto' }}>
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
