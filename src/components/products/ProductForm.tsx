'use client';

import { Form, Input, InputNumber, Switch, Button, Row, Col, Card, Space, Typography, App, Select, Divider, DatePicker, Radio } from 'antd';
import { useEffect, useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SearchOutlined, BarcodeOutlined, InboxOutlined } from '@ant-design/icons';
import ar from '@/i18n/ar';
import { toEGP, toPiasters } from '@/lib/utils/money';
import BarcodeScanner from '../common/BarcodeScanner';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export interface ProductFormValues {
    _id?: string;
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
    // Initial Stock fields
    addInitialStock?: boolean;
    initialStock?: {
        batchNumber: string;
        expirationDate: any;
        quantity: number;
        purchasePrice: number;
        location: 'floor' | 'warehouse';
        notes?: string;
    };
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
    const [searchSource, setSearchSource] = useState<'barcode' | 'name' | null>(null);
    const addInitialStock = Form.useWatch('addInitialStock', form);
    const [nameSearchOptions, setNameSearchOptions] = useState<any[]>([]);
    const searchTimer = useRef<NodeJS.Timeout | null>(null);

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

        if (values.addInitialStock && values.initialStock) {
            payload.initialStock = {
                ...values.initialStock,
                expirationDate: values.initialStock.expirationDate?.endOf('month').toISOString(),
                purchasePrice: toPiasters(values.initialStock.purchasePrice || 0),
            };
        }

        await onSubmit(payload);
    };

    const handleBarcodeSearch = async (e: React.KeyboardEvent<HTMLInputElement> | { target: { value: string } }) => {
        const barcode = (e.target as HTMLInputElement).value;
        if (!barcode) return;

        // If we are in a hard-coded edit page (e.g. /products/[id]/edit), don't search
        if (mode === 'edit' && initialValues?._id) return;

        // Reset form but keep the barcode we just scanned/typed
        form.resetFields();
        form.setFieldsValue({ barcode });
        if (onProductFound) onProductFound(null);

        setIsSearching(true);
        try {
            const res = await fetch(`/api/products?search=${barcode}&allStatus=true`);
            if (res.ok) {
                const json = await res.json();
                const product = json.data.find((p: any) => p.barcode === barcode || p.barcode2 === barcode);
                if (product) {
                    message.info('المنتج موجود مسبقاً، تم الانتقال لوضع التعديل');
                    setSearchSource('barcode');
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
                    setSearchSource(null);
                }
            }
        } catch (error) {
            console.error('Error searching by barcode:', error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleProductNameSearch = (value: string) => {
        if (searchTimer.current) clearTimeout(searchTimer.current);

        if (!value || value.length < 2) {
            setNameSearchOptions([]);
            return;
        }

        searchTimer.current = setTimeout(async () => {
            setIsSearching(true);
            try {
                const res = await fetch(`/api/products?search=${encodeURIComponent(value)}&allStatus=true&limit=10`);
                if (res.ok) {
                    const json = await res.json();
                    setNameSearchOptions(json.data.map((p: any) => ({
                        label: (
                            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                <span style={{ fontWeight: 500 }}>{p.nameAr}</span>
                                <span style={{ color: '#8c8c8c', fontSize: '12px', marginLeft: 16 }}>{p.nameEn || ''}</span>
                            </div>
                        ),
                        value: p._id,
                        product: p,
                        // Search matches on both for local filtering if needed, though we use remote
                        searchText: `${p.nameAr} ${p.nameEn || ''}`
                    })));
                }
            } catch (error) {
                console.error('Error searching products by name:', error);
            } finally {
                setIsSearching(false);
            }
        }, 400);
    };

    const handleProductSelect = (productId: string, option: any) => {
        const product = option?.product;
        if (product) {
            // Reset form before loading new product
            form.resetFields();
            message.info('المنتج موجود مسبقاً، تم الانتقال لوضع التعديل');
            setSearchSource('name');
            const brandId = typeof product.brand === 'object' && product.brand ? product.brand._id : product.brand;
            form.setFieldsValue({
                ...product,
                brand: brandId,
                sellingPrice: product.sellingPrice ? toEGP(product.sellingPrice) : undefined,
            });
            if (onProductFound) {
                onProductFound(product);
            }
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
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                    <BarcodeOutlined style={{ fontSize: 36, color: '#1890ff', marginBottom: 12 }} />
                    <Title level={4} style={{ margin: 0 }}>المسح الضوئي للباركود والبحث</Title>
                    <Text type="secondary">امسح الباركود للبحث عن منتج موجود أو ابحث بالاسم (عربي/إنجليزي)</Text>
                </div>

                <Row justify="center" gutter={24}>
                    <Col xs={24} md={11}>
                        <Form.Item name="barcode" label="الباركود (سكان)" style={{ marginBottom: 12 }}>
                            <Input
                                size="large"
                                autoFocus
                                prefix={<BarcodeOutlined style={{ color: '#bfbfbf' }} />}
                                onPressEnter={handleBarcodeSearch}
                                placeholder="امسح الباركود هنا..."
                                disabled={isSearching || (mode === 'edit' && searchSource === 'barcode')}
                                style={{ textAlign: 'center', fontSize: '18px' }}
                            />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={11}>
                        <Form.Item label="البحث بالاسم (عربي / English)" style={{ marginBottom: 12 }}>
                            <Select
                                showSearch
                                size="large"
                                placeholder="ابحث باسم المنتج..."
                                filterOption={false}
                                onSearch={handleProductNameSearch}
                                onSelect={handleProductSelect}
                                options={nameSearchOptions}
                                loading={isSearching}
                                disabled={mode === 'edit' && searchSource === 'name'}
                                style={{ width: '100%' }}
                                allowClear
                                styles={{ popup: { root: { minWidth: 300 } } }}
                                prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                            />
                        </Form.Item>
                    </Col>
                </Row>
                <div style={{ textAlign: 'center', marginTop: 12 }}>
                    <BarcodeScanner
                        onScan={(text) => {
                            form.setFieldsValue({ barcode: text });
                            // In creation wrapper, we want scan to always trigger a search (which now resets form)
                            // In a real edit page (fixed mode='edit'), we just update the field.
                            if (mode === 'create' || (mode === 'edit' && !initialValues?._id)) {
                                handleBarcodeSearch({ target: { value: text } } as any);
                            }
                        }}
                        buttonProps={{ size: 'large', type: 'dashed' }}
                    />
                </div>
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
                            required
                        >
                            <Space.Compact style={{ width: '100%' }}>
                                <Form.Item
                                    name="sellingPrice"
                                    noStyle
                                    rules={[{ required: true, message: 'مطلوب إدخال سعر البيع' }]}
                                >
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

            {/* Show initial stock section in create mode, or if a product was found during the create flow */}
            {(mode === 'create' || searchSource) && (
                <Card
                    title={
                        <Space>
                            <InboxOutlined />
                            <span>{ar.initialStock.title}</span>
                            <Form.Item name="addInitialStock" valuePropName="checked" noStyle>
                                <Switch size="small" />
                            </Form.Item>
                        </Space>
                    }
                    style={{
                        marginBottom: 16,
                        border: addInitialStock ? '1px solid #1890ff' : undefined,
                        opacity: addInitialStock ? 1 : 0.7,
                    }}
                >
                    {!addInitialStock && (
                        <div style={{ textAlign: 'center', padding: '10px 0' }}>
                            <Text type="secondary">تفعيل هذا الخيار يتيح لك إدخال رصيد البداية لهذا المنتج فور إنشائه.</Text>
                        </div>
                    )}

                    {addInitialStock && (
                        <Row gutter={16}>
                            <Col xs={24} md={12}>
                                <Form.Item
                                    name={['initialStock', 'batchNumber']}
                                    label={ar.initialStock.batchNumber}
                                    rules={[{ required: true, message: 'رقم التشغيلة مطلوب' }]}
                                >
                                    <Input placeholder="مثال: Shelf-1" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item
                                    name={['initialStock', 'expirationDate']}
                                    label={ar.initialStock.expirationDate}
                                    rules={[{ required: true, message: 'تاريخ الانتهاء مطلوب' }]}
                                >
                                    <DatePicker
                                        picker="month"
                                        format="YYYY-MM"
                                        style={{ width: '100%' }}
                                    />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={8}>
                                <Form.Item
                                    name={['initialStock', 'quantity']}
                                    label={ar.initialStock.quantity}
                                    rules={[{ required: true, message: 'الكمية مطلوبة' }]}
                                >
                                    <InputNumber min={1} style={{ width: '100%' }} />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={8}>
                                <Form.Item
                                    name={['initialStock', 'purchasePrice']}
                                    label={ar.initialStock.purchasePrice}
                                    rules={[{ required: true, message: 'سعر الشراء مطلوب' }]}
                                >
                                    <InputNumber min={0} step={0.25} style={{ width: '100%' }} />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={8}>
                                <Form.Item
                                    name={['initialStock', 'location']}
                                    label={ar.initialStock.location}
                                    initialValue="floor"
                                >
                                    <Radio.Group>
                                        <Radio value="floor">{ar.initialStock.floor}</Radio>
                                        <Radio value="warehouse">{ar.initialStock.warehouse}</Radio>
                                    </Radio.Group>
                                </Form.Item>
                            </Col>
                            <Col xs={24}>
                                <Form.Item
                                    name={['initialStock', 'notes']}
                                    label={ar.initialStock.notes}
                                >
                                    <Input.TextArea rows={1} />
                                </Form.Item>
                            </Col>
                        </Row>
                    )}
                </Card>
            )}

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
