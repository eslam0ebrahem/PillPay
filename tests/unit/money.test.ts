import { describe, it, expect } from 'vitest';
import {
    toPiasters,
    toEGP,
    formatMoney,
    calcDiscountAmount,
    calcSubtotal,
} from '@/lib/utils/money';

describe('toPiasters', () => {
    it('converts whole EGP', () => expect(toPiasters(1)).toBe(100));
    it('converts fractional EGP', () => expect(toPiasters(1.5)).toBe(150));
    it('rounds to nearest piaster', () => expect(toPiasters(1.999)).toBe(200));
    it('handles zero', () => expect(toPiasters(0)).toBe(0));
    it('handles large amounts', () => expect(toPiasters(1000.25)).toBe(100025));
});

describe('toEGP', () => {
    it('converts piasters to EGP', () => expect(toEGP(100)).toBe(1));
    it('handles fractional results', () => expect(toEGP(150)).toBe(1.5));
    it('handles zero', () => expect(toEGP(0)).toBe(0));
});

describe('formatMoney', () => {
    it('formats with ج.م suffix', () => expect(formatMoney(100)).toBe('1.00 ج.م'));
    it('formats zero', () => expect(formatMoney(0)).toBe('0.00 ج.م'));
    it('formats 1250 piasters as 12.50 EGP', () => expect(formatMoney(1250)).toBe('12.50 ج.م'));
});

describe('calcDiscountAmount', () => {
    it('returns 0 when no discount', () => expect(calcDiscountAmount(1000)).toBe(0));
    it('returns 0 when discount value is 0', () =>
        expect(calcDiscountAmount(1000, { type: 'amount', value: 0 })).toBe(0));

    it('applies fixed amount discount', () =>
        expect(calcDiscountAmount(1000, { type: 'amount', value: 200 })).toBe(200));

    it('caps amount discount at subtotal', () =>
        expect(calcDiscountAmount(1000, { type: 'amount', value: 2000 })).toBe(1000));

    it('applies percentage discount (50% = 5000 basis points)', () =>
        expect(calcDiscountAmount(1000, { type: 'percentage', value: 5000 })).toBe(500));

    it('applies 100% percentage discount (10000 basis points)', () =>
        expect(calcDiscountAmount(1000, { type: 'percentage', value: 10000 })).toBe(1000));

    it('applies 10% percentage discount (1000 basis points)', () =>
        expect(calcDiscountAmount(2000, { type: 'percentage', value: 1000 })).toBe(200));
});

describe('calcSubtotal', () => {
    it('calculates gross without discount', () => expect(calcSubtotal(100, 3)).toBe(300));

    it('applies amount discount', () =>
        expect(calcSubtotal(100, 3, { type: 'amount', value: 50 })).toBe(250));

    it('applies percentage discount', () =>
        expect(calcSubtotal(100, 2, { type: 'percentage', value: 5000 })).toBe(100));

    it('never returns negative', () =>
        expect(calcSubtotal(100, 1, { type: 'amount', value: 9999 })).toBe(0));
});
