'use client';

import { useState } from 'react';
import { Tabs, Card, Button, Modal, Row, Col, Statistic, Image, Typography, App } from 'antd';
import { EditOutlined, PlusOutlined, PictureOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import ProductForm, { ProductFormValues } from '@/components/products/ProductForm';
import BatchViewer from '@/components/products/BatchViewer';
import InitialStockForm from '@/components/stock/InitialStockForm';
import ar from '@/i18n/ar';
import { formatPiasters } from '@/utils/money';

interface ProductDetailClientProps {
    product: any;
    batches: any[];
    stockSummary: any;
}

const { Title, Text } = Typography;

export default function ProductDetailClient({ product, batches, stockSummary }: ProductDetailClientProps) {
    const { message } = App.useApp();
    const router = useRouter();
    const [isEditing, setIsEditing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
    const [isInitialStockModalOpen, setIsInitialStockModalOpen] = useState(false);

    const initialStockMutation = useMutation({
        mutationFn: async (values: any) => {
            const res = await fetch('/api/stock/initial-entry', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error?.message || 'فشل تسجيل المخزون');
            }
            return res.json();
        },
        onSuccess: () => {
            message.success(ar.initialStock.success);
            setIsInitialStockModalOpen(false);
            router.refresh();
        },
        onError: (error: any) => {
            message.error(error.message);
        },
    });

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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h3>سجل التشغيلات (Batches)</h3>
                        <Button
                            icon={<PlusOutlined />}
                            onClick={() => setIsInitialStockModalOpen(true)}
                        >
                            {ar.initialStock.addInitialStock}
                        </Button>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                    <div>
                        {product.imageUrl ? (
                            <Image
                                src={product.imageUrl}
                                alt={product.nameAr}
                                width={120}
                                height={120}
                                style={{ objectFit: 'cover', borderRadius: 8, border: '1px solid #f0f0f0' }}
                                fallback="https://via.placeholder.com/120?text=No+Image"
                            />
                        ) : (
                            <div style={{ width: 120, height: 120, backgroundColor: '#f5f5f5', display: 'flex', justifyContent: 'center', alignItems: 'center', borderRadius: 8, border: '1px solid #f0f0f0' }}>
                                <PictureOutlined style={{ fontSize: 40, color: '#d9d9d9' }} />
                            </div>
                        )}
                    </div>
                    <div>
                        <Title level={2} style={{ margin: 0, marginBottom: 8 }}>{product.nameAr}</Title>
                        {product.nameEn && <Title level={4} type="secondary" style={{ margin: 0 }}>{product.nameEn}</Title>}
                    </div>
                </div>
            </div>

            <Tabs defaultActiveKey="1" items={items} />

            <Modal
                title={ar.initialStock.title}
                open={isInitialStockModalOpen}
                onCancel={() => !initialStockMutation.isPending && setIsInitialStockModalOpen(false)}
                footer={null}
                destroyOnClose
            >
                {isInitialStockModalOpen && (
                    <InitialStockForm
                        products={[{ _id: product._id, nameAr: product.nameAr, barcode: product.barcode, barcode2: product.barcode2 }]}
                        preselectedProductId={product._id}
                        onSubmit={async (values) => await initialStockMutation.mutateAsync(values)}
                        isLoading={initialStockMutation.isPending}
                    />
                )}
            </Modal>
        </div>
    );
}
