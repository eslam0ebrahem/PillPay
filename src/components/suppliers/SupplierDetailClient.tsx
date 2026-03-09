'use client';

import { useState } from 'react';
import { Tabs, Card, Button, Row, Col, Statistic, message } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import SupplierForm, { SupplierFormValues } from '@/components/suppliers/SupplierForm';
import ar from '@/i18n/ar';
import { formatPiasters } from '@/utils/money';
import dayjs from 'dayjs';

interface SupplierDetailClientProps {
    supplier: any;
    recentInvoices: any[];
    recentPayments: any[];
}

export default function SupplierDetailClient({ supplier, recentInvoices, recentPayments }: SupplierDetailClientProps) {
    const router = useRouter();
    const [isEditing, setIsEditing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleUpdate = async (values: SupplierFormValues) => {
        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/suppliers/${supplier._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error?.message || 'فشل تحديث المورد');
            }

            message.success('تم التحديث بنجاح');
            setIsEditing(false);
            router.refresh();
        } catch (error: any) {
            message.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const items = [
        {
            key: '1',
            label: 'البيانات الأساسية',
            children: (
                <div style={{ marginTop: 16 }}>
                    {!isEditing ? (
                        <Card extra={<Button icon={<EditOutlined />} onClick={() => setIsEditing(true)}>تعديل</Button>}>
                            <Row gutter={[16, 16]}>
                                <Col span={12}><strong>{ar.suppliers.phone}:</strong> {supplier.phone || '-'}</Col>
                                <Col span={12}><strong>{ar.suppliers.contactPerson}:</strong> {supplier.contactPerson || '-'}</Col>
                                <Col span={12}><strong>البريد الإلكتروني:</strong> {supplier.email || '-'}</Col>
                                <Col span={12}><strong>العنوان:</strong> {supplier.address || '-'}</Col>
                                <Col span={12}><strong>{ar.suppliers.taxId}:</strong> {supplier.taxId || '-'}</Col>
                                <Col span={12}><strong>{ar.suppliers.commercialRegister}:</strong> {supplier.commercialRegister || '-'}</Col>
                            </Row>
                        </Card>
                    ) : (
                        <Card>
                            <div style={{ marginBottom: 16, textAlign: 'right' }}>
                                <Button onClick={() => setIsEditing(false)}>إلغاء التعديل</Button>
                            </div>
                            <SupplierForm initialValues={supplier} onSubmit={handleUpdate} isSubmitting={isSubmitting} />
                        </Card>
                    )}
                </div>
            )
        },
        {
            key: '2',
            label: 'فواتير المورد',
            children: (
                <Card style={{ marginTop: 16 }}>
                    <p>سيتم عرض الفواتير هنا</p>
                </Card>
            )
        },
        {
            key: '3',
            label: 'سجل المدفوعات',
            children: (
                <Card style={{ marginTop: 16 }}>
                    <p>سيتم عرض سجل المدفوعات هنا</p>
                </Card>
            )
        }
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h2>{supplier.name} {supplier.isActive ? '' : '(غير نشط)'}</h2>
                <Statistic title={ar.suppliers.totalOwed} value={supplier.totalOwed || 0} precision={2} styles={{ content: { color: supplier.totalOwed > 0 ? '#cf1322' : '#3f8600' } }} prefix="ج.م" />
            </div>

            <Tabs defaultActiveKey="1" items={items} />
        </div>
    );
}
