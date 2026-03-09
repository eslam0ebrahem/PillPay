import { Types } from 'mongoose';

// --- Roles ---
export type UserRole = 'owner' | 'cashier';

// --- Permission Keys ---
export type PermissionKey =
    | 'pos.search'
    | 'pos.checkout'
    | 'pos.cancel'
    | 'products.view'
    | 'products.manage'
    | 'customers.view'
    | 'customers.create'
    | 'customers.manage'
    | 'customers.payments'
    | 'refunds.create'
    | 'refunds.view'
    | 'stock.view'
    | 'stock.transfer'
    | 'stock.adjust'
    | 'suppliers.view'
    | 'suppliers.manage'
    | 'supplier-invoices.view'
    | 'supplier-invoices.manage'
    | 'supplier-invoices.payments'
    | 'reports.view'
    | 'balance.adjust'
    | 'inventory-audits.manage'
    | 'users.manage'
    | 'settings.view'
    | 'settings.manage'
    | 'backup.manage'
    | 'audit-logs.view';

export const CASHIER_DEFAULT_PERMISSIONS: PermissionKey[] = [
    'pos.search',
    'pos.checkout',
    'pos.cancel',
    'products.view',
    'customers.view',
    'customers.create',
    'customers.payments',
    'refunds.create',
    'refunds.view',
    'stock.view',
];

export const ALL_PERMISSIONS: PermissionKey[] = [
    'pos.search',
    'pos.checkout',
    'pos.cancel',
    'products.view',
    'products.manage',
    'customers.view',
    'customers.create',
    'customers.manage',
    'customers.payments',
    'refunds.create',
    'refunds.view',
    'stock.view',
    'stock.transfer',
    'stock.adjust',
    'suppliers.view',
    'suppliers.manage',
    'supplier-invoices.view',
    'supplier-invoices.manage',
    'supplier-invoices.payments',
    'reports.view',
    'balance.adjust',
    'inventory-audits.manage',
    'users.manage',
    'settings.view',
    'settings.manage',
    'backup.manage',
    'audit-logs.view',
];

// --- Payment ---
export type PaymentMode = 'cash' | 'credit' | 'partial';

// --- Discount ---
export interface DiscountObj {
    type: 'amount' | 'percentage';
    value: number; // amount in piasters, or percentage * 100 (basis points)
}

// --- Sale Invoice Status ---
export type SaleInvoiceStatus = 'completed' | 'cancelled';

// --- Supplier Invoice Status ---
export type SupplierInvoiceStatus = 'active' | 'voided';

// --- Stock Transfer Direction ---
export type TransferDirection = 'to_floor' | 'to_warehouse';

// --- Balance Adjustment Entity Type ---
export type BalanceEntityType = 'customer' | 'supplier';

// --- Audit Session Status ---
export type AuditSessionStatus = 'in_progress' | 'completed';

// --- Stock Location ---
export type StockLocation = 'warehouse' | 'floor';

// --- Unit Sold ---
export type UnitSold = 'base' | 'sub';

// --- POS Frontend Interfaces ---
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

export interface CartItem {
    id: string;
    product: ProductSearchResult;
    quantity: number;
    unitSold: UnitSold;
    discount?: DiscountObj;
    computedUnitPrice: number;
    computedSubtotal: number;
}

// --- Pagination ---
export interface PaginationParams {

    page: number;
    limit: number;
}

export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
    };
}

// --- API Error ---
export interface ApiErrorDetail {
    field: string;
    message: string;
}

export interface ApiErrorResponse {
    error: {
        code: string;
        message: string;
        details?: ApiErrorDetail[];
    };
}

// --- Batch Allocation (embedded in SaleItem) ---
export interface IBatchAllocation {
    batchId: Types.ObjectId;
    quantity: number;
    unitCost: number;
}

// --- Sale Item (embedded in SaleInvoice) ---
export interface ISaleItem {
    productId: Types.ObjectId;
    productNameAr: string;
    quantity: number;
    unitSold: UnitSold;
    displayQuantity: number;
    unitPrice: number;
    discount?: DiscountObj;
    subtotal: number;
    batchAllocations: IBatchAllocation[];
}

// --- Supplier Invoice Item (embedded) ---
export interface ISupplierInvoiceItem {
    productId: Types.ObjectId;
    batchNumber: string;
    expirationDate: Date;
    quantity: number;
    unitCost: number;
    lineTotal: number;
}

// --- Payment Allocation (embedded in CustomerPayment) ---
export interface IPaymentAllocation {
    invoiceId: Types.ObjectId;
    amount: number;
}

// --- Return Item (embedded in SupplierReturn) ---
export interface IReturnItem {
    productId: Types.ObjectId;
    batchId: Types.ObjectId;
    quantity: number;
    unitCost: number;
    lineTotal: number;
}

// --- Refund Item (embedded in Refund) ---
export interface IRefundItem {
    productId: Types.ObjectId;
    quantity: number;
    unitPrice: number;
    subtotal: number;
}

// --- Audit Count (embedded in InventoryAuditSession) ---
export interface IAuditCount {
    productId: Types.ObjectId;
    location: StockLocation;
    expectedQty: number;
    actualQty: number;
    discrepancy: number;
    adjusted: boolean;
}

// --- Authenticated User (JWT payload) ---
export interface AuthUser {
    _id: string;
    email: string;
    name: string;
    role: UserRole;
    permissions: PermissionKey[];
    isActive: boolean;
}

// --- JWT Payload ---
export interface JWTPayload {
    userId: string;
    email: string;
    role: UserRole;
}
