'use client';

import { useState, useRef } from 'react';
import { Input, Table, Button, Typography, Space, Tag, Modal, InputNumber, Radio, Image, message } from 'antd';
import { ScanOutlined, SearchOutlined, PictureOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import MoneyDisplay from '../common/MoneyDisplay';

const BarcodeScanner = dynamic(() => import('../common/BarcodeScanner'), { ssr: false });
import ar from '@/i18n/ar';
import type { UnitSold } from '@/lib/types';

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
        // Do nothing if same
    } else {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
    }

    return debouncedValue;
}

export default function ProductSearch({ onAddToCart }: ProductSearchProps) {
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
        setQuery(''); // clear search after add
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    const handleCameraScan = async (barcode: string) => {
        setQuery(barcode); // Set query to show scanned barcode in input
        // We'll perform a manual fetch rather than just setting the term,
        // to immediately process the scanned item like `onPressEnter`
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
                setQuery(''); // Clear input after successful add
                if (inputRef.current) {
                    inputRef.current.focus();
                }
            } else if (data && data.length > 1) {
                // If multiple products match, display them in the search results
                // The debounced query will handle this automatically if we just setQuery
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
        // Manually trigger search if query is not empty
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
            setQuery(''); // clear search after add
            if (inputRef.current) {
                inputRef.current.focus();
            }
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
                        style={{ flex: 1 }}
                    />
                    <BarcodeScanner
                        onScan={handleCameraScan}
                        buttonText=""
                        buttonProps={{ size: 'large', type: 'primary' }}
                    />
                </div>
            </div>

            <Table
                loading={isFetching}
                dataSource={results || []}
                rowKey="_id"
                showHeader={false}
                size="small"
                pagination={false}
                locale={{ emptyText: ar.actions.noData }}
                columns={[
                    {
                        title: 'Product',
                        key: 'product',
                        render: (_, item: ProductSearchResult) => (
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
                        align: 'right',
                        render: (_, item: ProductSearchResult) => (
                            <Button
                                type="primary"
                                disabled={item.floorStock <= 0}
                                onClick={() => openQtyModal(item)}
                            >
                                {ar.actions.add}
                            </Button>
                        ),
                    },
                ]}
            />

            <Modal
                title={ar.pos.addToCart}
                open={!!selectedProduct}
                onOk={confirmAddToCart}
                onCancel={() => setSelectedProduct(null)}
                okText={ar.actions.add}
                cancelText={ar.actions.cancel}
            >
                {selectedProduct && (
                    <Space orientation="vertical" style={{ width: '100%' }} size="large">
                        <div>
                            <Text strong style={{ display: 'block' }}>{selectedProduct.nameAr}</Text>
                            {selectedProduct.nameEn && <Text type="secondary">{selectedProduct.nameEn}</Text>}
                        </div>

                        <div>
                            <Text>{ar.pos.quantity}: </Text>
                            <InputNumber
                                min={1}
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
                                    style={{ marginTop: 8, display: 'block' }}
                                >
                                    <Radio.Button value="base">{selectedProduct.baseUnit}</Radio.Button>
                                    <Radio.Button value="sub">{selectedProduct.subUnit}</Radio.Button>
                                </Radio.Group>
                            </div>
                        )}
                    </Space>
                )}
            </Modal>
        </div>
    );
}
