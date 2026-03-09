/**
 * Server-side piaster-based money helpers.
 * All monetary values stored as integers in piasters (1 EGP = 100 piasters).
 */

/** Convert EGP (float) to piasters (integer) */
export function toPiasters(egp: number): number {
    return Math.round(egp * 100);
}

/** Convert piasters (integer) to EGP (float) */
export function toEGP(piasters: number): number {
    return piasters / 100;
}

/** Format piasters as EGP string with ج.م suffix */
export function formatMoney(piasters: number): string {
    const egp = toEGP(piasters);
    return `${egp.toFixed(2)} ج.م`;
}

/** Calculate discount amount in piasters */
export function calcDiscountAmount(
    subtotal: number,
    discount?: { type: 'amount' | 'percentage'; value: number }
): number {
    if (!discount || discount.value === 0) return 0;

    if (discount.type === 'amount') {
        return Math.min(discount.value, subtotal); // Cap at subtotal
    }

    // Percentage: value is in basis points (10000 = 100%)
    return Math.round((subtotal * discount.value) / 10000);
}

/** Calculate subtotal after discount */
export function calcSubtotal(
    unitPrice: number,
    quantity: number,
    discount?: { type: 'amount' | 'percentage'; value: number }
): number {
    const gross = unitPrice * quantity;
    const discountAmount = calcDiscountAmount(gross, discount);
    return Math.max(0, gross - discountAmount);
}
