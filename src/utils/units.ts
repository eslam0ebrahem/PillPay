/**
 * Client-side unit conversion helpers for display purposes.
 */

/** Convert base units to sub-units for display */
export function convertToSubUnits(baseQty: number, conversionFactor: number): number {
    return baseQty * conversionFactor;
}

/** Convert sub-units to base units for storage */
export function convertToBaseUnits(subQty: number, conversionFactor: number): number {
    return Math.round(subQty / conversionFactor);
}

/** Get appropriate display unit label */
export function getDisplayUnit(
    unitSold: 'base' | 'sub',
    baseUnit: string,
    subUnit?: string | null
): string {
    if (unitSold === 'sub' && subUnit) {
        return subUnit;
    }
    return baseUnit;
}

/** Convert quantity for display based on unit type */
export function getDisplayQuantity(
    baseQuantity: number,
    unitSold: 'base' | 'sub',
    conversionFactor?: number | null
): number {
    if (unitSold === 'sub' && conversionFactor && conversionFactor > 0) {
        return baseQuantity * conversionFactor;
    }
    return baseQuantity;
}
