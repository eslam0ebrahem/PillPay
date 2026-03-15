'use client';

import { useState, useRef, useEffect } from 'react';
import {
    Input,
    Button,
    Typography,
    Space,
    Tag,
    InputNumber,
    Radio,
    Image,
    App,
    Grid,
    Flex,
    Divider,
} from 'antd';
import { ScanOutlined, SearchOutlined, PictureOutlined, PlusOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import MoneyDisplay from '../common/MoneyDisplay';
import ResponsiveDataView from '../common/ResponsiveDataView';
import MobileFormWrapper from '../common/MobileFormWrapper';
import ar from '@/i18n/ar';
import type { UnitSold } from '@/lib/types';
import { DataCard } from '../common/DataCard';

const BarcodeScanner = dynamic(() => import('../common/BarcodeScanner'), { ssr: false });
const { Text } = Typography;
const { useBreakpoint } = Grid;

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
    onAddToCart: (item: {
        product: ProductSearchResult;
        quantity: number;
        unitSold: UnitSold;
    }) => void;
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [value, delay]);

    return debouncedValue;
}

export default function ProductSearch({ onAddToCart }: ProductSearchProps) {
    const { message } = App.useApp();
    const screens = useBreakpoint();
    const [mounted, setMounted] = useState(false);

    const [query, setQuery] = useState('');
    const debouncedQuery = useDebounce(query, 300);
    const [selectedProduct, setSelectedProduct] = useState<ProductSearchResult | null>(null);
    const inputRef = useRef<any>(null);

    // Quantity states
    const [qty, setQty] = useState<number>(1);
    const [unitType, setUnitType] = useState<UnitSold>('base');

    useEffect(() => {
        setMounted(true);
    }, []);

    const isMobile = screens.xs || (screens.sm && !screens.md);

    const {
        data: results,
        isFetching,
        refetch,
    } = useQuery({
        queryKey: ['productSearch', debouncedQuery],
        queryFn: async () => {
            if (!debouncedQuery) return [];
            const isBarcode = /^[0-9]+$/.test(debouncedQuery) && debouncedQuery.length >= 8;
            const res = await fetch('/api/pos/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: debouncedQuery,
                    type: isBarcode ? 'barcode' : 'text',
                }),
            });
            if (!res.ok) throw new Error('Search failed');
            return res.json() as Promise<ProductSearchResult[]>;
        },
        enabled: debouncedQuery.length > 1,
    });

    const handleAddToCart = (product: ProductSearchResult) => {
        onAddToCart({
            product: product,
            quantity: 1,
            unitSold: 'base',
        });
        setQuery('');
        // Only auto-refocus on desktop. On mobile, this pops up the keyboard annoyingly.
        if (!isMobile && inputRef.current) {
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
            if (!isMobile && inputRef.current) {
                inputRef.current.focus();
            }
        }
    };

    // --- Mobile Card Layout ---
    const renderCard = (item: ProductSearchResult) => {
        const titleContent = (
            <Flex gap={12} align="center">
                <div style={{ flexShrink: 0 }}>
                    {item.imageUrl ? (
                        <Image
                            src={item.imageUrl}
                            alt={item.nameAr}
                            width={64}
                            height={64}
                            style={{ objectFit: 'cover', borderRadius: 8 }}
                            fallback="/no-image.svg"
                        />
                    ) : (
                        <div
                            style={{
                                width: 64,
                                height: 64,
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
                        {item.nameAr}
                    </div>
                    {item.nameEn && (
                        <div
                            style={{
                                color: '#8c8c8c',
                                fontSize: 13,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                            }}
                        >
                            {item.nameEn}
                        </div>
                    )}
                </div>
            </Flex>
        );

        return (
            <DataCard
                title={titleContent}
                properties={[
                    {
                        label: 'السعر',
                        value: <MoneyDisplay amount={item.sellingPrice} />,
                    },
                    {
                        label: 'المخزون',
                        value:
                            item.floorStock > 0 ? (
                                <Tag color="green" style={{ margin: 0, padding: '2px 8px' }}>
                                    {item.floorStock} {item.baseUnit}
                                </Tag>
                            ) : (
                                <Tag color="error" style={{ margin: 0 }}>
                                    {ar.pos.outOfStock}
                                </Tag>
                            ),
                    },
                ]}
                actions={
                    <Button
                        type="primary"
                        size="large"
                        icon={<PlusOutlined />}
                        disabled={item.floorStock <= 0}
                        onClick={() => openQtyModal(item)}
                        block
                        style={{ borderRadius: 8 }}
                    >
                        {ar.actions.add} للسلة
                    </Button>
                }
            />
        );
    };

    // --- Desktop Table Layout ---
    const columns = [
        {
            title: 'Product',
            key: 'product',
            render: (_: any, item: ProductSearchResult) => (
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ flexShrink: 0 }}>
                        {item.imageUrl ? (
                            <Image
                                src={item.imageUrl}
                                alt={item.nameAr}
                                width={48}
                                height={48}
                                style={{ objectFit: 'cover', borderRadius: 4 }}
                                fallback="/no-image.svg"
                            />
                        ) : (
                            <div
                                style={{
                                    width: 48,
                                    height: 48,
                                    backgroundColor: '#f5f5f5',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    borderRadius: 4,
                                }}
                            >
                                <PictureOutlined style={{ fontSize: 20, color: '#d9d9d9' }} />
                            </div>
                        )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                        <Text strong style={{ fontSize: 15 }}>
                            {item.nameAr}
                        </Text>
                        {item.nameEn && (
                            <Text type="secondary" style={{ fontSize: 13 }}>
                                {item.nameEn}
                            </Text>
                        )}
                        <Space wrap size="middle">
                            <MoneyDisplay amount={item.sellingPrice} />
                            {item.floorStock > 0 ? (
                                <Tag color="green" style={{ margin: 0 }}>
                                    {ar.pos.inStock}: {item.floorStock} {item.baseUnit}
                                </Tag>
                            ) : (
                                <Tag color="error" style={{ margin: 0 }}>
                                    {ar.pos.outOfStock}
                                </Tag>
                            )}
                            {item.barcode && (
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    <ScanOutlined /> {item.barcode}
                                </Text>
                            )}
                        </Space>
                    </div>
                </div>
            ),
        },
        {
            title: 'Action',
            key: 'action',
            width: 120,
            align: 'right' as const,
            render: (_: any, item: ProductSearchResult) => (
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    disabled={item.floorStock <= 0}
                    onClick={() => openQtyModal(item)}
                >
                    {ar.actions.add}
                </Button>
            ),
        },
    ];

    if (!mounted) return null;

    return (
        <div>
            {/* Search Bar Area */}
            <Flex gap={8} style={{ marginBottom: 16 }}>
                <Input
                    size="large"
                    placeholder={ar.pos.searchPlaceholder}
                    prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onPressEnter={handleSearch}
                    autoFocus={!isMobile} // Don't pop keyboard on mobile automatically
                    ref={inputRef}
                    allowClear
                    style={{ flex: 1, minHeight: 56, borderRadius: 12, fontSize: 16 }}
                />
                <BarcodeScanner
                    onScan={handleCameraScan}
                    buttonText=""
                    buttonProps={{
                        size: 'large',
                        type: 'primary',
                        style: { width: 56, height: 56, borderRadius: 12 },
                    }}
                />
            </Flex>

            {/* Results Area */}
            <ResponsiveDataView
                data={results || []}
                loading={isFetching}
                rowKey="_id"
                tableColumns={columns}
                renderCard={renderCard}
                pagination={false}
                tableProps={{
                    showHeader: false,
                    size: 'small',
                    locale: { emptyText: ar.actions.noData },
                }}
            />

            {/* Add to Cart Modal/Drawer */}
            <MobileFormWrapper
                title={ar.pos.addToCart}
                open={!!selectedProduct}
                onClose={() => setSelectedProduct(null)}
            >
                {selectedProduct && (
                    <div style={{ padding: isMobile ? '12px 0' : 0 }}>
                        <Flex
                            vertical
                            align="center"
                            gap={4}
                            style={{ textAlign: 'center', marginBottom: 24 }}
                        >
                            <Text strong style={{ fontSize: 20 }}>
                                {selectedProduct.nameAr}
                            </Text>
                            {selectedProduct.nameEn && (
                                <Text type="secondary">{selectedProduct.nameEn}</Text>
                            )}
                            <div style={{ marginTop: 8 }}>
                                <MoneyDisplay amount={selectedProduct.sellingPrice} />
                            </div>
                        </Flex>

                        <Divider style={{ margin: '16px 0' }} />

                        <Flex vertical gap={16}>
                            <div>
                                <Text strong style={{ display: 'block', marginBottom: 8 }}>
                                    {ar.pos.quantity}:{' '}
                                </Text>
                                <InputNumber
                                    min={1}
                                    max={selectedProduct.floorStock} // Prevent adding more than available stock
                                    size="large"
                                    value={qty}
                                    onChange={(val) => setQty(val || 1)}
                                    style={{ width: '100%', fontSize: 18, textAlign: 'center' }}
                                />
                            </div>

                            {selectedProduct.subUnit && selectedProduct.subUnitConversionFactor && (
                                <div>
                                    <Text strong style={{ display: 'block', marginBottom: 8 }}>
                                        {ar.products.baseUnit}:{' '}
                                    </Text>
                                    <Radio.Group
                                        value={unitType}
                                        onChange={(e) => setUnitType(e.target.value)}
                                        style={{ width: '100%', display: 'flex' }}
                                        optionType="button"
                                        buttonStyle="solid"
                                        size="large"
                                    >
                                        <Radio.Button
                                            value="base"
                                            style={{ flex: 1, textAlign: 'center' }}
                                        >
                                            {selectedProduct.baseUnit}
                                        </Radio.Button>
                                        <Radio.Button
                                            value="sub"
                                            style={{ flex: 1, textAlign: 'center' }}
                                        >
                                            {selectedProduct.subUnit}
                                        </Radio.Button>
                                    </Radio.Group>
                                </div>
                            )}

                            <Button
                                type="primary"
                                size="large"
                                onClick={confirmAddToCart}
                                block
                                style={{ marginTop: 16, height: 50, fontSize: 16, borderRadius: 8 }}
                            >
                                {ar.actions.add} للسلة
                            </Button>
                        </Flex>
                    </div>
                )}
            </MobileFormWrapper>
        </div>
    );
}
