'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { App, Flex, Card, Typography } from 'antd';
import { FileAddOutlined, InfoCircleOutlined } from '@ant-design/icons';
import InvoiceForm from '@/components/suppliers/InvoiceForm';
import PageHeader from '@/components/common/PageHeader';
import ar from '@/i18n/ar';

const { Text } = Typography;

interface Props {
    suppliers: any[];
    products: any[];
}

export default function NewSupplierInvoiceClientWrapper({ suppliers, products }: Props) {
    const { message } = App.useApp();
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (values: any) => {
        setIsSubmitting(true);
        try {
            const res = await fetch('/api/supplier-invoices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error?.message || 'فشل حفظ الفاتورة');
            }

            message.success('تم حفظ الفاتورة بنجاح وتحديث أرصدة المخزن');
            router.push('/supplier-invoices');
            router.refresh();
        } catch (error: any) {
            console.error('Invoice Submit Error:', error);
            message.error(error.message || 'حدث خطأ أثناء حفظ الفاتورة');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Flex vertical gap={24} style={{ paddingBottom: 60 }}>
            {/* 1. Contextual Header */}
            <PageHeader 
                title="تسجيل فاتورة مشتريات" 
                subtitle="قم بإضافة المنتجات والكميات وتواريخ الانتهاء لتحديث أرصدة الصيدلية"
            />

            {/* 2. Main Entry Container */}
            <div style={{ 
                maxWidth: 1200, 
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
                    {/* Header Inside Card for better Mobile Context */}
                    <Flex align="center" gap={12} style={{ marginBottom: 32, padding: '0 8px' }}>
                        <div style={{ 
                            background: '#e6f7ff', 
                            padding: '12px', 
                            borderRadius: '12px',
                            color: '#1890ff',
                            display: 'flex'
                        }}>
                            <FileAddOutlined style={{ fontSize: 24 }} />
                        </div>
                        <div>
                            <Text strong style={{ fontSize: 16, display: 'block' }}>تفاصيل التوريد</Text>
                            <Text type="secondary" style={{ fontSize: 13 }}>
                                تأكد من مراجعة تواريخ الانتهاء والأسعار قبل الحفظ
                            </Text>
                        </div>
                    </Flex>

                    <InvoiceForm 
                        suppliers={suppliers} 
                        products={products} 
                        onSubmit={handleSubmit} 
                        isSubmitting={isSubmitting} 
                    />
                </Card>
            </div>

            {/* 3. Helper Info for Pharmacists */}
            <Flex justify="center" style={{ marginTop: 8 }}>
                <Space style={{ color: '#8c8c8c', fontSize: 12 }}>
                    <InfoCircleOutlined />
                    <span>عند حفظ الفاتورة، سيتم إنشاء "تشغيلات" (Batches) جديدة تلقائياً لكل منتج.</span>
                </Space>
            </Flex>
        </Flex>
    );
}

// Minimal Space component import if not already globally handled
import { Space } from 'antd';