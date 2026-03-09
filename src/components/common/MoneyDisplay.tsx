'use client';

import { formatEGP } from '@/utils/money';

interface MoneyDisplayProps {
    amount: number; // in piasters
    showSign?: boolean;
    className?: string;
}

export default function MoneyDisplay({ amount, showSign, className }: MoneyDisplayProps) {
    const isNegative = amount < 0;
    const colorClass = isNegative ? 'money-negative' : amount > 0 ? 'money-positive' : '';
    const prefix = showSign && amount > 0 ? '+' : '';

    return (
        <span className={`money-display ${colorClass} ${className || ''}`}>
            {prefix}{formatEGP(amount)}
        </span>
    );
}
