'use client';

import { Form, Input, InputNumber, Switch, Button, Row, Col, Card, Space, Typography, App, Select, Divider, DatePicker, Radio, Grid, Flex } from 'antd';
import { useEffect, useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SearchOutlined, BarcodeOutlined, InboxOutlined, LockOutlined, UnlockOutlined, PlusOutlined, DeleteOutlined, SaveOutlined } from '@ant-design/icons';
import ar from '@/i18n/ar';
import { toEGP, toPiasters } from '@/lib/utils/money';
import BarcodeScanner from '../common/BarcodeScanner';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

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
    sellingPrice: number;
    baseUnit: string;
    subUnit?: string;
    subUnitConversionFactor?: number;
    lowStockThreshold: number;
    isActive: boolean;
    addInitialStock?: boolean;
    initialStocks?: Array<{
        batchNumber: string;
        expirationDate: any;
        quantity: number;
        purchasePrice: number;
        discount?: number;
        location: 'floor' | 'warehouse';
        notes?: string;
    }>;
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
    const screens = useBreakpoint();
    const isMobile = screens.xs || (screens.sm && !screens.md);
    
    const [form] = Form.useForm<ProductFormValues>();
    const [isSearching, setIsSearching] = useState(false);
    const [searchSource, setSearchSource] = useState<'barcode' | 'name' | null>(null);
    const [isLocked, setIsLocked] = useState(mode === 'edit');
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

    const handleReset = () => {
        form.resetFields();
        setIsLocked(false);
        setSearchSource(null);
        setNameSearchOptions([]);
        if (onProductFound) onProductFound(null);
        message.info('تمت إعادة ضبط النموذج للبحث من جديد');
    };

    const handleFinish = async (values: any) => {
        const payload = {
            ...values,
            sellingPrice: toPiasters(values.sellingPrice || 0),
        };

        if (values.addInitialStock && values.initialStocks) {
            payload.initialStocks = values.initialStocks.map((stock: any) => ({
                ...stock,
                expirationDate: stock.expirationDate?.endOf('month').toISOString(),
                purchasePrice: toPiasters(stock.purchasePrice || 0),
            }));
        }

        await onSubmit(payload);
    };

    const handleBarcodeSearch = async (e: React.KeyboardEvent<HTMLInputElement> | { target: { value: string } }) => {
        const barcode = (e.target as HTMLInputElement).value;
        if (!barcode) return;

        if (mode === 'edit' && initialValues?._id) return;

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
                    setIsLocked(true);
                    const brandId = typeof product.brand === 'object' && product.brand ? product.brand._id : product.brand;
                    form.setFieldsValue({
                        ...product,
                        brand: brandId,
                        sellingPrice: product.sellingPrice ? toEGP(product.sellingPrice) : undefined,
                    });
                    if (onProductFound) onProductFound(product);
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
                            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                <span style={{ fontWeight: 500 }}>{p.nameAr}</span>
                                <span style={{ color: '#8c8c8c', fontSize: '12px', marginInlineStart: 16 }}>{p.nameEn || ''}</span>
                            </div>
                        ),
                        value: p._id,
                        product: p,
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
            form.resetFields();
            setIsLocked(true);
            message.info('المنتج موجود مسبقاً، تم الانتقال لوضع التعديل');
            setSearchSource('name');
            const brandId = typeof product.brand === 'object' && product.brand ? product.brand._id : product.brand;
            form.setFieldsValue({
                ...product,
                brand: brandId,
                sellingPrice: product.sellingPrice ? toEGP(product.sellingPrice) : undefined,
            });
            if (onProductFound) onProductFound(product);
        }
    };

    const handleValuesChange = (changedValues: any, allValues: any) => {
        const sellingPrice = allValues.sellingPrice;

        if (allValues.addInitialStock && allValues.initialStocks) {
            const changedStocks = changedValues.initialStocks;
            if (changedStocks) {
                const index = changedStocks.findIndex((s: any) => s !== undefined);
                if (index !== -1) {
                    const changedItem = changedStocks[index];
                    const currentStocks = [...allValues.initialStocks];
                    const currentItem = currentStocks[index];

                    if (changedItem.discount !== undefined) {
                        const discount = changedItem.discount;
                        if (sellingPrice) {
                            const newPurchasePrice = sellingPrice * (1 - discount / 100);
                            currentItem.purchasePrice = Number(newPurchasePrice.toFixed(2));
                            form.setFieldsValue({ initialStocks: currentStocks });
                        }
                    }

                    if (changedItem.purchasePrice !== undefined) {
                        const purchasePrice = changedItem.purchasePrice;
                        if (sellingPrice && sellingPrice > 0) {
                            const newDiscount = (1 - purchasePrice / sellingPrice) * 100;
                            currentItem.discount = Number(newDiscount.toFixed(2));
                            form.setFieldsValue({ initialStocks: currentStocks });
                        }
                    }
                }
            }

            if (changedValues.sellingPrice !== undefined) {
                const currentStocks = allValues.initialStocks.map((stock: any) => {
                    if (stock && stock.discount !== undefined && stock.discount !== null) {
                        const newPurchasePrice = sellingPrice * (1 - stock.discount / 100);
                        return { ...stock, purchasePrice: Number(newPurchasePrice.toFixed(2)) };
                    }
                    return stock;
                });
                form.setFieldsValue({ initialStocks: currentStocks });
            }
        }
    };

    return (
        <Form
            form={form}
            layout="vertical"
            onFinish={handleFinish}
            onValuesChange={handleValuesChange}
            initialValues={{
                isActive: true,
                lowStockThreshold: 10,
                baseUnit: 'علبة',
            }}
            style={{ paddingBottom: isMobile ? 80 : 0 }} // Pad bottom for sticky footer on mobile
        >
            <Card size={isMobile ? 'small' : 'medium'} style={{ marginBottom: 24, border: '2px solid #1890ff', backgroundColor: '#e6f7ff' }}>
                <Flex justify="space-between" align="flex-start" style={{ marginBottom: 20 }}>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                        <BarcodeOutlined style={{ fontSize: 36, color: '#1890ff', marginBottom: 12 }} />
                        <Title level={isMobile ? 5 : 4} style={{ margin: 0 }}>المسح الضوئي للباركود والبحث</Title>
                        <Text type="secondary" style={{ fontSize: isMobile ? '12px' : '14px' }}>
                            امسح الباركود للبحث عن منتج أو ابحث بالاسم
                        </Text>
                    </div>
                    {(mode === 'edit' || searchSource) && (
                        <Button
                            type={isLocked ? "primary" : "default"}
                            danger={!isLocked}
                            icon={isLocked ? <LockOutlined /> : <UnlockOutlined />}
                            onClick={() => setIsLocked(!isLocked)}
                            size={isMobile ? 'small' : 'middle'}
                            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
                        >
                            {isMobile ? (isLocked ? "فتح" : "قفل") : (isLocked ? "فتح التعديل" : "قفل البيانات")}
                        </Button>
                    )}
                </Flex>

                <Row justify="center" gutter={[16, 0]}>
                    <Col xs={24} md={10}>
                        <Form.Item name="barcode" label="الباركود (سكان)" style={{ marginBottom: 12 }}>
                            <Input
                                size="large"
                                autoFocus={!isMobile} // AutoFocus on mobile opens keyboard annoyingly
                                prefix={<BarcodeOutlined style={{ color: '#bfbfbf' }} />}
                                onPressEnter={(e) => handleBarcodeSearch(e)}
                                placeholder="امسح الباركود هنا..."
                                disabled={isSearching || (mode === 'edit' && searchSource === 'barcode')}
                                style={{ textAlign: 'center', fontSize: '18px' }}
                                allowClear
                            />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={10}>
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
                                styles={{ popup: { root: { width: '100%', maxWidth: '90vw' } } }}
                                prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                            />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={4} style={{ display: 'flex', alignItems: 'center', paddingBottom: 12 }}>
                        <Button
                            danger
                            icon={<DeleteOutlined />}
                            onClick={handleReset}
                            size="large"
                            block
                            title="إعادة ضبط وبحث جديد"
                        >
                            {isMobile && "مسح وبحث جديد"}
                        </Button>
                    </Col>
                </Row>
                <div style={{ textAlign: 'center', marginTop: 12 }}>
                    <BarcodeScanner
                        onScan={(text) => {
                            form.setFieldsValue({ barcode: text });
                            message.success('تم مسح الباركود بنجاح. اضغط Enter للبحث.');
                        }}
                        buttonProps={{ size: 'large', type: 'dashed' }}
                    />
                </div>
            </Card>

            <Card title="البيانات الأساسية" size={isMobile ? 'small' : 'medium'} style={{ marginBottom: 16 }}>
                <fieldset disabled={isLocked} style={{ border: 'none', padding: 0, margin: 0 }}>
                    <Row gutter={16}>
                        <Col xs={24} md={12}>
                            <Form.Item name="nameAr" label={ar.products.nameAr} rules={[{ required: true, message: 'مطلوب إدخال الاسم بالعربية' }]}>
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item name="nameEn" label={ar.products.nameEn}>
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                            <Form.Item name="barcode2" label={ar.products.barcode2}>
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                            <Form.Item name="category" label={ar.products.category}>
                                <Input />
                            </Form.Item>
                        </Col>
                    </Row>
                </fieldset>
            </Card>

            <Card title="تفاصيل التسعير والوحدات" size={isMobile ? 'small' : 'medium'} style={{ marginBottom: 16 }}>
                <fieldset disabled={isLocked} style={{ border: 'none', padding: 0, margin: 0 }}>
                    <Row gutter={16}>
                        <Col xs={24} sm={12} md={8}>
                            <Form.Item label={ar.products.sellingPrice} required>
                                <Space.Compact style={{ width: '100%' }}>
                                    <Form.Item name="sellingPrice" noStyle rules={[{ required: true, message: 'مطلوب إدخال سعر البيع' }]}>
                                        <InputNumber min={0} step={0.25} style={{ width: '100%' }} />
                                    </Form.Item>
                                    <div style={{
                                        padding: '0 11px',
                                        backgroundColor: '#f5f5f5',
                                        border: '1px solid #d9d9d9',
                                        borderInlineStart: 0, // RTL Safe
                                        display: 'flex',
                                        alignItems: 'center',
                                        borderRadius: '6px 0 0 6px', // RTL Safe border radius
                                        whiteSpace: 'nowrap',
                                        color: 'rgba(0, 0, 0, 0.45)'
                                    }}>
                                        ج.م
                                    </div>
                                </Space.Compact>
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={8}>
                            <Form.Item name="baseUnit" label={ar.products.baseUnit} rules={[{ required: true, message: 'مطلوب إدخال الوحدة الأساسية' }]}>
                                <Select
                                    placeholder="اختر الوحدة"
                                    allowClear
                                    showSearch
                                    optionFilterProp="label"
                                    loading={isLoadingUnits}
                                    options={(unitsData?.data?.base_units || []).map((u: any) => ({ value: u.nameAr, label: u.nameAr }))}
                                />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={8}>
                            <Form.Item name="subUnit" label={ar.products.subUnit}>
                                <Select
                                    placeholder="اختر وحدة فرعية"
                                    allowClear
                                    showSearch
                                    optionFilterProp="label"
                                    loading={isLoadingUnits}
                                    options={(unitsData?.data?.sub_units || []).map((u: any) => ({ value: u.nameAr, label: u.nameAr }))}
                                />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={8}>
                            <Form.Item name="subUnitConversionFactor" label={ar.products.conversionFactor}>
                                <InputNumber min={1} style={{ width: '100%' }} placeholder="كم وحدة فرعية في الأساسية؟" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={8}>
                            <Form.Item name="lowStockThreshold" label={ar.products.lowStockThreshold}>
                                <InputNumber min={0} style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                    </Row>
                </fieldset>
            </Card>

            <Card title="البيانات الطبية والإضافية" size={isMobile ? 'small' : 'medium'} style={{ marginBottom: 16 }}>
                <fieldset disabled={isLocked} style={{ border: 'none', padding: 0, margin: 0 }}>
                    <Row gutter={16}>
                        <Col xs={24} sm={12} md={8}>
                            <Form.Item name="brand" label={ar.products.brand}>
                                <Select
                                    placeholder="اختر الماركة التجارية"
                                    allowClear
                                    showSearch
                                    optionFilterProp="label"
                                    loading={isLoadingBrands}
                                    options={(brandsData?.data || []).map((b: any) => ({ value: b._id, label: b.nameEn || b.nameAr }))}
                                />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={8}>
                            <Form.Item name="manufacturer" label={ar.products.manufacturer}>
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={8}>
                            <Form.Item name="activeIngredient" label={ar.products.activeIngredient}>
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={8}>
                            <Form.Item name="dosageForm" label={ar.products.dosageForm}>
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={12}>
                            <Form.Item name="pharmacology" label={ar.products.pharmacology}>
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={12}>
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
                </fieldset>
            </Card>

            {(mode === 'create' || searchSource) && (
                <Card
                    size={isMobile ? 'small' : 'medium'}
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
                        <Form.List name="initialStocks" initialValue={[{ location: 'floor', quantity: 1 }]}>
                            {(fields, { add, remove }) => (
                                <>
                                    {fields.map(({ key, name, ...restField }) => (
                                        <div key={key} style={{ 
                                            marginBottom: 16, 
                                            padding: isMobile ? '24px 12px 12px 12px' : 16, // Extra top padding on mobile for the delete button
                                            backgroundColor: '#f9f9f9', 
                                            borderRadius: 8, 
                                            border: '1px solid #f0f0f0', 
                                            position: 'relative' 
                                        }}>
                                            {fields.length > 1 && (
                                                <Button
                                                    type="text"
                                                    danger
                                                    icon={<DeleteOutlined />}
                                                    onClick={() => remove(name)}
                                                    style={{ position: 'absolute', top: 8, insetInlineEnd: 8, zIndex: 1 }} // RTL Safe Position
                                                />
                                            )}
                                            <Row gutter={16}>
                                                <Col xs={24} sm={12}>
                                                    <Form.Item {...restField} name={[name, 'batchNumber']} label={ar.initialStock.batchNumber} rules={[{ required: true, message: 'رقم التشغيلة مطلوب' }]}>
                                                        <Input placeholder="مثال: Shelf-1" />
                                                    </Form.Item>
                                                </Col>
                                                <Col xs={24} sm={12}>
                                                    <Form.Item {...restField} name={[name, 'expirationDate']} label={ar.initialStock.expirationDate} rules={[{ required: true, message: 'تاريخ الانتهاء مطلوب' }]}>
                                                        <DatePicker picker="month" format="YYYY-MM" style={{ width: '100%' }} />
                                                    </Form.Item>
                                                </Col>
                                                <Col xs={12} sm={6}>
                                                    <Form.Item {...restField} name={[name, 'quantity']} label={ar.initialStock.quantity} rules={[{ required: true, message: 'مطلوبة' }]}>
                                                        <InputNumber min={1} style={{ width: '100%' }} />
                                                    </Form.Item>
                                                </Col>
                                                <Col xs={12} sm={6}>
                                                    <Form.Item {...restField} name={[name, 'discount']} label="خصم %">
                                                        <InputNumber min={0} max={100} step={0.1} style={{ width: '100%' }} suffix="%" placeholder="%" />
                                                    </Form.Item>
                                                </Col>
                                                <Col xs={24} sm={12}>
                                                    <Form.Item {...restField} name={[name, 'purchasePrice']} label={ar.initialStock.purchasePrice} rules={[{ required: true, message: 'سعر الشراء مطلوب' }]}>
                                                        <InputNumber min={0} step={0.25} style={{ width: '100%' }} suffix="ج.م" />
                                                    </Form.Item>
                                                </Col>
                                                <Col xs={24} sm={12}>
                                                    <Form.Item {...restField} name={[name, 'location']} label={ar.initialStock.location} initialValue="floor">
                                                        <Radio.Group style={{ width: '100%', display: 'flex', gap: '8px' }}>
                                                            <Radio.Button value="floor" style={{ flex: 1, textAlign: 'center' }}>{ar.initialStock.floor}</Radio.Button>
                                                            <Radio.Button value="warehouse" style={{ flex: 1, textAlign: 'center' }}>{ar.initialStock.warehouse}</Radio.Button>
                                                        </Radio.Group>
                                                    </Form.Item>
                                                </Col>
                                                <Col xs={24}>
                                                    <Form.Item {...restField} name={[name, 'notes']} label={ar.initialStock.notes} style={{ marginBottom: 0 }}>
                                                        <Input.TextArea rows={1} />
                                                    </Form.Item>
                                                </Col>
                                            </Row>
                                        </div>
                                    ))}
                                    <Button type="dashed" onClick={() => add({ location: 'floor', quantity: 1, batchNumber: '' })} block icon={<PlusOutlined />}>
                                        إضافة تشغيلة أخرى
                                    </Button>
                                </>
                            )}
                        </Form.List>
                    )}
                </Card>
            )}

            <Card size="small" style={{ marginBottom: isMobile ? 0 : 24 }}>
                <Flex justify="space-between" align="center">
                    <Text strong>حالة المنتج:</Text>
                    <Form.Item name="isActive" valuePropName="checked" style={{ margin: 0 }}>
                        <Switch checkedChildren="نشط" unCheckedChildren="غير نشط" />
                    </Form.Item>
                </Flex>
            </Card>

            {/* Sticky Action Footer for Mobile UX */}
            <div style={isMobile ? {
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '12px 16px',
                background: '#fff',
                borderTop: '1px solid #f0f0f0',
                boxShadow: '0 -2px 10px rgba(0,0,0,0.05)',
                zIndex: 1000
            } : { marginTop: 24 }}>
                <Button 
                    type="primary" 
                    htmlType="submit" 
                    icon={<SaveOutlined />} 
                    loading={isSubmitting} 
                    block 
                    size="large"
                >
                    {mode === 'edit' ? 'حفظ التعديلات' : ar.actions.save}
                </Button>
            </div>
        </Form>
    );
}