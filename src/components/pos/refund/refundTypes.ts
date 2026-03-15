export interface InvoiceLookupItem {
    saleItemId: string;
    productId: string;
    productNameAr: string;
    productNameEn?: string;
    imageUrl?: string;
    quantity: number;
    refundedQuantity: number;
    refundableQuantity: number;
    unitPrice: number;
    subtotal: number;
    unitSold: 'base' | 'sub';
    displayQuantity: number;
}

export interface InvoiceLookupResult {
    _id: string;
    invoiceNumber: string;
    status: 'completed' | 'cancelled';
    total: number;
    paidAmount: number;
    remainingBalance: number;
    paymentMode: 'cash' | 'credit' | 'partial';
    createdAt: string;
    customerId: string | null;
    customerName: string | null;
    items: InvoiceLookupItem[];
}

export interface CustomerOption {
    _id: string;
    name: string;
}

export interface StandaloneRefundItem {
    id: string;
    productId?: string;
    productName?: string;
    productNameEn?: string;
    imageUrl?: string;
    quantity: number;
    unitPrice: number;
}

export function createStandaloneItem(): StandaloneRefundItem {
    return {
        id: Math.random().toString(36).slice(2),
        quantity: 1,
        unitPrice: 0,
    };
}
