/**
 * Client-side money display helpers.
 */

/** Format piaster amount as EGP display string */
export function formatEGP(piasters: number): string {
    const egp = piasters / 100;
    return `${egp.toFixed(2)} ج.م`;
}

/** Format piaster amount as plain number string (no suffix) */
export function formatPiasters(piasters: number): string {
    return (piasters / 100).toFixed(2);
}
