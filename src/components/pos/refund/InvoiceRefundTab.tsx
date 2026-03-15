'use client';

import {
    Button,
    Card,
    Col,
    Divider,
    Empty,
    Flex,
    Image,
    InputNumber,
    Popconfirm,
    Row,
    Space,
    Typography,
} from 'antd';
import { Input } from 'antd';
import { PictureOutlined, SearchOutlined, StopOutlined } from '@ant-design/icons';
import ResponsiveDataView from '../../common/ResponsiveDataView';
import { DataCard } from '../../common/DataCard';
import { formatEGP } from '@/utils/money';
import ar from '@/i18n/ar';
import type { InvoiceLookupItem, InvoiceLookupResult } from './refundTypes';

const { Text } = Typography;

interface Props {
    invoiceReference: string;
    setInvoiceReference: (v: string) => void;
    searchingInvoice: boolean;
    handleInvoiceLookup: () => void;
    invoiceData: InvoiceLookupResult | null;
    selectedQuantities: Record<string, number>;
    setSelectedQuantities: React.Dispatch<React.SetStateAction<Record<string, number>>>;
    cancellingSale: boolean;
    cancelSale: () => void;
    linkedRefundTotal: number;
    isMobile: boolean | undefined;
}

export default function InvoiceRefundTab({
    invoiceReference,
    setInvoiceReference,
    searchingInvoice,
    handleInvoiceLookup,
    invoiceData,
    selectedQuantities,
    setSelectedQuantities,
    cancellingSale,
    cancelSale,
    linkedRefundTotal,
    isMobile,
}: Props) {
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
                                fallback="/no-image.svg"
                            />
                        ) : (
                            <div
                                style={{
                                    width: 40,
                                    height: 40,
                                    backgroundColor: '#f5f5f5',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    borderRadius: 4,
                                }}
                            >
                                <PictureOutlined style={{ fontSize: 16, color: '#d9d9d9' }} />
                            </div>
                        )}
                    </div>
                    <div>
                        <div style={{ fontWeight: 500 }}>{record.productNameAr}</div>
                        {record.productNameEn && (
                            <div style={{ color: '#8c8c8c', fontSize: '12px' }}>
                                {record.productNameEn}
                            </div>
                        )}
                    </div>
                </Flex>
            ),
        },
        {
            title: 'المباع',
            key: 'sold',
            render: (_: unknown, item: InvoiceLookupItem) =>
                `${item.quantity} (${item.unitSold === 'sub' ? 'فرعي' : 'أساسي'})`,
        },
        {
            title: 'المتاح للإرجاع',
            dataIndex: 'refundableQuantity',
            key: 'refundableQuantity',
            render: (qty: number) => (
                <Text strong type={qty > 0 ? 'success' : 'secondary'}>
                    {qty}
                </Text>
            ),
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
        <DataCard
            title={
                <Flex gap={12} align="center">
                    <div style={{ flexShrink: 0 }}>
                        {item.imageUrl ? (
                            <Image
                                src={item.imageUrl}
                                alt={item.productNameAr}
                                width={56}
                                height={56}
                                style={{ objectFit: 'cover', borderRadius: 8 }}
                                fallback="/no-image.svg"
                            />
                        ) : (
                            <div
                                style={{
                                    width: 56,
                                    height: 56,
                                    backgroundColor: '#f5f5f5',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    borderRadius: 8,
                                }}
                            >
                                <PictureOutlined style={{ fontSize: 24, color: '#d9d9d9' }} />
                            </div>
                        )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                            style={{
                                fontSize: 16,
                                fontWeight: 600,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                            }}
                        >
                            {item.productNameAr}
                        </div>
                        {item.productNameEn && (
                            <Text
                                type="secondary"
                                style={{
                                    fontSize: 13,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                }}
                            >
                                {item.productNameEn}
                            </Text>
                        )}
                    </div>
                </Flex>
            }
            properties={[
                {
                    label: 'المباع',
                    value: `${item.quantity} (${item.unitSold === 'sub' ? 'فرعي' : 'أساسي'})`,
                },
                {
                    label: 'المتاح للإرجاع',
                    value: (
                        <span
                            style={{
                                color: item.refundableQuantity > 0 ? '#52c41a' : '#bfbfbf',
                                fontWeight: 'bold',
                            }}
                        >
                            {item.refundableQuantity}
                        </span>
                    ),
                },
                {
                    label: 'كمية الإرجاع',
                    fullWidth: true,
                    value: (
                        <div
                            style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}
                        >
                            <InputNumber
                                min={0}
                                max={item.refundableQuantity}
                                size="large"
                                value={selectedQuantities[item.saleItemId] ?? 0}
                                disabled={
                                    item.refundableQuantity === 0 ||
                                    invoiceData?.status === 'cancelled'
                                }
                                onChange={(value) =>
                                    setSelectedQuantities((current) => ({
                                        ...current,
                                        [item.saleItemId]: Number(value ?? 0),
                                    }))
                                }
                                style={{ flex: 1, textAlign: 'center' }}
                            />
                        </div>
                    ),
                },
            ]}
        />
    );

    return (
        <>
            <Space.Compact style={{ width: '100%' }}>
                <Input
                    size="large"
                    placeholder="رقم الفاتورة أو المعرف..."
                    prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                    value={invoiceReference}
                    onChange={(event) => setInvoiceReference(event.target.value)}
                    onPressEnter={handleInvoiceLookup}
                    allowClear
                />
                <Button
                    size="large"
                    type="primary"
                    loading={searchingInvoice}
                    onClick={handleInvoiceLookup}
                >
                    بحث
                </Button>
            </Space.Compact>

            {invoiceData ? (
                <>
                    <Card
                        size={isMobile ? 'small' : 'default'}
                        style={{ background: '#fafafa', borderRadius: 8, borderColor: '#e6e6e6' }}
                    >
                        <Space orientation="vertical" size={4} style={{ width: '100%' }}>
                            <Flex justify="space-between" align="center">
                                <Text strong style={{ fontSize: isMobile ? 14 : 16 }}>
                                    الفاتورة: {invoiceData.invoiceNumber}
                                </Text>
                                <Text
                                    type={invoiceData.status === 'cancelled' ? 'danger' : 'success'}
                                    strong
                                >
                                    {invoiceData.status === 'cancelled' ? 'ملغاة' : 'مكتملة'}
                                </Text>
                            </Flex>
                            <Text>
                                العميل: <Text strong>{invoiceData.customerName || 'غير محدد'}</Text>
                            </Text>
                            <Divider style={{ margin: '12px 0' }} />
                            <Row gutter={[16, 16]} justify="space-between">
                                <Col xs={8} sm={8}>
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        الإجمالي
                                    </Text>
                                    <br />
                                    <Text strong>{formatEGP(invoiceData.total)}</Text>
                                </Col>
                                <Col xs={8} sm={8}>
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        المدفوع
                                    </Text>
                                    <br />
                                    <Text strong>{formatEGP(invoiceData.paidAmount)}</Text>
                                </Col>
                                <Col xs={8} sm={8}>
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        المتبقي
                                    </Text>
                                    <br />
                                    <Text
                                        strong
                                        type={
                                            invoiceData.remainingBalance > 0 ? 'danger' : 'success'
                                        }
                                    >
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
                        tableProps={{ locale: { emptyText: ar.actions.noData }, size: 'small' }}
                    />

                    <div style={{ paddingTop: 16, borderTop: '1px solid #f0f0f0', marginTop: 8 }}>
                        <Flex
                            vertical={isMobile}
                            align={isMobile ? 'stretch' : 'center'}
                            justify="space-between"
                            gap={16}
                        >
                            <Popconfirm
                                title="إلغاء الفاتورة بالكامل؟"
                                description="سيتم استرجاع كل المخزون وإلغاء الأثر المالي للفاتورة."
                                okText="تأكيد الإلغاء"
                                cancelText="تراجع"
                                onConfirm={cancelSale}
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
                            <Flex
                                align="center"
                                justify={isMobile ? 'space-between' : 'flex-end'}
                                gap={12}
                            >
                                <Text style={{ fontSize: 16 }}>إجمالي المرتجع:</Text>
                                <Text strong style={{ fontSize: 24, color: '#1677ff' }}>
                                    {formatEGP(linkedRefundTotal)}
                                </Text>
                            </Flex>
                        </Flex>
                    </div>
                </>
            ) : (
                <Empty
                    description="ابحث عن فاتورة لبدء الإرجاع أو الإلغاء"
                    style={{ margin: '40px 0' }}
                />
            )}
        </>
    );
}
