'use client';

import React from 'react';
import { formatEGP } from '@/utils/money';

interface MoneyDisplayProps {
    amount: number; // in piasters
    showSign?: boolean;
    className?: string;
    style?: React.CSSProperties;
}

export default function MoneyDisplay({ amount, showSign, className = '', style }: MoneyDisplayProps) {
    const isNegative = amount < 0;
    
    // Ant Design color palette fallbacks in case external CSS classes are missing
    const colorStyle = isNegative 
        ? { color: '#cf1322' } // Ant Design Danger Red
        : (amount > 0 && showSign) ? { color: '#389e0d' } : {}; // Ant Design Success Green

    const colorClass = isNegative ? 'money-negative' : amount > 0 ? 'money-positive' : '';
    const prefix = showSign && amount > 0 ? '+' : '';

    return (
        <span 
            className={`money-display ${colorClass} ${className}`.trim()}
            style={{
                ...colorStyle,
                // 1. Tabular Nums: Forces all numbers to be the exact same width.
                // This ensures cart totals and receipt columns align perfectly and never "jitter" when changing.
                fontVariantNumeric: 'tabular-nums',
                
                // 2. No Wrap: Prevents the currency symbol (ج.م) from ever dropping to a new line on small phone screens.
                whiteSpace: 'nowrap',
                
                ...style
            }}
        >
            {/* Using an inner span with unicode isolation ensures that adding a "+" 
              prefix doesn't break RTL (Arabic) rendering order.
            */}
            <bdi>
                {prefix}{formatEGP(amount)}
            </bdi>
        </span>
    );
}