'use client';

import { useState, useRef } from 'react';
import { Input, List, Button, Typography, Space, Tag, Modal, InputNumber, Radio } from 'antd';
import { ScanOutlined, SearchOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import MoneyDisplay from '../common/MoneyDisplay';

const BarcodeScanner = dynamic(() => import('./BarcodeScanner'), { ssr: false });
import ar from '@/i18n/ar';
import type { UnitSold } from '@/lib/types';

const { Text } = Typography;

export interface ProductSearchResult {
    _id: string;
    barcode: string | null;
    nameAr: string;
    nameEn?: string;
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
    const [scannerOpen, setScannerOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<ProductSearchResult | null>(null);

    // Quantity states
    const [qty, setQty] = useState<number>(1);
    const [unitType, setUnitType] = useState<UnitSold>('base');

    const { data: results, isFetching } = useQuery({
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

    const handleScan = (barcode: string) => {
        setQuery(barcode);
        // Scanning immediately initiates search via the debounced effect.
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
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <Input
                    size="large"
                    placeholder={ar.pos.searchPlaceholder}
                    prefix={<SearchOutlined />}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    allowClear
                    autoFocus
                />
                <Button size="large" icon={<ScanOutlined />} onClick={() => setScannerOpen(true)}>
                    {ar.pos.scanBarcode}
                </Button>
            </div>

            <List
                loading={isFetching}
                dataSource={results || []}
                renderItem={(item) => (
                    <List.Item
                        actions={[
                            <Button
                                key="add"
                                type="primary"
                                disabled={item.floorStock <= 0}
                                onClick={() => openQtyModal(item)}
                            >
                                {ar.actions.add}
                            </Button>,
                        ]}
                    >
                        <List.Item.Meta
                            title={item.nameAr}
                            description={
                                <Space>
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
                            }
                        />
                    </List.Item>
                )}
            />

            <BarcodeScanner
                open={scannerOpen}
                onClose={() => setScannerOpen(false)}
                onScan={handleScan}
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
                        <Text strong>{selectedProduct.nameAr}</Text>

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
