'use client';

import { useRouter } from 'next/navigation';
import { App } from 'antd';
import { useState } from 'react';
import SupplierForm, { SupplierFormValues } from '@/components/suppliers/SupplierForm';

export default function NewSupplierClientWrapper() {
    const { message } = App.useApp();
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (values: SupplierFormValues) => {
        setIsSubmitting(true);
        try {
            const res = await fetch('/api/suppliers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error?.message || 'فشلت إضافة المورد');
            }

            message.success('تمت إضافة المورد بنجاح');
            router.push('/suppliers');
            router.refresh();
        } catch (error: any) {
            message.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return <SupplierForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />;
}
