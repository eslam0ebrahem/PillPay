'use client';

import { useRouter } from 'next/navigation';
import { message } from 'antd';
import { useState } from 'react';
import ProductForm, { ProductFormValues } from '@/components/products/ProductForm';

export default function NewProductClientWrapper() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingProductId, setEditingProductId] = useState<string | null>(null);

    const handleSubmit = async (values: ProductFormValues) => {
        setIsSubmitting(true);
        try {
            const url = editingProductId ? `/api/products/${editingProductId}` : '/api/products';
            const method = editingProductId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error?.message || 'فشلت العملية');
            }

            message.success(editingProductId ? 'تم تحديث المنتج بنجاح' : 'تمت إضافة المنتج بنجاح');
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
            onProductFound={(product) => setEditingProductId(product._id)}
            mode={editingProductId ? 'edit' : 'create'}
        />
    );
}
