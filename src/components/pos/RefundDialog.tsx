'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    Button,
    Divider,
    Empty,
    Input,
    InputNumber,
    Popconfirm,
    Segmented,
    Select,
    Typography,
    Image,
    Space,
    App,
    Card,
    Row,
    Col,
} from 'antd';
import {
    DeleteOutlined,
    PlusOutlined,
    SearchOutlined,
    StopOutlined,
    UndoOutlined,
    PictureOutlined,
    BarcodeOutlined,
    QrcodeOutlined,
    ShoppingCartOutlined,
} from '@ant-design/icons';
import type { ProductSearchResult } from '@/lib/types';
import { formatEGP } from '@/utils/money';
import MobileFormWrapper from '../common/MobileFormWrapper';
import ResponsiveDataView from '../common/ResponsiveDataView';
import ar from '@/i18n/ar';

const { Title, Text } = Typography;

interface RefundDialogProps {
    open: boolean;
    onClose: () => void;
}

interface InvoiceLookupItem {
    saleItemId: string;
    productId: string;
    productNameAr: string;
    productNameEn?: string;
    imageUrl?: string;
    quantity: number;
    refundedQuantity: number;
    refundableQuantity: number;
    unitPrice: number;
    subtotal: number;
    unitSold: 'base' | 'sub';
    displayQuantity: number;
}

interface InvoiceLookupResult {
    _id: string;
    invoiceNumber: string;
    status: 'completed' | 'cancelled';
    total: number;
    paidAmount: number;
    remainingBalance: number;
    paymentMode: 'cash' | 'credit' | 'partial';
    createdAt: string;
    customerId: string | null;
    customerName: string | null;
    items: InvoiceLookupItem[];
}

interface CustomerOption {
    _id: string;
    name: string;
}

interface StandaloneRefundItem {
    id: string;
    productId?: string;
    productName?: string;
    productNameEn?: string;
    imageUrl?: string;
    quantity: number;
    unitPrice: number;
}

function createStandaloneItem(): StandaloneRefundItem {
    return {
        id: Math.random().toString(36).slice(2),
        quantity: 1,
        unitPrice: 0,
    };
}

export default function RefundDialog({ open, onClose }: RefundDialogProps) {
    const { message } = App.useApp();
    const [mode, setMode] = useState<'invoice' | 'standalone'>('invoice');
    const [invoiceReference, setInvoiceReference] = useState('');
    const [invoiceData, setInvoiceData] = useState<InvoiceLookupResult | null>(null);
    const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});
    const [standaloneItems, setStandaloneItems] = useState<StandaloneRefundItem[]>([
        createStandaloneItem(),
    ]);
    const [productOptions, setProductOptions] = useState<ProductSearchResult[]>([]);
    const [customerOptions, setCustomerOptions] = useState<CustomerOption[]>([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>();
    const [searchingInvoice, setSearchingInvoice] = useState(false);
    const [submittingRefund, setSubmittingRefund] = useState(false);
    const [cancellingSale, setCancellingSale] = useState(false);
    const [searchingProducts, setSearchingProducts] = useState(false);

    useEffect(() => {
        if (!open) {
            return;
        }

        const loadCustomers = async () => {
            try {
                const response = await fetch('/api/customers?page=1&limit=100');
                if (!response.ok) {
                    return;
                }

                const payload = await response.json();
                setCustomerOptions(payload.data ?? []);
            } catch {
                setCustomerOptions([]);
            }
        };

        void loadCustomers();
    }, [open]);

    const resetState = () => {
        setMode('invoice');
        setInvoiceReference('');
        setInvoiceData(null);
        setSelectedQuantities({});
        setStandaloneItems([createStandaloneItem()]);
        setProductOptions([]);
        setSelectedCustomerId(undefined);
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const handleInvoiceLookup = async () => {
        if (!invoiceReference.trim()) {
            message.error('أدخل رقم الفاتورة أو معرفها');
            return;
        }

        setSearchingInvoice(true);

        try {
            const response = await fetch(
                `/api/pos/cancel/${encodeURIComponent(invoiceReference.trim())}`
            );
            const payload = await response.json();

            if (!response.ok) {
                throw new Error(payload.error?.message || 'تعذر العثور على الفاتورة');
            }

            setInvoiceData(payload.data);
            setSelectedQuantities(
                Object.fromEntries(
                    (payload.data.items as InvoiceLookupItem[]).map((item) => [item.saleItemId, 0])
                )
            );
        } catch (error) {
            const messageText =
                error instanceof Error ? error.message : 'تعذر العثور على الفاتورة';
            message.error(messageText);
            setInvoiceData(null);
            setSelectedQuantities({});
        } finally {
            setSearchingInvoice(false);
        }
    };

    const handleProductSearch = async (query: string) => {
        if (query.trim().length < 2) {
            setProductOptions([]);
            return;
        }

        setSearchingProducts(true);

        try {
            const response = await fetch('/api/pos/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, type: 'text' }),
            });

            if (!response.ok) {
                throw new Error();
            }

            const payload = await response.json();
            setProductOptions(payload);
        } catch {
            setProductOptions([]);
        } finally {
            setSearchingProducts(false);
        }
    };

    const updateStandaloneItem = (
        itemId: string,
        updates: Partial<StandaloneRefundItem>
    ) => {
        setStandaloneItems((items) =>
            items.map((item) => (item.id === itemId ? { ...item, ...updates } : item))
        );
    };

    const linkedRefundTotal = useMemo(() => {
        if (!invoiceData) {
            return 0;
        }

        return invoiceData.items.reduce((sum, item) => {
            const quantity = selectedQuantities[item.saleItemId] || 0;
            if (quantity <= 0) {
                return sum;
            }

            return sum + Math.round((item.subtotal / item.quantity) * quantity);
        }, 0);
    }, [invoiceData, selectedQuantities]);

    const standaloneRefundTotal = useMemo(
        () =>
            standaloneItems.reduce(
                (sum, item) => sum + Math.round(item.quantity * item.unitPrice * 100),
                0
            ),
        [standaloneItems]
    );

    const submitRefund = async () => {
        setSubmittingRefund(true);

        try {
            const payload =
                mode === 'invoice'
                    ? {
                        originalInvoiceId: invoiceData?._id,
                        items:
                            invoiceData?.items
                                .filter((item) => (selectedQuantities[item.saleItemId] || 0) > 0)
                                .map((item) => ({
                                    productId: item.productId,
                                    quantity: selectedQuantities[item.saleItemId],
                                })) ?? [],
                    }
                    : {
                        customerId: selectedCustomerId,
                        items: standaloneItems.map((item) => ({
                            productId: item.productId,
                            quantity: item.quantity,
                            unitPrice: Math.round(item.unitPrice * 100),
                        })),
                    };

            if (payload.items.length === 0) {
                throw new Error('حدد صنفاً واحداً على الأقل لإتمام المرتجع');
            }

            if (
                mode === 'standalone' &&
                payload.items.some((item) => !item.productId || item.quantity <= 0)
            ) {
                throw new Error('أكمل بيانات الأصناف اليدوية قبل الحفظ');
            }

            const response = await fetch('/api/refunds', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error?.message || 'تعذر إنشاء المرتجع');
            }

            message.success('تم حفظ المرتجع بنجاح');
            handleClose();
        } catch (error) {
            const messageText =
                error instanceof Error ? error.message : 'تعذر إنشاء المرتجع';
            message.error(messageText);
        } finally {
            setSubmittingRefund(false);
        }
    };

    const cancelSale = async () => {
        if (!invoiceData) {
            return;
        }

        setCancellingSale(true);

        try {
            const response = await fetch(
                `/api/pos/cancel/${encodeURIComponent(invoiceData._id)}`,
                { method: 'POST' }
            );
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error?.message || 'تعذر إلغاء الفاتورة');
            }

            message.success('تم إلغاء الفاتورة واسترجاع المخزون');
            handleClose();
        } catch (error) {
            const messageText =
                error instanceof Error ? error.message : 'تعذر إلغاء الفاتورة';
            message.error(messageText);
        } finally {
            setCancellingSale(false);
        }
    };

    const invoiceColumns = [
        {
            title: 'الصنف',
            key: 'productNameAr',
            render: (_: any, record: InvoiceLookupItem) => (
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div>
                        {record.imageUrl ? (
                            <Image
                                src={record.imageUrl}
                                alt={record.productNameAr}
                                width={40}
                                height={40}
                                style={{ objectFit: 'cover', borderRadius: 4 }}
                                fallback="https://via.placeholder.com/40?text=No+Image"
                            />
                        ) : (
                            <div style={{ width: 40, height: 40, backgroundColor: '#f5f5f5', display: 'flex', justifyContent: 'center', alignItems: 'center', borderRadius: 4 }}>
                                <PictureOutlined style={{ fontSize: 16, color: '#d9d9d9' }} />
                            </div>
                        )}
                    </div>
                    <div>
                        <div>{record.productNameAr}</div>
                        {record.productNameEn && (
                            <div style={{ color: '#8c8c8c', fontSize: '12px' }}>{record.productNameEn}</div>
                        )}
                    </div>
                </div>
            ),
        },
        {
            title: 'المباع',
            key: 'sold',
            render: (_: unknown, item: InvoiceLookupItem) =>
                `${item.quantity} (${item.unitSold === 'sub' ? 'فرعي' : 'أساسي'})`,
        },
        {
            title: 'سبق إرجاعه',
            dataIndex: 'refundedQuantity',
            key: 'refundedQuantity',
        },
        {
            title: 'المتاح للإرجاع',
            dataIndex: 'refundableQuantity',
            key: 'refundableQuantity',
        },
        {
            title: 'كمية المرتجع',
            key: 'quantity',
            render: (_: unknown, item: InvoiceLookupItem) => (
                <InputNumber
                    min={0}
                    max={item.refundableQuantity}
                    value={selectedQuantities[item.saleItemId] ?? 0}
                    disabled={item.refundableQuantity === 0 || invoiceData?.status === 'cancelled'}
                    onChange={(value) =>
                        setSelectedQuantities((current) => ({
                            ...current,
                            [item.saleItemId]: Number(value ?? 0),
                        }))
                    }
                />
            ),
        },
    ];

    const renderInvoiceCard = (item: InvoiceLookupItem) => (
        <Card size="small" style={{ marginBottom: 12, borderRadius: 12 }}>
            <Row align="middle" style={{ marginBottom: 12 }}>
                <Col flex="48px">
                    {item.imageUrl ? (
                        <Image
                            src={item.imageUrl}
                            alt={item.productNameAr}
                            width={48}
                            height={48}
                            style={{ objectFit: 'cover', borderRadius: 8 }}
                            fallback="https://via.placeholder.com/48?text=No+Image"
                        />
                    ) : (
                        <div style={{ width: 48, height: 48, backgroundColor: '#f5f5f5', display: 'flex', justifyContent: 'center', alignItems: 'center', borderRadius: 8 }}>
                            <PictureOutlined style={{ fontSize: 20, color: '#d9d9d9' }} />
                        </div>
                    )}
                </Col>
                <Col flex="auto" style={{ paddingLeft: 12, paddingRight: 12 }}>
                    <Text strong style={{ fontSize: 16 }}>{item.productNameAr}</Text>
                    {item.productNameEn && <><br /><Text type="secondary" style={{ fontSize: 12 }}>{item.productNameEn}</Text></>}
                </Col>
            </Row>

            <Row gutter={[8, 8]} style={{ marginBottom: 8 }}>
                <Col span={12}>
                    <Text type="secondary" style={{ fontSize: 12 }}>المباع:</Text><br />
                    <Text strong>{item.quantity} ({item.unitSold === 'sub' ? 'فرعي' : 'أساسي'})</Text>
                </Col>
                <Col span={12}>
                    <Text type="secondary" style={{ fontSize: 12 }}>المتاح للإرجاع:</Text><br />
                    <Text strong type={item.refundableQuantity > 0 ? 'success' : 'secondary'}>{item.refundableQuantity}</Text>
                </Col>
            </Row>

            <div style={{ background: '#f5f5f5', padding: 8, borderRadius: 8 }}>
                <Row align="middle" justify="space-between">
                    <Col>
                        <Text strong>كمية الإرجاع</Text>
                    </Col>
                    <Col>
                        <InputNumber
                            min={0}
                            max={item.refundableQuantity}
                            value={selectedQuantities[item.saleItemId] ?? 0}
                            disabled={item.refundableQuantity === 0 || invoiceData?.status === 'cancelled'}
                            onChange={(value) =>
                                setSelectedQuantities((current) => ({
                                    ...current,
                                    [item.saleItemId]: Number(value ?? 0),
                                }))
                            }
                        />
                    </Col>
                </Row>
            </div>
        </Card>
    );

    return (
        <MobileFormWrapper
            title="إرجاع وإلغاء المبيعات"
            open={open}
            onClose={handleClose}
            width={960}
            footer={
                <Row gutter={16}>
                    <Col span={12}>
                        <Button key="close" block size="large" onClick={handleClose}>
                            إغلاق
                        </Button>
                    </Col>
                    <Col span={12}>
                        <Button
                            key="submit"
                            type="primary"
                            icon={<UndoOutlined />}
                            loading={submittingRefund}
                            onClick={() => void submitRefund()}
                            block
                            size="large"
                        >
                            حفظ المرتجع
                        </Button>
                    </Col>
                </Row>
            }
        >
            <Space orientation="vertical" size="large" style={{ width: '100%', paddingBottom: 24 }}>
                <Segmented
                    block
                    value={mode}
                    options={[
                        { label: 'مرتجع مرتبط بفاتورة', value: 'invoice' },
                        { label: 'مرتجع يدوي', value: 'standalone' },
                    ]}
                    onChange={(value) => setMode(value as 'invoice' | 'standalone')}
                />

                {mode === 'invoice' ? (
                    <>
                        <Space.Compact style={{ width: '100%' }}>
                            <Input
                                size="large"
                                placeholder="رقم الفاتورة أو المعرف"
                                prefix={<SearchOutlined />}
                                value={invoiceReference}
                                onChange={(event) => setInvoiceReference(event.target.value)}
                                onPressEnter={() => void handleInvoiceLookup()}
                            />
                            <Button
                                size="large"
                                type="primary"
                                loading={searchingInvoice}
                                onClick={() => void handleInvoiceLookup()}
                            >
                                بحث
                            </Button>
                        </Space.Compact>

                        {invoiceData ? (
                            <>
                                <Card size="small" style={{ background: '#fafafa', borderRadius: 8 }}>
                                    <Space orientation="vertical" size={4} style={{ width: '100%' }}>
                                        <Text strong style={{ fontSize: 16 }}>
                                            الفاتورة: {invoiceData.invoiceNumber}
                                        </Text>
                                        <Text>
                                            العميل: <Text strong>{invoiceData.customerName || 'غير محدد'}</Text>
                                        </Text>
                                        <Text type={invoiceData.status === 'cancelled' ? 'danger' : 'secondary'}>
                                            الحالة: {invoiceData.status === 'cancelled' ? 'ملغاة' : 'مكتملة'}
                                        </Text>
                                        <Divider style={{ margin: '8px 0' }} />
                                        <Row justify="space-between">
                                            <Col>
                                                <Text type="secondary">الإجمالي</Text><br />
                                                <Text strong>{formatEGP(invoiceData.total)}</Text>
                                            </Col>
                                            <Col>
                                                <Text type="secondary">المدفوع</Text><br />
                                                <Text strong>{formatEGP(invoiceData.paidAmount)}</Text>
                                            </Col>
                                            <Col>
                                                <Text type="secondary">المتبقي</Text><br />
                                                <Text strong type={invoiceData.remainingBalance > 0 ? "danger" : "success"}>
                                                    {formatEGP(invoiceData.remainingBalance)}
                                                </Text>
                                            </Col>
                                        </Row>
                                    </Space>
                                </Card>

                                <ResponsiveDataView
                                    data={invoiceData.items}
                                    rowKey="saleItemId"
                                    tableColumns={invoiceColumns}
                                    renderCard={renderInvoiceCard}
                                    pagination={false}
                                    tableProps={{
                                        locale: { emptyText: ar.actions.noData }
                                    }}
                                />

                                <Space
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        width: '100%',
                                        flexWrap: 'wrap',
                                        gap: 16,
                                        alignItems: 'center',
                                        paddingTop: 16,
                                        borderTop: '1px solid #f0f0f0'
                                    }}
                                >
                                    <Popconfirm
                                        title="إلغاء الفاتورة بالكامل؟"
                                        description="سيتم استرجاع كل المخزون وإلغاء الأثر المالي للفاتورة."
                                        okText="تأكيد الإلغاء"
                                        cancelText="تراجع"
                                        onConfirm={() => void cancelSale()}
                                    >
                                        <Button
                                            danger
                                            icon={<StopOutlined />}
                                            loading={cancellingSale}
                                            disabled={invoiceData.status === 'cancelled'}
                                        >
                                            إلغاء الفاتورة بالكامل
                                        </Button>
                                    </Popconfirm>

                                    <Row align="middle" gutter={16}>
                                        <Col><Text style={{ fontSize: 16 }}>إجمالي المرتجع:</Text></Col>
                                        <Col><Text strong style={{ fontSize: 20, color: '#1677ff' }}>{formatEGP(linkedRefundTotal)}</Text></Col>
                                    </Row>
                                </Space>
                            </>
                        ) : (
                            <Empty description="ابحث عن فاتورة لبدء الإرجاع أو الإلغاء" style={{ marginTop: 40 }} />
                        )}
                    </>
                ) : (
                    <>
                        <Card size="small" style={{ borderRadius: 8 }}>
                            <Select
                                size="large"
                                allowClear
                                showSearch
                                placeholder="عميل المرتجع (اختياري)"
                                value={selectedCustomerId}
                                onChange={(value) => setSelectedCustomerId(value)}
                                options={customerOptions.map((customer) => ({
                                    value: customer._id,
                                    label: customer.name,
                                }))}
                                style={{ width: '100%', marginBottom: 16 }}
                                filterOption={(input, option) =>
                                    String(option?.label ?? '')
                                        .toLowerCase()
                                        .includes(input.toLowerCase())
                                }
                            />

                            <Space orientation="vertical" style={{ width: '100%' }} size="middle">
                                {standaloneItems.map((item, index) => (
                                    <Card key={item.id} size="small" style={{ background: '#fcfcfc', borderRadius: 8 }}>
                                        <Space orientation="vertical" style={{ width: '100%' }} size="small">
                                            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                                                <Text strong>صنف {index + 1}</Text>
                                                <Button
                                                    danger
                                                    type="text"
                                                    icon={<DeleteOutlined />}
                                                    disabled={standaloneItems.length === 1}
                                                    onClick={() =>
                                                        setStandaloneItems((items) =>
                                                            items.filter((current) => current.id !== item.id)
                                                        )
                                                    }
                                                />
                                            </Space>
                                            <Select
                                                size="large"
                                                showSearch
                                                style={{ width: '100%' }}
                                                placeholder="اختر الصنف"
                                                value={item.productId}
                                                loading={searchingProducts}
                                                filterOption={false}
                                                onSearch={(value) => void handleProductSearch(value)}
                                                onChange={(value) => {
                                                    const selectedProduct = productOptions.find(
                                                        (product) => product._id === value
                                                    );

                                                    updateStandaloneItem(item.id, {
                                                        productId: value,
                                                        productName: selectedProduct?.nameAr ?? '',
                                                        productNameEn: selectedProduct?.nameEn ?? '',
                                                        imageUrl: selectedProduct?.imageUrl,
                                                        unitPrice:
                                                            (selectedProduct?.sellingPrice ?? 0) / 100,
                                                    });
                                                }}
                                                options={productOptions.map((product) => ({
                                                    value: product._id,
                                                    label: (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            {product.imageUrl ? (
                                                                <Image
                                                                    src={product.imageUrl}
                                                                    alt={product.nameAr}
                                                                    width={24}
                                                                    height={24}
                                                                    style={{ objectFit: 'cover', borderRadius: 2 }}
                                                                    preview={false}
                                                                    fallback="https://via.placeholder.com/24?text=NA"
                                                                />
                                                            ) : (
                                                                <PictureOutlined style={{ color: '#d9d9d9' }} />
                                                            )}
                                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                <Text>{product.nameAr}</Text>
                                                                {product.nameEn && <Text type="secondary" style={{ fontSize: 11 }}>{product.nameEn}</Text>}
                                                            </div>
                                                        </div>
                                                    ),
                                                    sellingPrice: product.sellingPrice,
                                                }))}
                                            />

                                            <Row gutter={8}>
                                                <Col span={12}>
                                                    <InputNumber
                                                        size="large"
                                                        min={1}
                                                        value={item.quantity}
                                                        onChange={(value) =>
                                                            updateStandaloneItem(item.id, {
                                                                quantity: Number(value ?? 1),
                                                            })
                                                        }
                                                        placeholder="الكمية"
                                                        style={{ width: '100%' }}
                                                    />
                                                </Col>
                                                <Col span={12}>
                                                    <InputNumber
                                                        size="large"
                                                        min={0}
                                                        value={item.unitPrice}
                                                        addonAfter="ج.م"
                                                        onChange={(value) =>
                                                            updateStandaloneItem(item.id, {
                                                                unitPrice: Number(value ?? 0),
                                                            })
                                                        }
                                                        placeholder="سعر الوحدة"
                                                        style={{ width: '100%' }}
                                                    />
                                                </Col>
                                            </Row>
                                        </Space>
                                    </Card>
                                ))}
                            </Space>

                            <Button
                                type="dashed"
                                block
                                size="large"
                                style={{ marginTop: 16 }}
                                icon={<PlusOutlined />}
                                onClick={() =>
                                    setStandaloneItems((items) => [...items, createStandaloneItem()])
                                }
                            >
                                إضافة صنف آخر
                            </Button>
                        </Card>

                        <div style={{ paddingTop: 16, borderTop: '1px solid #f0f0f0', marginTop: 16 }}>
                            <Row justify="space-between" align="middle">
                                <Col><Text style={{ fontSize: 16 }}>إجمالي المرتجع:</Text></Col>
                                <Col><Text strong style={{ fontSize: 24, color: '#1677ff' }}>{formatEGP(standaloneRefundTotal)}</Text></Col>
                            </Row>
                        </div>
                    </>
                )}
            </Space>
        </MobileFormWrapper>
    );
}
