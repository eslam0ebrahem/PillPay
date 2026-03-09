'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    Button,
    Divider,
    Empty,
    Input,
    InputNumber,
    Modal,
    Popconfirm,
    Segmented,
    Select,
    Space,
    Table,
    Typography,
    message,
} from 'antd';
import {
    DeleteOutlined,
    PlusOutlined,
    SearchOutlined,
    StopOutlined,
    UndoOutlined,
} from '@ant-design/icons';
import type { ProductSearchResult } from '@/lib/types';
import { formatEGP } from '@/utils/money';

const { Text } = Typography;

interface RefundDialogProps {
    open: boolean;
    onClose: () => void;
}

interface InvoiceLookupItem {
    saleItemId: string;
    productId: string;
    productNameAr: string;
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
            dataIndex: 'productNameAr',
            key: 'productNameAr',
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

    return (
        <Modal
            title="إرجاع وإلغاء المبيعات"
            open={open}
            onCancel={handleClose}
            width={960}
            destroyOnHidden
            footer={[
                <Button key="close" onClick={handleClose}>
                    إغلاق
                </Button>,
                <Button
                    key="submit"
                    type="primary"
                    icon={<UndoOutlined />}
                    loading={submittingRefund}
                    onClick={() => void submitRefund()}
                >
                    حفظ المرتجع
                </Button>,
            ]}
        >
            <Space orientation="vertical" size="large" style={{ width: '100%' }}>
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
                                placeholder="رقم الفاتورة أو المعرف"
                                prefix={<SearchOutlined />}
                                value={invoiceReference}
                                onChange={(event) => setInvoiceReference(event.target.value)}
                                onPressEnter={() => void handleInvoiceLookup()}
                            />
                            <Button
                                type="primary"
                                loading={searchingInvoice}
                                onClick={() => void handleInvoiceLookup()}
                            >
                                بحث
                            </Button>
                        </Space.Compact>

                        {invoiceData ? (
                            <>
                                <Space orientation="vertical" size={2}>
                                    <Text strong>
                                        الفاتورة: {invoiceData.invoiceNumber}
                                    </Text>
                                    <Text type="secondary">
                                        الإجمالي: {formatEGP(invoiceData.total)} | المدفوع:{' '}
                                        {formatEGP(invoiceData.paidAmount)} | المتبقي:{' '}
                                        {formatEGP(invoiceData.remainingBalance)}
                                    </Text>
                                    <Text type="secondary">
                                        العميل: {invoiceData.customerName || 'غير محدد'}
                                    </Text>
                                    <Text type={invoiceData.status === 'cancelled' ? 'danger' : 'secondary'}>
                                        الحالة: {invoiceData.status === 'cancelled' ? 'ملغاة' : 'مكتملة'}
                                    </Text>
                                </Space>

                                <Table
                                    rowKey="saleItemId"
                                    pagination={false}
                                    columns={invoiceColumns}
                                    dataSource={invoiceData.items}
                                    locale={{
                                        emptyText: (
                                            <Empty description="لا توجد أصناف متاحة للإرجاع" />
                                        ),
                                    }}
                                />

                                <Space
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        width: '100%',
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

                                    <Text strong>إجمالي المرتجع: {formatEGP(linkedRefundTotal)}</Text>
                                </Space>
                            </>
                        ) : (
                            <Empty description="ابحث عن فاتورة لبدء الإرجاع أو الإلغاء" />
                        )}
                    </>
                ) : (
                    <>
                        <Select
                            allowClear
                            showSearch
                            placeholder="عميل المرتجع (اختياري)"
                            value={selectedCustomerId}
                            onChange={(value) => setSelectedCustomerId(value)}
                            options={customerOptions.map((customer) => ({
                                value: customer._id,
                                label: customer.name,
                            }))}
                            filterOption={(input, option) =>
                                String(option?.label ?? '')
                                    .toLowerCase()
                                    .includes(input.toLowerCase())
                            }
                        />

                        <Space orientation="vertical" style={{ width: '100%' }} size="middle">
                            {standaloneItems.map((item, index) => (
                                <Space
                                    key={item.id}
                                    wrap
                                    align="start"
                                    style={{ width: '100%' }}
                                >
                                    <Select
                                        showSearch
                                        style={{ minWidth: 260 }}
                                        placeholder={`الصنف ${index + 1}`}
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
                                                unitPrice:
                                                    (selectedProduct?.sellingPrice ?? 0) / 100,
                                            });
                                        }}
                                        options={productOptions.map((product) => ({
                                            value: product._id,
                                            label: product.nameAr,
                                            sellingPrice: product.sellingPrice,
                                        }))}
                                    />

                                    <InputNumber
                                        min={1}
                                        value={item.quantity}
                                        onChange={(value) =>
                                            updateStandaloneItem(item.id, {
                                                quantity: Number(value ?? 1),
                                            })
                                        }
                                        placeholder="الكمية"
                                    />

                                    <InputNumber
                                        min={0}
                                        value={item.unitPrice}
                                        onChange={(value) =>
                                            updateStandaloneItem(item.id, {
                                                unitPrice: Number(value ?? 0),
                                            })
                                        }
                                        placeholder="سعر الوحدة"
                                        addonAfter="ج.م"
                                    />

                                    <Button
                                        danger
                                        icon={<DeleteOutlined />}
                                        disabled={standaloneItems.length === 1}
                                        onClick={() =>
                                            setStandaloneItems((items) =>
                                                items.filter((current) => current.id !== item.id)
                                            )
                                        }
                                    />
                                </Space>
                            ))}
                        </Space>

                        <Button
                            icon={<PlusOutlined />}
                            onClick={() =>
                                setStandaloneItems((items) => [...items, createStandaloneItem()])
                            }
                        >
                            إضافة صنف يدوي
                        </Button>

                        <Divider style={{ margin: '8px 0' }} />
                        <Text strong>إجمالي المرتجع: {formatEGP(standaloneRefundTotal)}</Text>
                    </>
                )}
            </Space>
        </Modal>
    );
}
