'use client';

import { useState, useEffect } from 'react';
import {
    Tabs,
    Card,
    Button,
    Row,
    Col,
    Statistic,
    Image,
    Typography,
    App,
    Grid,
    Flex,
    Divider,
} from 'antd';
import { EditOutlined, PlusOutlined, PictureOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import ProductForm, { ProductFormValues } from '@/components/products/ProductForm';
import BatchViewer from '@/components/products/BatchViewer';
import InitialStockForm from '@/components/stock/InitialStockForm';
import MobileFormWrapper from '../common/MobileFormWrapper';
import ar from '@/i18n/ar';
import { formatPiasters } from '@/utils/money';

interface ProductDetailClientProps {
    product: any;
    batches: any[];
    stockSummary: any;
}

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

export default function ProductDetailClient({
    product,
    batches,
    stockSummary,
}: ProductDetailClientProps) {
    const { message } = App.useApp();
    const router = useRouter();
    const screens = useBreakpoint();
    const [mounted, setMounted] = useState(false);

    const [isEditing, setIsEditing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isInitialStockModalOpen, setIsInitialStockModalOpen] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const isMobile = screens.xs || (screens.sm && !screens.md);

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

    const DetailItem = ({ label, value }: { label: string; value: React.ReactNode }) => (
        <div style={{ marginBottom: isMobile ? 12 : 0 }}>
            <Text type="secondary" style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>
                {label}
            </Text>
            <Text strong style={{ fontSize: 15 }}>
                {value || '-'}
            </Text>
        </div>
    );

    const items = [
        {
            key: '1',
            label: 'تفاصيل المخزون',
            children: (
                <Card
                    size={isMobile ? 'small' : 'medium'}
                    variant={isMobile ? 'borderless' : 'outlined'}
                    style={{
                        backgroundColor: isMobile ? 'transparent' : '#fff',
                        boxShadow: 'none',
                    }}
                    styles={{ body: { padding: isMobile ? '12px 0' : 24 } }}
                >
                    <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
                        <Col xs={24} sm={8}>
                            <Card
                                size="small"
                                style={{ backgroundColor: '#e6f4ff', borderColor: '#91caff' }}
                            >
                                <Statistic
                                    title={<Text strong>{ar.products.totalStock}</Text>}
                                    value={stockSummary.totalQty}
                                    suffix={product.baseUnit}
                                    styles={{ content: { color: '#1677ff' } }}
                                />
                            </Card>
                        </Col>
                        <Col xs={12} sm={8}>
                            <Card
                                size="small"
                                style={{ backgroundColor: '#f6ffed', borderColor: '#b7eb8f' }}
                            >
                                <Statistic
                                    title={ar.products.floorStock}
                                    value={stockSummary.totalFloorQty}
                                    suffix={product.baseUnit}
                                    styles={{ content: { color: '#389e0d' } }}
                                />
                            </Card>
                        </Col>
                        <Col xs={12} sm={8}>
                            <Card
                                size="small"
                                style={{ backgroundColor: '#f9f0ff', borderColor: '#d3adf7' }}
                            >
                                <Statistic
                                    title={ar.products.warehouseStock}
                                    value={stockSummary.totalWarehouseQty}
                                    suffix={product.baseUnit}
                                    styles={{ content: { color: '#531dab' } }}
                                />
                            </Card>
                        </Col>
                    </Row>

                    <Flex
                        vertical={isMobile}
                        align={isMobile ? 'stretch' : 'center'}
                        justify="space-between"
                        gap={12}
                        style={{ marginBottom: 16 }}
                    >
                        <Title level={isMobile ? 5 : 4} style={{ margin: 0 }}>
                            سجل التشغيلات (Batches)
                        </Title>
                        <Button
                            type="dashed"
                            icon={<PlusOutlined />}
                            onClick={() => setIsInitialStockModalOpen(true)}
                            block={isMobile}
                        >
                            {ar.initialStock.addInitialStock}
                        </Button>
                    </Flex>

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
                        <Card
                            size={isMobile ? 'small' : 'medium'}
                            actions={[
                                <Button
                                    key="edit"
                                    type="link"
                                    icon={<EditOutlined />}
                                    onClick={() => setIsEditing(true)}
                                    block
                                >
                                    تعديل بيانات المنتج
                                </Button>,
                            ]}
                        >
                            <Row gutter={[16, 24]}>
                                <Col xs={24} sm={12}>
                                    <DetailItem
                                        label={ar.products.barcode}
                                        value={product.barcode}
                                    />
                                </Col>
                                <Col xs={24} sm={12}>
                                    <DetailItem
                                        label={ar.products.barcode2}
                                        value={product.barcode2}
                                    />
                                </Col>

                                {isMobile && <Divider style={{ margin: 0 }} />}

                                <Col xs={24} sm={12}>
                                    <DetailItem
                                        label={ar.products.brand}
                                        value={
                                            product.brand?.nameEn ||
                                            product.brand?.nameAr ||
                                            product.manufacturer
                                        }
                                    />
                                </Col>
                                <Col xs={24} sm={12}>
                                    <DetailItem
                                        label={ar.products.manufacturer}
                                        value={product.manufacturer}
                                    />
                                </Col>

                                {isMobile && <Divider style={{ margin: 0 }} />}

                                <Col xs={12} sm={12}>
                                    <DetailItem
                                        label={ar.products.sellingPrice}
                                        value={
                                            <span style={{ color: '#237804' }}>
                                                {formatPiasters(product.sellingPrice)}
                                            </span>
                                        }
                                    />
                                </Col>
                                <Col xs={12} sm={12}>
                                    <DetailItem
                                        label={ar.products.baseUnit}
                                        value={product.baseUnit}
                                    />
                                </Col>

                                {isMobile && <Divider style={{ margin: 0 }} />}

                                <Col xs={24}>
                                    <DetailItem
                                        label={ar.products.activeIngredient}
                                        value={product.activeIngredient}
                                    />
                                </Col>
                            </Row>
                        </Card>
                    ) : (
                        <Card size={isMobile ? 'small' : 'medium'}>
                            <div style={{ marginBottom: 16 }}>
                                <Button
                                    icon={<ArrowLeftOutlined />}
                                    onClick={() => setIsEditing(false)}
                                    type="default"
                                >
                                    العودة للتفاصيل
                                </Button>
                            </div>
                            <ProductForm
                                initialValues={product}
                                onSubmit={handleUpdate}
                                isSubmitting={isSubmitting}
                                mode="edit"
                            />
                        </Card>
                    )}
                </div>
            ),
        },
    ];

    if (!mounted) return null;

    return (
        <div>
            <Card
                style={{ marginBottom: 24, borderRadius: 12, overflow: 'hidden' }}
                styles={{ body: { padding: isMobile ? 16 : 24 } }}
            >
                <Flex
                    vertical={isMobile}
                    gap={24}
                    align={isMobile ? 'center' : 'flex-start'}
                    style={{ textAlign: isMobile ? 'center' : 'right' }} // Assuming RTL
                >
                    <div style={{ flexShrink: 0 }}>
                        {product.imageUrl ? (
                            <Image
                                src={product.imageUrl}
                                alt={product.nameAr}
                                width={isMobile ? 100 : 120}
                                height={isMobile ? 100 : 120}
                                style={{
                                    objectFit: 'cover',
                                    borderRadius: 12,
                                    border: '1px solid #f0f0f0',
                                }}
                                fallback="/no-image.svg"
                            />
                        ) : (
                            <div
                                style={{
                                    width: isMobile ? 100 : 120,
                                    height: isMobile ? 100 : 120,
                                    backgroundColor: '#f5f5f5',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    borderRadius: 12,
                                    border: '1px solid #f0f0f0',
                                }}
                            >
                                <PictureOutlined style={{ fontSize: 40, color: '#d9d9d9' }} />
                            </div>
                        )}
                    </div>
                    <div style={{ flex: 1 }}>
                        <Title
                            level={isMobile ? 3 : 2}
                            style={{ margin: 0, marginBottom: 8, color: '#1f1f1f' }}
                        >
                            {product.nameAr}
                        </Title>
                        {product.nameEn && (
                            <Title
                                level={isMobile ? 5 : 4}
                                type="secondary"
                                style={{ margin: 0, fontWeight: 400 }}
                            >
                                {product.nameEn}
                            </Title>
                        )}
                    </div>
                </Flex>
            </Card>

            <Tabs defaultActiveKey="1" items={items} size={isMobile ? 'small' : 'middle'} />

            <MobileFormWrapper
                title={ar.initialStock.title}
                open={isInitialStockModalOpen}
                onClose={() => !initialStockMutation.isPending && setIsInitialStockModalOpen(false)}
            >
                {isInitialStockModalOpen && (
                    <div style={{ padding: isMobile ? '12px 0' : 0 }}>
                        <InitialStockForm
                            products={[
                                {
                                    _id: product._id,
                                    nameAr: product.nameAr,
                                    barcode: product.barcode,
                                    barcode2: product.barcode2,
                                },
                            ]}
                            preselectedProductId={product._id}
                            onSubmit={async (values) =>
                                await initialStockMutation.mutateAsync(values)
                            }
                            isLoading={initialStockMutation.isPending}
                        />
                    </div>
                )}
            </MobileFormWrapper>
        </div>
    );
}
