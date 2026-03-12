'use client';

import {
    Form, Input, InputNumber, Switch, Button, Row, Col, Card,
    Space, Typography, App, Select, Divider, DatePicker, Radio,
    Grid, Flex, Tooltip, Badge, Collapse
} from 'antd';
import { useEffect, useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    SearchOutlined, BarcodeOutlined, InboxOutlined, LockOutlined,
    UnlockOutlined, PlusOutlined, DeleteOutlined, SaveOutlined,
    InfoCircleOutlined, MedicineBoxOutlined, DollarOutlined
} from '@ant-design/icons';
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

    // Fetch Brands
    const { data: brandsData, isLoading: isLoadingBrands } = useQuery({
        queryKey: ['brands-filter'],
        queryFn: async () => {
            const res = await fetch('/api/brands?all=true');
            if (!res.ok) throw new Error('Failed to fetch brands');
            return res.json() as Promise<{ data: any[] }>;
        },
    });

    // Fetch Units
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

    const handleBarcodeSearch = async (barcode: string) => {
        if (!barcode) return;
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
                    form.resetFields();
                    const brandId = typeof product.brand === 'object' && product.brand ? product.brand._id : product.brand;
                    form.setFieldsValue({
                        ...product,
                        barcode,
                        brand: brandId,
                        sellingPrice: product.sellingPrice ? toEGP(product.sellingPrice) : undefined,
                    });
                    if (onProductFound) onProductFound(product);
                } else {
                    message.success('منتج جديد. يمكنك إكمال باقي البيانات.');
                    setSearchSource(null);
                    form.setFieldsValue({ barcode });
                }
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleProductNameSearch = (value: string) => {
        if (searchTimer.current) clearTimeout(searchTimer.current);
        if (!value || value.length < 2) { setNameSearchOptions([]); return; }

        searchTimer.current = setTimeout(async () => {
            setIsSearching(true);
            try {
                const res = await fetch(`/api/products?search=${encodeURIComponent(value)}&allStatus=true&limit=10`);
                if (res.ok) {
                    const json = await res.json();
                    setNameSearchOptions(json.data.map((p: any) => ({
                        label: (
                            <Flex justify="space-between" align="center">
                                <Text strong>{p.nameAr}</Text>
                                <Text type="secondary">{p.nameEn || ''}</Text>
                            </Flex>
                        ),
                        value: p._id,
                        product: p,
                    })));
                }
            } catch (error) { console.error(error); } finally { setIsSearching(false); }
        }, 400);
    };

    const handleProductSelect = (id: string, option: any) => {
        const product = option.product;
        if (!product) return;

        message.info('تم تحميل بيانات المنتج للتمكين من التعديل');
        setSearchSource('name');
        setIsLocked(true);
        form.resetFields();
        const brandId = typeof product.brand === 'object' && product.brand ? product.brand._id : product.brand;
        form.setFieldsValue({
            ...product,
            brand: brandId,
            sellingPrice: product.sellingPrice ? toEGP(product.sellingPrice) : undefined,
        });
        if (onProductFound) onProductFound(product);
    };

    const handleValuesChange = (changedValues: any, allValues: any) => {
        const sellingPrice = allValues.sellingPrice;
        if (allValues.addInitialStock && allValues.initialStocks) {
            const changedStocks = changedValues.initialStocks;
            if (changedStocks) {
                const index = changedStocks.findIndex((s: any) => s !== undefined);
                if (index !== -1) {
                    const currentStocks = [...allValues.initialStocks];
                    const currentItem = currentStocks[index];
                    if (!currentItem) return;

                    if (changedStocks[index].discount !== undefined) {
                        currentItem.purchasePrice = Number((sellingPrice * (1 - changedStocks[index].discount / 100)).toFixed(2));
                    } else if (changedStocks[index].purchasePrice !== undefined) {
                        currentItem.discount = Number(((1 - changedStocks[index].purchasePrice / sellingPrice) * 100).toFixed(2));
                    }
                    form.setFieldsValue({ initialStocks: currentStocks });
                }
            }
        }
    };

    return (
        <Form
            form={form}
            layout="vertical"
            onFinish={handleFinish}
            onValuesChange={handleValuesChange}
            initialValues={{ isActive: true, lowStockThreshold: 10, baseUnit: 'علبة' }}
            style={{ paddingBottom: isMobile ? 100 : 40 }}
        >
            {/* --- Search & Header Card --- */}
            <Card
                size="small"
                style={{
                    marginBottom: 20,
                    borderRadius: 12,
                    border: '1px solid #91caff',
                    background: 'linear-gradient(180deg, #e6f7ff 0%, #ffffff 100%)'
                }}
            >
                <Flex vertical={isMobile} justify="space-between" align="center" gap={16}>
                    <div style={{ textAlign: isMobile ? 'center' : 'right' }}>
                        <Title level={isMobile ? 5 : 4} style={{ margin: 0 }}>
                            <BarcodeOutlined /> {mode === 'edit' ? 'تعديل منتج' : 'إضافة منتج جديد'}
                        </Title>
                        <Text type="secondary">استخدم الباركود أو الاسم للبحث</Text>
                    </div>

                    <Space>
                        <Button
                            type={isLocked ? "primary" : "dashed"}
                            danger={!isLocked}
                            icon={isLocked ? <LockOutlined /> : <UnlockOutlined />}
                            onClick={() => setIsLocked(!isLocked)}
                        >
                            {isLocked ? "فتح التعديل" : "قفل"}
                        </Button>
                        <Button danger icon={<DeleteOutlined />} onClick={handleReset} />
                    </Space>
                </Flex>

                <Divider style={{ margin: '12px 0' }} />

                <Row gutter={[12, 12]}>
                    <Col xs={24} md={12}>
                        <Select
                            showSearch
                            size="large"
                            placeholder="ابحث بالاسم..."
                            filterOption={false}
                            onSearch={handleProductNameSearch}
                            onSelect={(id, opt) => handleProductSelect(id, opt)}
                            options={nameSearchOptions}
                            loading={isSearching}
                            style={{ width: '100%' }}
                            suffixIcon={<SearchOutlined />}
                        />
                    </Col>
                    <Col xs={24} md={12}>
                        <Space.Compact style={{ width: '100%' }}>
                            <Input
                                size="large"
                                placeholder="مسح الباركود..."
                                prefix={<BarcodeOutlined />}
                                onPressEnter={(e) => handleBarcodeSearch(e.currentTarget.value)}
                            />
                            <BarcodeScanner
                                onScan={(text) => handleBarcodeSearch(text)}
                                buttonProps={{ size: 'large', type: 'primary' }}
                                buttonText=""
                            />
                        </Space.Compact>
                    </Col>
                </Row>
            </Card>

            {/* --- Basic Info --- */}
            <Card
                title={<Space><InfoCircleOutlined />{ar.products.title}</Space>}
                size="small"
                style={{ marginBottom: 16, borderRadius: 12 }}
            >
                <fieldset disabled={isLocked} style={{ border: 'none', padding: 0 }}>
                    <Row gutter={[16, 0]}>
                        <Col xs={24} md={8}>
                            <Form.Item name="barcode" label={ar.products.barcode}>
                                <Input size="large" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={8}>
                            <Form.Item name="nameAr" label={ar.products.nameAr} rules={[{ required: true }]}>
                                <Input size="large" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={8}>
                            <Form.Item name="nameEn" label={ar.products.nameEn}>
                                <Input size="large" />
                            </Form.Item>
                        </Col>
                    </Row>
                </fieldset>
            </Card>

            {/* --- Pricing & Units --- */}
            <Card
                title={<Space><DollarOutlined />التسعير والوحدات</Space>}
                size="small"
                style={{ marginBottom: 16, borderRadius: 12 }}
            >
                <fieldset disabled={isLocked} style={{ border: 'none', padding: 0 }}>
                    <Row gutter={[16, 0]}>
                        <Col xs={24} md={8}>
                            <Form.Item label={ar.products.sellingPrice} required>
                                <Space.Compact style={{ width: '100%' }}>
                                    <Form.Item name="sellingPrice" noStyle rules={[{ required: true }]}>
                                        <InputNumber size="large" style={{ width: '100%' }} step={0.25} />
                                    </Form.Item>
                                    <Button size="large" disabled style={{ background: '#f5f5f5', color: '#000' }}>ج.م</Button>
                                </Space.Compact>
                            </Form.Item>
                        </Col>
                        <Col xs={12} md={8}>
                            <Form.Item name="baseUnit" label={ar.products.baseUnit} rules={[{ required: true }]}>
                                <Select size="large" options={(unitsData?.data?.base_units || []).map((u: any) => ({ value: u.nameAr, label: u.nameAr }))} />
                            </Form.Item>
                        </Col>
                        <Col xs={12} md={8}>
                            <Form.Item name="subUnit" label={ar.products.subUnit}>
                                <Select size="large" options={(unitsData?.data?.sub_units || []).map((u: any) => ({ value: u.nameAr, label: u.nameAr }))} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item name="subUnitConversionFactor" label={ar.products.conversionFactor}>
                                <InputNumber size="large" style={{ width: '100%' }} placeholder="مثلاً: 10 أقراص في العلبة" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item name="lowStockThreshold" label={ar.products.lowStockThreshold}>
                                <InputNumber size="large" style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                    </Row>
                </fieldset>
            </Card>

            {/* --- Medical Details --- */}
            <Collapse
                items={[{
                    key: 'medical',
                    label: <Space><MedicineBoxOutlined />البيانات الطبية</Space>,
                    children: (
                        <fieldset disabled={isLocked} style={{ border: 'none', padding: 0 }}>
                            <Row gutter={[16, 0]}>
                                <Col xs={24} md={12}>
                                    <Form.Item name="brand" label={ar.products.brand}>
                                        <Select size="large" loading={isLoadingBrands} options={(brandsData?.data || []).map((b: any) => ({ value: b._id, label: b.nameEn || b.nameAr }))} />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} md={12}>
                                    <Form.Item name="activeIngredient" label={ar.products.activeIngredient}><Input size="large" /></Form.Item>
                                </Col>
                                <Col xs={24}><Form.Item name="uses" label={ar.products.uses}><Input.TextArea rows={2} /></Form.Item></Col>
                            </Row>
                        </fieldset>
                    )
                }]}
                defaultActiveKey={isMobile ? [] : ['medical']}
                style={{ marginBottom: 16, borderRadius: 12, background: '#fff', border: '1px solid #f0f0f0', overflow: 'hidden' }}
            />

            {/* --- Initial Stock --- */}
            {(mode === 'create' || searchSource) && (
                <Card
                    title={<Flex justify="space-between"><span><InboxOutlined /> {ar.initialStock.title}</span> <Form.Item name="addInitialStock" valuePropName="checked" noStyle><Switch size="small" /></Form.Item></Flex>}
                    size="small"
                    style={{ marginBottom: 16, borderRadius: 12, border: addInitialStock ? '1px solid #1890ff' : undefined }}
                >
                    {addInitialStock ? (
                        <Form.List name="initialStocks">
                            {(fields, { add, remove }) => (
                                <>
                                    {fields.map(({ key, name, ...restField }) => (
                                        <div key={key} style={{ background: '#f5f5f5', padding: 12, borderRadius: 8, marginBottom: 12, position: 'relative' }}>
                                            <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(name)} style={{ position: 'absolute', left: 4, top: 4 }} />
                                            <Row gutter={[12, 0]}>
                                                <Col xs={24} md={12}><Form.Item {...restField} name={[name, 'batchNumber']} label="التشغيلة" rules={[{ required: true }]}><Input /></Form.Item></Col>
                                                <Col xs={24} md={12}><Form.Item {...restField} name={[name, 'expirationDate']} label="الانتهاء" rules={[{ required: true }]}><DatePicker picker="month" style={{ width: '100%' }} /></Form.Item></Col>
                                                <Col xs={8} md={8}><Form.Item {...restField} name={[name, 'quantity']} label="الكمية"><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
                                                <Col xs={8} md={8}><Form.Item {...restField} name={[name, 'discount']} label="خصم%"><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
                                                <Col xs={8} md={8}><Form.Item {...restField} name={[name, 'purchasePrice']} label="سعر الشراء"><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
                                            </Row>
                                        </div>
                                    ))}
                                    <Button type="dashed" block icon={<PlusOutlined />} onClick={() => add({ location: 'floor', quantity: 1 })}>إضافة تشغيلة</Button>
                                </>
                            )}
                        </Form.List>
                    ) : <Text type="secondary" style={{ display: 'block', textAlign: 'center' }}>فعل الخيار لإضافة رصيد افتتاحي</Text>}
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
            {/* --- Sticky Footer --- */}
            <div style={isMobile ? { position: 'fixed', bottom: 0, left: 0, right: 0, padding: 16, background: '#fff', borderTop: '1px solid #f0f0f0', zIndex: 1000 } : { textAlign: 'left' }}>
                <Button type="primary" htmlType="submit" size="large" icon={<SaveOutlined />} loading={isSubmitting} block={isMobile}>
                    {mode === 'edit' ? 'حفظ التعديلات' : ar.actions.save}
                </Button>
            </div>
        </Form>
    );
}