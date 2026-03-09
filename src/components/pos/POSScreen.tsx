'use client';

import { useState } from 'react';
import { Row, Col, message } from 'antd';
import ProductSearch from './ProductSearch';
import Cart from './Cart';
import Checkout from './Checkout';
import type { DiscountObj, PaymentMode, UnitSold, ProductSearchResult, CartItem } from '@/lib/types';
import { calcSubtotal } from '@/lib/utils/money';



export default function POSScreen() {
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [invoiceDiscount, setInvoiceDiscount] = useState<DiscountObj | undefined>(undefined);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const calculateItemPriceAndSubtotal = (
        product: ProductSearchResult,
        quantity: number,
        unitSold: UnitSold,
        discount?: DiscountObj
    ) => {
        let price = product.sellingPrice;
        if (unitSold === 'sub' && product.subUnitConversionFactor) {
            price = Math.round(product.sellingPrice / product.subUnitConversionFactor);
        }
        const subtotal = calcSubtotal(price, quantity, discount);
        return { price, subtotal };
    };

    const handleAddToCart = ({ product, quantity, unitSold }: { product: ProductSearchResult; quantity: number; unitSold: UnitSold }) => {
        setCartItems((prev) => {
            const existingId = `${product._id}-${unitSold}`;
            const existing = prev.find((i) => i.id === existingId);

            // Check max floor stock natively in UI (rough check, backend enforces strictly)
            const currentQty = existing ? existing.quantity : 0;
            const willNeedBaseUnits = unitSold === 'sub'
                ? Math.ceil((currentQty + quantity) / (product.subUnitConversionFactor || 1))
                : (currentQty + quantity);

            if (willNeedBaseUnits > product.floorStock) {
                message.warning(`عذراً، المخزون المتاح على الرف لا يكفي (المتاح: ${product.floorStock} ${product.baseUnit})`);
                return prev;
            }

            if (existing) {
                // Update existing item
                return prev.map((item) => {
                    if (item.id === existingId) {
                        const newQty = item.quantity + quantity;
                        const { price, subtotal } = calculateItemPriceAndSubtotal(product, newQty, unitSold, item.discount);
                        return {
                            ...item,
                            quantity: newQty,
                            computedUnitPrice: price,
                            computedSubtotal: subtotal,
                        };
                    }
                    return item;
                });
            }

            // Add new item
            const { price, subtotal } = calculateItemPriceAndSubtotal(product, quantity, unitSold);
            return [
                ...prev,
                {
                    id: existingId,
                    product,
                    quantity,
                    unitSold,
                    computedUnitPrice: price,
                    computedSubtotal: subtotal,
                },
            ];
        });
    };

    const handleUpdateQuantity = (id: string, qty: number) => {
        setCartItems((prev) =>
            prev.map((item) => {
                if (item.id === id) {
                    const { price, subtotal } = calculateItemPriceAndSubtotal(item.product, qty, item.unitSold, item.discount);
                    return { ...item, quantity: qty, computedUnitPrice: price, computedSubtotal: subtotal };
                }
                return item;
            })
        );
    };

    const handleUpdateDiscount = (id: string, discount?: DiscountObj) => {
        setCartItems((prev) =>
            prev.map((item) => {
                if (item.id === id) {
                    const { price, subtotal } = calculateItemPriceAndSubtotal(item.product, item.quantity, item.unitSold, discount);
                    return { ...item, discount, computedUnitPrice: price, computedSubtotal: subtotal };
                }
                return item;
            })
        );
    };

    const handleRemoveItem = (id: string) => {
        setCartItems((prev) => prev.filter((item) => item.id !== id));
    };

    const handleCheckout = async (paymentMode: PaymentMode, paidAmount: number, customerId: string | null) => {
        if (cartItems.length === 0) {
            message.error('السلة فارغة');
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
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
            };

            const res = await fetch('/api/pos/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error?.message || 'فشلت عملية الدفع');
            }

            message.success('تم إنشاء الفاتورة بنجاح!');
            // Reset POS state
            setCartItems([]);
            setInvoiceDiscount(undefined);
        } catch (err: any) {
            message.error(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Derive final total for Checkout component
    const invoiceSubtotal = cartItems.reduce((sum, item) => sum + item.computedSubtotal, 0);
    let finalTotal = invoiceSubtotal;
    if (invoiceDiscount) {
        if (invoiceDiscount.type === 'amount') {
            finalTotal = Math.max(0, invoiceSubtotal - invoiceDiscount.value);
        } else {
            finalTotal = Math.max(0, invoiceSubtotal - Math.round((invoiceSubtotal * invoiceDiscount.value) / 10000));
        }
    }

    return (
        <Row gutter={16} style={{ height: 'calc(100vh - 120px)' }}>
            <Col xs={24} lg={16} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ marginBottom: 16 }}>
                    <ProductSearch onAddToCart={handleAddToCart} />
                </div>
                <div style={{ flex: 1, overflow: 'auto' }}>
                    <Cart
                        items={cartItems}
                        onUpdateQuantity={handleUpdateQuantity}
                        onUpdateDiscount={handleUpdateDiscount}
                        onRemoveItem={handleRemoveItem}
                        invoiceDiscount={invoiceDiscount}
                        onUpdateInvoiceDiscount={setInvoiceDiscount}
                    />
                </div>
            </Col>
            <Col xs={24} lg={8}>
                <Checkout
                    total={finalTotal}
                    onCheckout={handleCheckout}
                    isSubmitting={isSubmitting}
                />
            </Col>
        </Row>
    );
}
