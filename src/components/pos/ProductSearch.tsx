'use client';

import { useState, useRef } from 'react';
import { Input, Button, Typography, Space, Tag, InputNumber, Radio, Image, App, Card, Row, Col } from 'antd';
import { ScanOutlined, SearchOutlined, PictureOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import MoneyDisplay from '../common/MoneyDisplay';
import ResponsiveDataView from '../common/ResponsiveDataView';
import MobileFormWrapper from '../common/MobileFormWrapper';
import ar from '@/i18n/ar';
import type { UnitSold } from '@/lib/types';

const BarcodeScanner = dynamic(() => import('../common/BarcodeScanner'), { ssr: false });
const { Text } = Typography;

export interface ProductSearchResult {
    _id: string;
    barcode: string | null;
    barcode2?: string | null;
    nameAr: string;
    nameEn?: string;
    imageUrl?: string;
    sellingPrice: number;
    baseUnit: string;
    subUnit?: string | null;
    subUnitConversionFactor?: number | null;
    floorStock: number;
}

interface ProductSearchProps {
    onAddToCart: (item: { product: ProductSearchResult; quantity: number; unitSold: UnitSold }) => void;
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    if (timerRef.current && debouncedValue === value) {
        // Do nothing
    } else {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
    }

    return debouncedValue;
}

export default function ProductSearch({ onAddToCart }: ProductSearchProps) {
    const { message } = App.useApp();
    const [query, setQuery] = useState('');
    const debouncedQuery = useDebounce(query, 300);
    const [selectedProduct, setSelectedProduct] = useState<ProductSearchResult | null>(null);
    const inputRef = useRef<any>(null);

    // Quantity states
    const [qty, setQty] = useState<number>(1);
    const [unitType, setUnitType] = useState<UnitSold>('base');

    const { data: results, isFetching, refetch } = useQuery({
        queryKey: ['productSearch', debouncedQuery],
        queryFn: async () => {
            if (!debouncedQuery) return [];
            const isBarcode = /^[0-9]+$/.test(debouncedQuery) && debouncedQuery.length >= 8;
            const res = await fetch('/api/pos/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: debouncedQuery, type: isBarcode ? 'barcode' : 'text' }),
            });
            if (!res.ok) throw new Error('Search failed');
            return res.json() as Promise<ProductSearchResult[]>;
        },
        enabled: debouncedQuery.length > 1,
    });

    const handleAddToCart = (product: ProductSearchResult) => {
        onAddToCart({
            product: product,
            quantity: 1, // Default to 1 for direct add
            unitSold: 'base', // Default to base unit for direct add
        });
        setQuery('');
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    const handleCameraScan = async (barcode: string) => {
        setQuery(barcode);
        try {
            const res = await fetch('/api/pos/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: barcode, type: 'barcode' }),
            });
            if (!res.ok) throw new Error('Search failed');
            const data = await res.json();

            if (data && data.length === 1) {
                handleAddToCart(data[0]);
                setQuery('');
                if (inputRef.current) {
                    inputRef.current.focus();
                }
            } else if (data && data.length > 1) {
                message.info('تم العثور على منتجات متعددة مطابقة للباركود');
            } else {
                message.error('لم يتم العثور على المنتج');
            }
        } catch (err) {
            console.error('Camera scan fetch error:', err);
            message.error('خطأ في البحث عن الباركود');
        }
    };

    const handleSearch = () => {
        if (query.length > 1) {
            refetch();
        }
    };

    const openQtyModal = (product: ProductSearchResult) => {
        setSelectedProduct(product);
        setQty(1);
        setUnitType('base');
    };

    const confirmAddToCart = () => {
        if (selectedProduct && qty > 0) {
            onAddToCart({
                product: selectedProduct,
                quantity: qty,
                unitSold: unitType,
            });
            setSelectedProduct(null);
            setQuery('');
            if (inputRef.current) {
                inputRef.current.focus();
            }
        }
    };

    const renderCard = (item: ProductSearchResult) => (
        <Card size="small" style={{ width: '100%', marginBottom: 8, borderRadius: 12 }}>
            <Row align="middle">
                <Col flex="60px">
                    {item.imageUrl ? (
                        <Image
                            src={item.imageUrl}
                            alt={item.nameAr}
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
                </Col>
                <Col flex="auto" style={{ paddingLeft: 12, paddingRight: 12 }}>
                    <Text strong style={{ fontSize: 16 }}>{item.nameAr}</Text>
                    {item.nameEn && <><br /><Text type="secondary" style={{ fontSize: 12 }}>{item.nameEn}</Text></>}
                    <div style={{ marginTop: 4 }}>
                        <Space wrap>
                            <MoneyDisplay amount={item.sellingPrice} />
                            {item.floorStock > 0 ? (
                                <Tag color="green" style={{ margin: 0 }}>
                                    {ar.pos.inStock}: {item.floorStock} {item.baseUnit}
                                </Tag>
                            ) : (
                                <Tag color="red" style={{ margin: 0 }}>{ar.pos.outOfStock}</Tag>
                            )}
                        </Space>
                    </div>
                </Col>
                <Col>
                    <Button
                        type="primary"
                        size="large"
                        shape="circle"
                        disabled={item.floorStock <= 0}
                        onClick={() => openQtyModal(item)}
                        style={{ width: 44, height: 44 }}
                    >
                        +
                    </Button>
                </Col>
            </Row>
        </Card>
    );

    const columns = [
        {
            title: 'Product',
            key: 'product',
            render: (_: any, item: ProductSearchResult) => (
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div>
                        {item.imageUrl ? (
                            <Image
                                src={item.imageUrl}
                                alt={item.nameAr}
                                width={48}
                                height={48}
                                style={{ objectFit: 'cover', borderRadius: 4 }}
                                fallback="https://via.placeholder.com/48?text=No+Image"
                            />
                        ) : (
                            <div style={{ width: 48, height: 48, backgroundColor: '#f5f5f5', display: 'flex', justifyContent: 'center', alignItems: 'center', borderRadius: 4 }}>
                                <PictureOutlined style={{ fontSize: 20, color: '#d9d9d9' }} />
                            </div>
                        )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                        <Text strong>{item.nameAr}</Text>
                        {item.nameEn && <Text type="secondary" style={{ fontSize: 13 }}>{item.nameEn}</Text>}
                        <Space wrap>
                            <MoneyDisplay amount={item.sellingPrice} />
                            {item.floorStock > 0 ? (
                                <Tag color="green">
                                    {ar.pos.inStock}: {item.floorStock} {item.baseUnit}
                                </Tag>
                            ) : (
                                <Tag color="red">{ar.pos.outOfStock}</Tag>
                            )}
                            {item.barcode && <Text type="secondary" style={{ fontSize: 12 }}>{item.barcode}</Text>}
                        </Space>
                    </div>
                </div>
            ),
        },
        {
            title: 'Action',
            key: 'action',
            width: 100,
            align: 'right' as const,
            render: (_: any, item: ProductSearchResult) => (
                <Button
                    type="primary"
                    disabled={item.floorStock <= 0}
                    onClick={() => openQtyModal(item)}
                >
                    {ar.actions.add}
                </Button>
            ),
        },
    ];

    return (
        <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                    <Input
                        size="large"
                        placeholder={ar.pos.searchPlaceholder}
                        prefix={<SearchOutlined />}
                        suffix={<ScanOutlined style={{ color: '#1890ff' }} />}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onPressEnter={handleSearch}
                        autoFocus
                        ref={inputRef}
                        style={{ flex: 1, minHeight: 52, borderRadius: 12, fontSize: 16 }}
                    />
                    <BarcodeScanner
                        onScan={handleCameraScan}
                        buttonText=""
                        buttonProps={{ size: 'large', type: 'primary', style: { width: 52, height: 52, borderRadius: 12 } }}
                    />
                </div>
            </div>

            <ResponsiveDataView
                data={results || []}
                loading={isFetching}
                rowKey="_id"
                tableColumns={columns}
                renderCard={renderCard}
                pagination={false}
                tableProps={{
                    showHeader: false,
                    size: "small",
                    locale: { emptyText: ar.actions.noData }
                }}
            />

            <MobileFormWrapper
                title={ar.pos.addToCart}
                open={!!selectedProduct}
                onClose={() => setSelectedProduct(null)}
                footer={
                    <Button block type="primary" size="large" onClick={confirmAddToCart}>
                        {ar.actions.add}
                    </Button>
                }
            >
                {selectedProduct && (
                    <Space orientation="vertical" style={{ width: '100%' }} size="large">
                        <div>
                            <Text strong style={{ display: 'block', fontSize: 18 }}>{selectedProduct.nameAr}</Text>
                            {selectedProduct.nameEn && <Text type="secondary">{selectedProduct.nameEn}</Text>}
                        </div>

                        <div>
                            <Text>{ar.pos.quantity}: </Text>
                            <InputNumber
                                min={1}
                                size="large"
                                value={qty}
                                onChange={(val) => setQty(val || 1)}
                                style={{ width: '100%', marginTop: 8 }}
                                autoFocus
                            />
                        </div>

                        {selectedProduct.subUnit && selectedProduct.subUnitConversionFactor && (
                            <div>
                                <Text>{ar.products.baseUnit}: </Text>
                                <Radio.Group
                                    value={unitType}
                                    onChange={(e) => setUnitType(e.target.value)}
                                    style={{ marginTop: 8, display: 'flex' }}
                                    optionType="button"
                                    buttonStyle="solid"
                                >
                                    <Radio.Button value="base" style={{ flex: 1, textAlign: 'center' }}>{selectedProduct.baseUnit}</Radio.Button>
                                    <Radio.Button value="sub" style={{ flex: 1, textAlign: 'center' }}>{selectedProduct.subUnit}</Radio.Button>
                                </Radio.Group>
                            </div>
                        )}
                    </Space>
                )}
            </MobileFormWrapper>
        </div>
    );
}
