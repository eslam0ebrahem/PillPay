'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { App, Flex, Card, Typography } from 'antd';
import { UserAddOutlined, InfoCircleOutlined } from '@ant-design/icons';
import SupplierForm, { SupplierFormValues } from '@/components/suppliers/SupplierForm';
import PageHeader from '@/components/common/PageHeader';
import ar from '@/i18n/ar';

const { Text } = Typography;

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
            message.error(error.message || 'حدث خطأ أثناء حفظ بيانات المورد');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Flex vertical gap={24} style={{ paddingBottom: 60 }}>
            {/* 1. Header with breadcrumb-like context */}
            <PageHeader 
                title={ar.suppliers.addSupplier} 
                subtitle="إضافة مورد جديد لقاعدة البيانات لإدارة المشتريات والمديونيات"
            />

            {/* 2. Centered Form Container */}
            <div style={{ 
                maxWidth: 900, 
                width: '100%', 
                margin: '0 auto' 
            }}>
                <Card 
                    variant="borderless"
                    style={{ 
                        borderRadius: 16, 
                        boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
                        overflow: 'hidden'
                    }}
                >
                    {/* Visual entry point */}
                    <Flex align="center" gap={12} style={{ marginBottom: 32, padding: '0 8px' }}>
                        <div style={{ 
                            background: '#f6ffed', 
                            padding: '12px', 
                            borderRadius: '12px',
                            color: '#52c41a',
                            display: 'flex'
                        }}>
                            <UserAddOutlined style={{ fontSize: 24 }} />
                        </div>
                        <div>
                            <Text strong style={{ fontSize: 16, display: 'block' }}>سجل مورد جديد</Text>
                            <Text type="secondary" style={{ fontSize: 13 }}>
                                يرجى التأكد من صحة رقم الهاتف والبيانات الضريبية
                            </Text>
                        </div>
                    </Flex>

                    <SupplierForm 
                        onSubmit={handleSubmit} 
                        isSubmitting={isSubmitting} 
                    />
                </Card>
            </div>

            {/* 3. Footer Tip */}
            <Flex justify="center">
                <Text type="secondary" style={{ fontSize: 12, opacity: 0.7 }}>
                    <InfoCircleOutlined /> يمكنك تعديل هذه البيانات أو تعطيل المورد لاحقاً من صفحة الإعدادات
                </Text>
            </Flex>
        </Flex>
    );
}