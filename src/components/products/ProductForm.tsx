'use client';

import { Form, Input, InputNumber, Switch, Button, Row, Col, Card, Space, Typography, App, Select } from 'antd';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SearchOutlined, BarcodeOutlined } from '@ant-design/icons';
import ar from '@/i18n/ar';
import { toEGP, toPiasters } from '@/lib/utils/money';
import BarcodeScanner from '../common/BarcodeScanner';

const { Title, Text } = Typography;

export interface ProductFormValues {
    barcode?: string;
    barcode2?: string;
    nameAr: string;
    nameEn?: string;
    imageUrl?: string;
    brand?: string;
    manufacturer?: string;
    category?: string;
    description?: string;
    activeIngredient?: string;
    dosageForm?: string;
    route?: string;
    uses?: string;
    pharmacology?: string;
    sellingPrice: number; // Stored in DB as piasters, but form handles EGP
    baseUnit: string;
    subUnit?: string;
    subUnitConversionFactor?: number;
    lowStockThreshold: number;
    isActive: boolean;
}

interface ProductFormProps {
    initialValues?: Partial<ProductFormValues>;
    onSubmit: (values: ProductFormValues) => Promise<void>;
    isSubmitting: boolean;
    onProductFound?: (product: any) => void;
    mode?: 'create' | 'edit';
}

export default function ProductForm({ initialValues, onSubmit, isSubmitting, onProductFound, mode = 'create' }: ProductFormProps) {
    const { message } = App.useApp();
    const [form] = Form.useForm<ProductFormValues>();
    const [isSearching, setIsSearching] = useState(false);

    const { data: brandsData, isLoading: isLoadingBrands } = useQuery({
        queryKey: ['brands-filter'],
        queryFn: async () => {
            const res = await fetch('/api/brands?all=true');
            if (!res.ok) throw new Error('Failed to fetch brands');
            return res.json() as Promise<{ data: any[] }>;
        },
    });

    const { data: unitsData, isLoading: isLoadingUnits } = useQuery({
        queryKey: ['units-filter'],
        queryFn: async () => {
            const res = await fetch('/api/units');
            if (!res.ok) throw new Error('Failed to fetch units');
            return res.json() as Promise<{ data: any }>;
        },
    });

    useEffect(() => {
        if (initialValues) {
            const brandId = typeof initialValues.brand === 'object' && initialValues.brand ? (initialValues.brand as any)._id : initialValues.brand;
            form.setFieldsValue({
                ...initialValues,
                brand: brandId,
                sellingPrice: initialValues.sellingPrice ? toEGP(initialValues.sellingPrice) : undefined,
            });
        }
    }, [initialValues, form]);

    const handleFinish = async (values: any) => {
        const payload = {
            ...values,
            sellingPrice: toPiasters(values.sellingPrice || 0),
        };
        await onSubmit(payload);
    };

    const handleBarcodeSearch = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        const barcode = (e.target as HTMLInputElement).value;
        if (!barcode || mode === 'edit') return;

        setIsSearching(true);
        try {
            const res = await fetch(`/api/products?search=${barcode}&allStatus=true`);
            if (res.ok) {
                const json = await res.json();
                const product = json.data.find((p: any) => p.barcode === barcode || p.barcode2 === barcode);
                if (product) {
                    message.info('المنتج موجود مسبقاً، تم الانتقال لوضع التعديل');
                    const brandId = typeof product.brand === 'object' && product.brand ? product.brand._id : product.brand;
                    form.setFieldsValue({
                        ...product,
                        brand: brandId,
                        sellingPrice: product.sellingPrice ? toEGP(product.sellingPrice) : undefined,
                    });
                    if (onProductFound) {
                        onProductFound(product);
                    }
                } else {
                    message.info('منتج جديد. يمكنك إكمال باقي البيانات.');
                }
            }
        } catch (error) {
            console.error('Error searching by barcode:', error);
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <Form
            form={form}
            layout="vertical"
            onFinish={handleFinish}
            initialValues={{
                isActive: true,
                lowStockThreshold: 10,
                baseUnit: 'علبة',
            }}
        >
            <Card style={{ marginBottom: 24, border: '2px solid #1890ff', backgroundColor: '#e6f7ff' }}>
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                    <BarcodeOutlined style={{ fontSize: 32, color: '#1890ff', marginBottom: 8 }} />
                    <Title level={4} style={{ margin: 0 }}>المسح الضوئي للباركود</Title>
                    <Text type="secondary">امسح الباركود للبحث عن منتج موجود أو لإضافة منتج جديد</Text>
                </div>

                <Row justify="center">
                    <Col xs={24} md={16} lg={12}>
                        <Form.Item name="barcode" style={{ marginBottom: 0 }}>
                            <Input
                                size="large"
                                autoFocus
                                prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                                onPressEnter={handleBarcodeSearch}
                                placeholder="امسح الباركود هنا أو أدخله يدوياً واضغط Enter..."
                                disabled={isSearching || mode === 'edit'}
                                style={{ textAlign: 'center', fontSize: '18px' }}
                            />
                        </Form.Item>
                        {mode === 'create' && (
                            <div style={{ textAlign: 'center', marginTop: 12 }}>
                                <BarcodeScanner
                                    onScan={(text) => {
                                        form.setFieldsValue({ barcode: text });
                                        handleBarcodeSearch({ target: { value: text } } as any);
                                    }}
                                    buttonProps={{ size: 'large', type: 'dashed' }}
                                />
                            </div>
                        )}
                    </Col>
                </Row>
            </Card>

            <Card title="البيانات الأساسية" style={{ marginBottom: 16 }}>
                <Row gutter={16}>
                    <Col xs={24} md={12}>
                        <Form.Item
                            name="nameAr"
                            label={ar.products.nameAr}
                            rules={[{ required: true, message: 'مطلوب إدخال الاسم بالعربية' }]}
                        >
                            <Input />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                        <Form.Item name="nameEn" label={ar.products.nameEn}>
                            <Input />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                        <Form.Item name="barcode2" label={ar.products.barcode2}>
                            <Input />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                        <Form.Item name="category" label={ar.products.category}>
                            <Input />
                        </Form.Item>
                    </Col>
                </Row>
            </Card>

            <Card title="تفاصيل التسعير والوحدات" style={{ marginBottom: 16 }}>
                <Row gutter={16}>
                    <Col xs={24} md={8}>
                        <Form.Item
                            label={ar.products.sellingPrice}
                            rules={[{ required: true, message: 'مطلوب إدخال سعر البيع' }]}
                        >
                            <Space.Compact style={{ width: '100%' }}>
                                <Form.Item name="sellingPrice" noStyle>
                                    <InputNumber
                                        min={0}
                                        step={0.25}
                                        style={{ width: '100%' }}
                                    />
                                </Form.Item>
                                <div style={{
                                    padding: '0 11px',
                                    backgroundColor: '#f5f5f5',
                                    border: '1px solid #d9d9d9',
                                    borderLeft: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    borderRadius: '0 6px 6px 0',
                                    whiteSpace: 'nowrap',
                                    color: 'rgba(0, 0, 0, 0.45)'
                                }}>
                                    ج.م
                                </div>
                            </Space.Compact>
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                        <Form.Item
                            name="baseUnit"
                            label={ar.products.baseUnit}
                            rules={[{ required: true, message: 'مطلوب إدخال الوحدة الأساسية' }]}
                        >
                            <Select
                                placeholder="اختر الوحدة (مثال: علبة)"
                                allowClear
                                showSearch
                                optionFilterProp="label"
                                loading={isLoadingUnits}
                                options={(unitsData?.data?.base_units || []).map((u: any) => ({
                                    value: u.nameAr,
                                    label: u.nameAr,
                                }))}
                            />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                        <Form.Item name="subUnit" label={ar.products.subUnit}>
                            <Select
                                placeholder="اختر وحدة فرعية (اختياري)"
                                allowClear
                                showSearch
                                optionFilterProp="label"
                                loading={isLoadingUnits}
                                options={(unitsData?.data?.sub_units || []).map((u: any) => ({
                                    value: u.nameAr,
                                    label: u.nameAr,
                                }))}
                            />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                        <Form.Item name="subUnitConversionFactor" label={ar.products.conversionFactor}>
                            <InputNumber min={1} style={{ width: '100%' }} placeholder="كم وحدة فرعية في الأساسية؟" />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                        <Form.Item name="lowStockThreshold" label={ar.products.lowStockThreshold}>
                            <InputNumber min={0} style={{ width: '100%' }} />
                        </Form.Item>
                    </Col>
                </Row>
            </Card>

            <Card title="البيانات الطبية والإضافية" style={{ marginBottom: 16 }}>
                <Row gutter={16}>
                    <Col xs={24} md={8}>
                        <Form.Item name="brand" label={ar.products.brand}>
                            <Select
                                placeholder="اختر الماركة التجارية"
                                allowClear
                                showSearch
                                optionFilterProp="label"
                                loading={isLoadingBrands}
                                options={(brandsData?.data || []).map((b: any) => ({
                                    value: b._id,
                                    label: b.nameEn || b.nameAr,
                                }))}
                            />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                        <Form.Item name="manufacturer" label={ar.products.manufacturer}>
                            <Input />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                        <Form.Item name="activeIngredient" label={ar.products.activeIngredient}>
                            <Input />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                        <Form.Item name="dosageForm" label={ar.products.dosageForm}>
                            <Input />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                        <Form.Item name="pharmacology" label={ar.products.pharmacology}>
                            <Input />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                        <Form.Item name="route" label={ar.products.route}>
                            <Input />
                        </Form.Item>
                    </Col>
                    <Col xs={24}>
                        <Form.Item name="uses" label={ar.products.uses}>
                            <Input.TextArea rows={2} />
                        </Form.Item>
                    </Col>
                    <Col xs={24}>
                        <Form.Item name="description" label={ar.products.description}>
                            <Input.TextArea rows={2} />
                        </Form.Item>
                    </Col>
                    <Col xs={24}>
                        <Form.Item name="imageUrl" label={ar.products.imageUrl}>
                            <Input />
                        </Form.Item>
                    </Col>
                </Row>
            </Card>

            <Form.Item name="isActive" valuePropName="checked">
                <Switch checkedChildren="نشط" unCheckedChildren="غير نشط" />
            </Form.Item>

            <Form.Item>
                <Button type="primary" htmlType="submit" loading={isSubmitting} block size="large">
                    {mode === 'edit' ? 'حفظ التعديلات' : ar.actions.save}
                </Button>
            </Form.Item>
        </Form>
    );
}
