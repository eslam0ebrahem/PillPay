import { Schema, model, models, Document, Types } from 'mongoose';
import type {
    IBatchAllocation,
    ISaleItem,
    DiscountObj,
    PaymentMode,
    SaleInvoiceStatus,
    UnitSold,
} from '@/lib/types';

export interface ISaleInvoice extends Document {
    invoiceNumber: string;
    items: ISaleItem[];
    subtotal: number;
    invoiceDiscount?: DiscountObj;
    total: number;
    paidAmount: number;
    remainingBalance: number;
    paymentMode: PaymentMode;
    customerId?: Types.ObjectId;
    cashierId: Types.ObjectId;
    status: SaleInvoiceStatus;
    paymentStatus: 'paid' | 'unpaid' | 'partial';
    createdAt: Date;
    updatedAt: Date;
}

const batchAllocationSchema = new Schema<IBatchAllocation>({
    batchId: { type: Schema.Types.ObjectId, ref: 'Batch', required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitCost: { type: Number, required: true, min: 0 },
});

const saleItemSchema = new Schema<ISaleItem>({
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productNameAr: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitSold: { type: String, enum: ['base', 'sub'], required: true },
    displayQuantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    discount: {
        type: { type: String, enum: ['amount', 'percentage'] },
        value: { type: Number, min: 0 },
    },
    subtotal: { type: Number, required: true, min: 0 },
    batchAllocations: [batchAllocationSchema],
});

const saleInvoiceSchema = new Schema<ISaleInvoice>(
    {
        invoiceNumber: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        items: [saleItemSchema],
        subtotal: {
            type: Number,
            required: true,
            min: 0,
        },
        invoiceDiscount: {
            type: { type: String, enum: ['amount', 'percentage'] },
            value: { type: Number, min: 0 },
        },
        total: {
            type: Number,
            required: true,
            min: 0,
        },
        paidAmount: {
            type: Number,
            default: 0,
        },
        remainingBalance: {
            type: Number,
            default: 0,
        },
        paymentMode: {
            type: String,
            enum: ['cash', 'credit', 'partial'],
            required: true,
        },
        customerId: {
            type: Schema.Types.ObjectId,
            ref: 'Customer',
        },
        cashierId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        status: {
            type: String,
            enum: ['completed', 'cancelled'],
            default: 'completed',
        },
        paymentStatus: {
            type: String,
            enum: ['paid', 'unpaid', 'partial'],
            required: true,
            default: 'paid',
        },
    },
    { timestamps: true }
);

// Indexes
// For reports: filtering by date and status
saleInvoiceSchema.index({ createdAt: -1, status: 1 });
// For customer history
saleInvoiceSchema.index({ customerId: 1, createdAt: -1 });
// For FIFO payment allocation: find unpaid/partial invoices for a customer sorted by date
saleInvoiceSchema.index({ customerId: 1, paymentStatus: 1, createdAt: 1 });
// For cashier activity / shift reports
saleInvoiceSchema.index({ cashierId: 1, createdAt: -1 });
// For refunds lookup inside items
saleInvoiceSchema.index({ 'items.productId': 1 });

// Disable direct modification of completed invoices to enforce immutability rules.
// Refunds should be used instead.
saleInvoiceSchema.pre('save', function (next) {
    if (!this.isNew && this.status === 'completed' && this.isModified('items')) {
        next(new Error('Cannot modify items of a completed invoice. Create a refund instead.'));
    } else {
        next();
    }
});

const SaleInvoice = models.SaleInvoice || model<ISaleInvoice>('SaleInvoice', saleInvoiceSchema);

export default SaleInvoice;
