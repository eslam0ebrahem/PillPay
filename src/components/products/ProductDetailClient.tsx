'use client';

import { useState } from 'react';
import { Tabs, Card, Button, Modal, Row, Col, Statistic, message } from 'antd';
import { EditOutlined, RetweetOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import ProductForm, { ProductFormValues } from '@/components/products/ProductForm';
import BatchViewer from '@/components/products/BatchViewer';
import ar from '@/i18n/ar';
import { formatPiasters } from '@/utils/money';

interface ProductDetailClientProps {
    product: any;
    batches: any[];
    stockSummary: any;
}

export default function ProductDetailClient({ product, batches, stockSummary }: ProductDetailClientProps) {
    const router = useRouter();
    const [isEditing, setIsEditing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);

    const handleUpdate = async (values: ProductFormValues) => {
        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/products/${product._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error?.message || 'فشل تحديث المنتج');
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
            label: 'تفاصيل المخزون',
            children: (
                <Card>
                    <Row gutter={16} style={{ marginBottom: 24 }}>
                        <Col span={8}>
                            <Statistic title={ar.products.totalStock} value={stockSummary.totalQty} suffix={product.baseUnit} />
                        </Col>
                        <Col span={8}>
                            <Statistic title={ar.products.floorStock} value={stockSummary.totalFloorQty} suffix={product.baseUnit} />
                        </Col>
                        <Col span={8}>
                            <Statistic title={ar.products.warehouseStock} value={stockSummary.totalWarehouseQty} suffix={product.baseUnit} />
                        </Col>
                    </Row>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                        <h3>سجل التشغيلات (Batches)</h3>
                    </div>
                    <BatchViewer batches={batches} expiringSoonDays={90} />
                </Card>
            ),
        },
        {
            key: '2',
            label: 'البيانات الأساسية',
            children: (
                <div style={{ marginTop: 16 }}>
                    {!isEditing ? (
                        <Card extra={<Button icon={<EditOutlined />} onClick={() => setIsEditing(true)}>تعديل</Button>}>
                            <Row gutter={[16, 16]}>
                                <Col span={12}><strong>{ar.products.barcode}:</strong> {product.barcode || '-'}</Col>
                                <Col span={12}><strong>{ar.products.barcode2}:</strong> {product.barcode2 || '-'}</Col>
                                <Col span={12}><strong>{ar.products.brand}:</strong> {product.brand?.nameEn || product.brand?.nameAr || product.manufacturer || '-'}</Col>
                                <Col span={12}><strong>{ar.products.sellingPrice}:</strong> {formatPiasters(product.sellingPrice)}</Col>
                                <Col span={12}><strong>{ar.products.baseUnit}:</strong> {product.baseUnit}</Col>
                                <Col span={12}><strong>{ar.products.manufacturer}:</strong> {product.manufacturer || '-'}</Col>
                                <Col span={12}><strong>{ar.products.activeIngredient}:</strong> {product.activeIngredient || '-'}</Col>
                            </Row>
                        </Card>
                    ) : (
                        <Card>
                            <div style={{ marginBottom: 16, textAlign: 'right' }}>
                                <Button onClick={() => setIsEditing(false)}>إلغاء التعديل</Button>
                            </div>
                            <ProductForm initialValues={product} onSubmit={handleUpdate} isSubmitting={isSubmitting} />
                        </Card>
                    )}
                </div>
            )
        }
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h2>{product.nameAr} {product.nameEn ? `(${product.nameEn})` : ''}</h2>
            </div>

            <Tabs defaultActiveKey="1" items={items} />
        </div>
    );
}
