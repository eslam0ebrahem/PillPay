'use client';

import { useRouter } from 'next/navigation';
import { App } from 'antd';
import { useState, useCallback } from 'react';
import ProductForm, { ProductFormValues } from '@/components/products/ProductForm';

export default function NewProductClientWrapper() {
    const { message } = App.useApp();
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingProductId, setEditingProductId] = useState<string | null>(null);

    const handleSubmit = async (values: ProductFormValues) => {
        setIsSubmitting(true);
        try {
            const { initialStocks, addInitialStock, ...productValues } = values;
            const url = editingProductId ? `/api/products/${editingProductId}` : '/api/products';
            const method = editingProductId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(productValues),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error?.message || 'فشلت العملية');
            }

            const responseData = await res.json();
            
            // Safely grab the ID whether your API wraps it in a `data` object or returns it directly
            const productId = editingProductId || responseData?.data?._id || responseData?._id;

            // Handle initial stocks ONLY if we are creating a brand new product
            if (addInitialStock && initialStocks && initialStocks.length > 0 && !editingProductId) {
                const stockRes = await fetch('/api/stock/initial-entry', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        productId,
                        batches: initialStocks
                    }),
                });

                if (!stockRes.ok) {
                    const stockData = await stockRes.json();
                    message.warning(`تم إنشاء المنتج ولكن فشل تسجيل المخزون: ${stockData.error?.message || 'خطأ غير معروف'}`);
                } else {
                    message.success('تم إنشاء المنتج وتسجيل المخزون الأولي بنجاح');
                }
            } else if (editingProductId && addInitialStock) {
                // Prevent duplicate inventory issues if they tried to add initial stock to an existing product
                message.success('تم تحديث المنتج بنجاح. (ملاحظة: لا يمكن إضافة رصيد افتتاحي لمنتج موجود مسبقاً من هذه الشاشة)');
            } else {
                message.success(editingProductId ? 'تم تحديث المنتج بنجاح' : 'تمت إضافة المنتج بنجاح');
            }

            router.push('/products');
            router.refresh();
        } catch (error: any) {
            message.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // UseCallback to prevent unnecessary re-renders of the child form
    const handleProductFound = useCallback((product: any | null) => {
        if (product) {
            setEditingProductId(product._id);
        } else {
            // Crucial fix: Allow the user to reset the form back to "Create" mode
            setEditingProductId(null); 
        }
    }, []);

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%' }}>
            <ProductForm
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
                onProductFound={handleProductFound}
                mode={editingProductId ? 'edit' : 'create'}
            />
        </div>
    );
}