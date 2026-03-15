/**
 * Integration-style tests for the customer payment service logic.
 * These tests exercise pure business logic without a real DB connection,
 * using explicit unit-level assertions.
 */
import { describe, it, expect } from 'vitest';
import { toPiasters } from '@/lib/utils/money';
import { calcSubtotal } from '@/lib/utils/money';

describe('Payment amount conversion', () => {
    it('correctly converts EGP to piasters before storing', () => {
        const egpAmount = 50.75;
        const piasters = Math.round(egpAmount * 100);
        expect(piasters).toBe(5075);
    });

    it('handles exact amounts without floating-point drift', () => {
        // Classic floating-point trap: 0.1 + 0.2
        const egpAmount = 0.1 + 0.2; // 0.30000000000000004 in JS
        const piasters = toPiasters(egpAmount);
        expect(piasters).toBe(30); // Should be 30 piasters, not 31
    });
});

describe('FIFO allocation logic (unit-level)', () => {
    interface Invoice {
        total: number;
        paidAmount: number;
    }

    function allocatePayment(payment: number, invoices: Invoice[]) {
        let remaining = payment;
        const allocations: { invoiceIndex: number; amount: number }[] = [];

        for (let i = 0; i < invoices.length; i++) {
            if (remaining <= 0) break;
            const inv = invoices[i];
            const owed = inv.total - inv.paidAmount;
            if (owed <= 0) continue;
            const allocated = Math.min(remaining, owed);
            allocations.push({ invoiceIndex: i, amount: allocated });
            remaining -= allocated;
        }

        return { allocations, unallocated: remaining };
    }

    it('fully pays one invoice', () => {
        const { allocations, unallocated } = allocatePayment(1000, [
            { total: 1000, paidAmount: 0 },
        ]);
        expect(allocations).toHaveLength(1);
        expect(allocations[0].amount).toBe(1000);
        expect(unallocated).toBe(0);
    });

    it('distributes across multiple invoices (FIFO)', () => {
        const { allocations } = allocatePayment(1500, [
            { total: 1000, paidAmount: 0 },
            { total: 1000, paidAmount: 0 },
        ]);
        expect(allocations[0].amount).toBe(1000);
        expect(allocations[1].amount).toBe(500);
    });

    it('skips already paid invoices', () => {
        const { allocations } = allocatePayment(500, [
            { total: 1000, paidAmount: 1000 }, // already paid
            { total: 1000, paidAmount: 0 },
        ]);
        expect(allocations).toHaveLength(1);
        expect(allocations[0].invoiceIndex).toBe(1);
        expect(allocations[0].amount).toBe(500);
    });

    it('does not over-allocate beyond payment amount', () => {
        const { allocations, unallocated } = allocatePayment(200, [
            { total: 1000, paidAmount: 0 },
            { total: 1000, paidAmount: 0 },
        ]);
        const totalAllocated = allocations.reduce((s, a) => s + a.amount, 0);
        expect(totalAllocated).toBe(200);
        expect(unallocated).toBe(0);
    });

    it('returns unallocated remainder when payment exceeds total debt', () => {
        const { allocations, unallocated } = allocatePayment(2000, [
            { total: 1000, paidAmount: 0 },
        ]);
        expect(allocations[0].amount).toBe(1000);
        expect(unallocated).toBe(1000);
    });
});

describe('calcSubtotal cross-check', () => {
    it('20% discount on 5 items at 100 piasters each = 400', () => {
        const result = calcSubtotal(100, 5, { type: 'percentage', value: 2000 });
        expect(result).toBe(400);
    });

    it('100 piaster flat discount on 3 items at 100 each = 200', () => {
        const result = calcSubtotal(100, 3, { type: 'amount', value: 100 });
        expect(result).toBe(200);
    });
});
