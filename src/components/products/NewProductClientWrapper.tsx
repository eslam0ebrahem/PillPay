'use client';

import { useRouter } from 'next/navigation';
import { App } from 'antd';
import { useState } from 'react';
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

            const product = await res.json();
            const productId = editingProductId || product._id;

            // Handle initial stocks if provided
            if (addInitialStock && initialStocks && initialStocks.length > 0) {
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

    return (
        <ProductForm
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            onProductFound={(product) => product && setEditingProductId(product._id)}
            mode={editingProductId ? 'edit' : 'create'}
        />
    );
}
