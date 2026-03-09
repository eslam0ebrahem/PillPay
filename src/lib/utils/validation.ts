import { z } from 'zod';

// --- Login ---
export const loginSchema = z.object({
    email: z.string().email('البريد الإلكتروني غير صالح'),
    password: z.string().min(1, 'كلمة المرور مطلوبة'),
});

// --- Discount ---
const discountSchema = z.object({
    type: z.enum(['amount', 'percentage']),
    value: z.number().int().min(0),
}).optional();

// --- Product ---
export const productSchema = z.object({
    barcode: z.string().nullable().optional(),
    nameAr: z.string().min(1, 'اسم المنتج بالعربية مطلوب'),
    nameEn: z.string().optional(),
    imageUrl: z.string().optional(),
    manufacturer: z.string().optional(),
    category: z.string().optional(),
    description: z.string().optional(),
    activeIngredient: z.string().optional(),
    dosageForm: z.string().optional(),
    route: z.string().optional(),
    uses: z.string().optional(),
    pharmacology: z.string().optional(),
    sellingPrice: z.number().int().min(0, 'سعر البيع يجب أن يكون 0 أو أكثر'),
    baseUnit: z.string().min(1, 'وحدة القياس الأساسية مطلوبة'),
    subUnit: z.string().nullable().optional(),
    subUnitConversionFactor: z.number().int().min(1).nullable().optional(),
    lowStockThreshold: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
});

// --- Customer ---
export const customerSchema = z.object({
    name: z.string().min(1, 'اسم العميل مطلوب'),
    phone: z.string().nullable().optional(),
});

// --- Supplier ---
export const supplierSchema = z.object({
    name: z.string().min(1, 'اسم المورد مطلوب'),
    phone: z.string().optional(),
    address: z.string().optional(),
    contactPerson: z.string().optional(),
    notes: z.string().optional(),
});

// --- Checkout ---
export const checkoutItemSchema = z.object({
    productId: z.string().min(1),
    quantity: z.number().int().min(1, 'الكمية يجب أن تكون 1 أو أكثر'),
    unitSold: z.enum(['base', 'sub']),
    discount: discountSchema,
});

export const checkoutSchema = z.object({
    items: z.array(checkoutItemSchema).min(1, 'يجب إضافة منتج واحد على الأقل'),
    invoiceDiscount: discountSchema,
    paymentMode: z.enum(['cash', 'credit', 'partial']),
    paidAmount: z.number().int().min(0).optional(),
    customerId: z.string().nullable().optional(),
});

// --- Stock Transfer ---
export const transferSchema = z.object({
    productId: z.string().min(1),
    batchId: z.string().min(1),
    quantity: z.number().int().min(1, 'الكمية يجب أن تكون 1 أو أكثر'),
    direction: z.enum(['to_floor', 'to_warehouse']),
    reason: z.string().min(1, 'سبب النقل مطلوب'),
});

// --- Refund ---
export const refundItemSchema = z.object({
    productId: z.string().min(1),
    quantity: z.number().int().min(1),
    unitPrice: z.number().int().min(0),
});

export const refundSchema = z.object({
    originalInvoiceId: z.string().nullable().optional(),
    items: z.array(refundItemSchema).min(1, 'يجب إضافة منتج واحد على الأقل'),
});

// --- Settings ---
export const settingsSchema = z.object({
    expiringSoonDays: z.number().int().min(1, 'يجب تحديد عدد أيام قبل الانتهاء'),
    defaultLowStockThreshold: z.number().int().min(0),
    maxDiscountPercentage: z.number().int().min(0).max(10000),
});

// --- Supplier Invoice ---
export const supplierInvoiceItemSchema = z.object({
    productId: z.string().min(1),
    batchNumber: z.string().min(1, 'رقم التشغيلة مطلوب'),
    expirationDate: z.string().min(1, 'تاريخ الانتهاء مطلوب'),
    quantity: z.number().int().min(1),
    unitCost: z.number().int().min(0),
});

export const supplierInvoiceSchema = z.object({
    invoiceNumber: z.string().min(1, 'رقم الفاتورة مطلوب'),
    supplierId: z.string().min(1),
    date: z.string().min(1, 'تاريخ الفاتورة مطلوب'),
    items: z.array(supplierInvoiceItemSchema).min(1, 'يجب إضافة صنف واحد على الأقل'),
    notes: z.string().optional(),
});

// --- Stock Adjustment ---
export const stockAdjustmentSchema = z.object({
    productId: z.string().min(1),
    batchId: z.string().min(1),
    location: z.enum(['warehouse', 'floor']),
    newQuantity: z.number().int().min(0),
    reason: z.string().min(1, 'سبب التعديل مطلوب'),
});

// --- User ---
export const createUserSchema = z.object({
    email: z.string().email('البريد الإلكتروني غير صالح'),
    password: z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
    name: z.string().min(1, 'الاسم مطلوب'),
    role: z.enum(['owner', 'cashier']),
    permissions: z.array(z.string()).optional(),
});

export const updateUserSchema = z.object({
    name: z.string().min(1).optional(),
    email: z.string().email().optional(),
    role: z.enum(['owner', 'cashier']).optional(),
    permissions: z.array(z.string()).optional(),
    isActive: z.boolean().optional(),
    password: z.string().min(6).optional(),
});

// --- Balance Adjustment ---
export const balanceAdjustmentSchema = z.object({
    amount: z.number().int(),
    reason: z.string().min(1, 'سبب التعديل مطلوب'),
});

// --- Customer Payment ---
export const customerPaymentSchema = z.object({
    amount: z.number().int().min(1, 'مبلغ الدفع يجب أن يكون أكبر من صفر'),
});

// --- Supplier Payment ---
export const supplierPaymentSchema = z.object({
    amount: z.number().int().min(1, 'مبلغ الدفع يجب أن يكون أكبر من صفر'),
});
