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
    Grid,
    Flex,
} from 'antd';
import {
    DeleteOutlined,
    PlusOutlined,
    SearchOutlined,
    StopOutlined,
    UndoOutlined,
    PictureOutlined,
} from '@ant-design/icons';
import type { ProductSearchResult } from '@/lib/types';
import { formatEGP } from '@/utils/money';
import MobileFormWrapper from '../common/MobileFormWrapper';
import ResponsiveDataView from '../common/ResponsiveDataView';
import ar from '@/i18n/ar';
import { DataCard } from '../common/DataCard';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

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
    const screens = useBreakpoint();
    const [mounted, setMounted] = useState(false);

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
        setMounted(true);
    }, []);

    const isMobile = screens.xs || (screens.sm && !screens.md);

    useEffect(() => {
        if (!open) return;

        const loadCustomers = async () => {
            try {
                const response = await fetch('/api/customers?page=1&limit=100');
                if (!response.ok) return;

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
            const messageText = error instanceof Error ? error.message : 'تعذر العثور على الفاتورة';
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

            if (!response.ok) throw new Error();

            const payload = await response.json();
            setProductOptions(payload);
        } catch {
            setProductOptions([]);
        } finally {
            setSearchingProducts(false);
        }
    };

    const updateStandaloneItem = (itemId: string, updates: Partial<StandaloneRefundItem>) => {
        setStandaloneItems((items) =>
            items.map((item) => (item.id === itemId ? { ...item, ...updates } : item))
        );
    };

    const linkedRefundTotal = useMemo(() => {
        if (!invoiceData) return 0;

        return invoiceData.items.reduce((sum, item) => {
            const quantity = selectedQuantities[item.saleItemId] || 0;
            if (quantity <= 0) return sum;

            return sum + Math.round((item.subtotal / item.quantity) * quantity);
        }, 0);
    }, [invoiceData, selectedQuantities]);

    const standaloneRefundTotal = useMemo(
        () => standaloneItems.reduce((sum, item) => sum + Math.round(item.quantity * item.unitPrice * 100), 0),
        [standaloneItems]
    );

    const submitRefund = async () => {
        setSubmittingRefund(true);

        try {
            const payload =
                mode === 'invoice'
                    ? {
                        originalInvoiceId: invoiceData?._id,
                        items: invoiceData?.items
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

            if (mode === 'standalone' && payload.items.some((item) => !item.productId || item.quantity <= 0)) {
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
            const messageText = error instanceof Error ? error.message : 'تعذر إنشاء المرتجع';
            message.error(messageText);
        } finally {
            setSubmittingRefund(false);
        }
    };

    const cancelSale = async () => {
        if (!invoiceData) return;

        setCancellingSale(true);

        try {
            const response = await fetch(`/api/pos/cancel/${encodeURIComponent(invoiceData._id)}`, { method: 'POST' });
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error?.message || 'تعذر إلغاء الفاتورة');
            }

            message.success('تم إلغاء الفاتورة واسترجاع المخزون');
            handleClose();
        } catch (error) {
            const messageText = error instanceof Error ? error.message : 'تعذر إلغاء الفاتورة';
            message.error(messageText);
        } finally {
            setCancellingSale(false);
        }
    };

    // --- Invoice Table Columns (Desktop) ---
    const invoiceColumns = [
        {
            title: 'الصنف',
            key: 'productNameAr',
            render: (_: any, record: InvoiceLookupItem) => (
                <Flex gap={12} align="center">
                    <div style={{ flexShrink: 0 }}>
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
                        <div style={{ fontWeight: 500 }}>{record.productNameAr}</div>
                        {record.productNameEn && <div style={{ color: '#8c8c8c', fontSize: '12px' }}>{record.productNameEn}</div>}
                    </div>
                </Flex>
            ),
        },
        {
            title: 'المباع',
            key: 'sold',
            render: (_: unknown, item: InvoiceLookupItem) => `${item.quantity} (${item.unitSold === 'sub' ? 'فرعي' : 'أساسي'})`,
        },
        {
            title: 'المتاح للإرجاع',
            dataIndex: 'refundableQuantity',
            key: 'refundableQuantity',
            render: (qty: number) => <Text strong type={qty > 0 ? "success" : "secondary"}>{qty}</Text>
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

    // --- Invoice Card Layout (Mobile) ---
    const renderInvoiceCard = (item: InvoiceLookupItem) => {
        const titleContent = (
            <Flex gap={12} align="center">
                <div style={{ flexShrink: 0 }}>
                    {item.imageUrl ? (
                        <Image
                            src={item.imageUrl}
                            alt={item.productNameAr}
                            width={56}
                            height={56}
                            style={{ objectFit: 'cover', borderRadius: 8 }}
                            fallback="https://via.placeholder.com/56?text=No+Image"
                        />
                    ) : (
                        <div style={{ width: 56, height: 56, backgroundColor: '#f5f5f5', display: 'flex', justifyContent: 'center', alignItems: 'center', borderRadius: 8 }}>
                            <PictureOutlined style={{ fontSize: 24, color: '#d9d9d9' }} />
                        </div>
                    )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.productNameAr}
                    </div>
                    {item.productNameEn && <Text type="secondary" style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.productNameEn}</Text>}
                </div>
            </Flex>
        );

        return (
            <DataCard
                title={titleContent}
                properties={[
                    {
                        label: 'المباع',
                        value: `${item.quantity} (${item.unitSold === 'sub' ? 'فرعي' : 'أساسي'})`
                    },
                    {
                        label: 'المتاح للإرجاع',
                        value: <span style={{ color: item.refundableQuantity > 0 ? '#52c41a' : '#bfbfbf', fontWeight: 'bold' }}>{item.refundableQuantity}</span>
                    },
                    {
                        label: 'كمية الإرجاع',
                        fullWidth: true,
                        value: (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                                <InputNumber
                                    min={0}
                                    max={item.refundableQuantity}
                                    size="large"
                                    value={selectedQuantities[item.saleItemId] ?? 0}
                                    disabled={item.refundableQuantity === 0 || invoiceData?.status === 'cancelled'}
                                    onChange={(value) =>
                                        setSelectedQuantities((current) => ({
                                            ...current,
                                            [item.saleItemId]: Number(value ?? 0),
                                        }))
                                    }
                                    style={{ flex: 1, textAlign: 'center' }}
                                />
                            </div>
                        )
                    }
                ]}
            />
        );
    };

    if (!mounted) return null;

    return (
        <MobileFormWrapper
            title="إرجاع وإلغاء المبيعات"
            open={open}
            onClose={handleClose}
            width={960}
            footer={
                <Flex gap={12} align="center">
                    <Button key="close" block size="large" onClick={handleClose} style={{ flex: 1 }}>
                        إغلاق
                    </Button>
                    <Button
                        key="submit"
                        type="primary"
                        icon={<UndoOutlined />}
                        loading={submittingRefund}
                        onClick={() => void submitRefund()}
                        block
                        size="large"
                        style={{ flex: 1 }}
                        disabled={
                            (mode === 'invoice' && linkedRefundTotal === 0 && !invoiceData) ||
                            (mode === 'standalone' && standaloneRefundTotal === 0)
                        }
                    >
                        حفظ المرتجع
                    </Button>
                </Flex>
            }
        >
            <Space orientation="vertical" size="large" style={{ width: '100%', paddingBottom: 24 }}>
                <Segmented
                    block
                    size={isMobile ? "large" : "middle"}
                    value={mode}
                    options={[
                        { label: 'مرتجع فاتورة', value: 'invoice' },
                        { label: 'مرتجع يدوي', value: 'standalone' },
                    ]}
                    onChange={(value) => setMode(value as 'invoice' | 'standalone')}
                />

                {mode === 'invoice' ? (
                    <>
                        <Space.Compact style={{ width: '100%' }}>
                            <Input
                                size="large"
                                placeholder="رقم الفاتورة أو المعرف..."
                                prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                                value={invoiceReference}
                                onChange={(event) => setInvoiceReference(event.target.value)}
                                onPressEnter={() => void handleInvoiceLookup()}
                                allowClear
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
                                <Card size={isMobile ? "small" : "default"} style={{ background: '#fafafa', borderRadius: 8, borderColor: '#e6e6e6' }}>
                                    <Space orientation="vertical" size={4} style={{ width: '100%' }}>
                                        <Flex justify="space-between" align="center">
                                            <Text strong style={{ fontSize: isMobile ? 14 : 16 }}>الفاتورة: {invoiceData.invoiceNumber}</Text>
                                            <Text type={invoiceData.status === 'cancelled' ? 'danger' : 'success'} strong>
                                                {invoiceData.status === 'cancelled' ? 'ملغاة' : 'مكتملة'}
                                            </Text>
                                        </Flex>
                                        
                                        <Text>العميل: <Text strong>{invoiceData.customerName || 'غير محدد'}</Text></Text>
                                        
                                        <Divider style={{ margin: '12px 0' }} />
                                        
                                        <Row gutter={[16, 16]} justify="space-between">
                                            <Col xs={8} sm={8}>
                                                <Text type="secondary" style={{ fontSize: 12 }}>الإجمالي</Text><br />
                                                <Text strong>{formatEGP(invoiceData.total)}</Text>
                                            </Col>
                                            <Col xs={8} sm={8}>
                                                <Text type="secondary" style={{ fontSize: 12 }}>المدفوع</Text><br />
                                                <Text strong>{formatEGP(invoiceData.paidAmount)}</Text>
                                            </Col>
                                            <Col xs={8} sm={8}>
                                                <Text type="secondary" style={{ fontSize: 12 }}>المتبقي</Text><br />
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
                                        locale: { emptyText: ar.actions.noData },
                                        size: "small"
                                    }}
                                />

                                <div style={{ paddingTop: 16, borderTop: '1px solid #f0f0f0', marginTop: 8 }}>
                                    <Flex vertical={isMobile} align={isMobile ? "stretch" : "center"} justify="space-between" gap={16}>
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
                                                block={isMobile}
                                            >
                                                إلغاء الفاتورة بالكامل
                                            </Button>
                                        </Popconfirm>

                                        <Flex align="center" justify={isMobile ? "space-between" : "flex-end"} gap={12}>
                                            <Text style={{ fontSize: 16 }}>إجمالي المرتجع:</Text>
                                            <Text strong style={{ fontSize: 24, color: '#1677ff' }}>{formatEGP(linkedRefundTotal)}</Text>
                                        </Flex>
                                    </Flex>
                                </div>
                            </>
                        ) : (
                            <Empty description="ابحث عن فاتورة لبدء الإرجاع أو الإلغاء" style={{ margin: '40px 0' }} />
                        )}
                    </>
                ) : (
                    // --- STANDALONE REFUND MODE ---
                    <Card size={isMobile ? "small" : "default"} style={{ borderRadius: 8, borderColor: '#e6e6e6' }}>
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
                                String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                        />

                        <Space orientation="vertical" style={{ width: '100%' }} size={isMobile ? 12 : 16}>
                            {standaloneItems.map((item, index) => (
                                <Card key={item.id} size="small" style={{ background: '#fafafa', borderRadius: 8 }}>
                                    <Flex vertical gap={12}>
                                        <Flex justify="space-between" align="center">
                                            <Text strong type="secondary">الصنف {index + 1}</Text>
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
                                        </Flex>
                                        
                                        <Select
                                            size="large"
                                            showSearch
                                            style={{ width: '100%' }}
                                            placeholder="ابحث عن الصنف..."
                                            value={item.productId}
                                            loading={searchingProducts}
                                            filterOption={false}
                                            onSearch={(value) => void handleProductSearch(value)}
                                            onChange={(value) => {
                                                const selectedProduct = productOptions.find((product) => product._id === value);
                                                updateStandaloneItem(item.id, {
                                                    productId: value,
                                                    productName: selectedProduct?.nameAr ?? '',
                                                    productNameEn: selectedProduct?.nameEn ?? '',
                                                    imageUrl: selectedProduct?.imageUrl,
                                                    unitPrice: (selectedProduct?.sellingPrice ?? 0) / 100,
                                                });
                                            }}
                                            options={productOptions.map((product) => ({
                                                value: product._id,
                                                label: (
                                                    <Flex align="center" gap={8}>
                                                        {product.imageUrl ? (
                                                            <Image
                                                                src={product.imageUrl}
                                                                alt={product.nameAr}
                                                                width={28}
                                                                height={28}
                                                                style={{ objectFit: 'cover', borderRadius: 4 }}
                                                                preview={false}
                                                                fallback="https://via.placeholder.com/28?text=NA"
                                                            />
                                                        ) : (
                                                            <PictureOutlined style={{ color: '#d9d9d9', fontSize: 18 }} />
                                                        )}
                                                        <Flex vertical>
                                                            <Text style={{ fontSize: 14 }}>{product.nameAr}</Text>
                                                            {product.nameEn && <Text type="secondary" style={{ fontSize: 11 }}>{product.nameEn}</Text>}
                                                        </Flex>
                                                    </Flex>
                                                ),
                                            }))}
                                        />

                                        <Row gutter={12}>
                                            <Col xs={12}>
                                                <Text type="secondary" style={{ fontSize: 12, marginBottom: 4, display: 'block' }}>الكمية</Text>
                                                <InputNumber
                                                    size="large"
                                                    min={1}
                                                    value={item.quantity}
                                                    onChange={(value) => updateStandaloneItem(item.id, { quantity: Number(value ?? 1) })}
                                                    style={{ width: '100%', textAlign: 'center' }}
                                                />
                                            </Col>
                                            <Col xs={12}>
                                                <Text type="secondary" style={{ fontSize: 12, marginBottom: 4, display: 'block' }}>السعر (ج.م)</Text>
                                                <InputNumber
                                                    size="large"
                                                    min={0}
                                                    value={item.unitPrice}
                                                    onChange={(value) => updateStandaloneItem(item.id, { unitPrice: Number(value ?? 0) })}
                                                    style={{ width: '100%' }}
                                                />
                                            </Col>
                                        </Row>
                                    </Flex>
                                </Card>
                            ))}
                        </Space>

                        <Button
                            type="dashed"
                            block
                            size="large"
                            style={{ marginTop: 16 }}
                            icon={<PlusOutlined />}
                            onClick={() => setStandaloneItems((items) => [...items, createStandaloneItem()])}
                        >
                            إضافة صنف آخر للمرتجع
                        </Button>

                        <div style={{ paddingTop: 16, borderTop: '1px solid #f0f0f0', marginTop: 16 }}>
                            <Flex justify="space-between" align="center">
                                <Text style={{ fontSize: 16 }}>إجمالي المرتجع اليدوي:</Text>
                                <Text strong style={{ fontSize: 24, color: '#1677ff' }}>{formatEGP(standaloneRefundTotal)}</Text>
                            </Flex>
                        </div>
                    </Card>
                )}
            </Space>
        </MobileFormWrapper>
    );
}