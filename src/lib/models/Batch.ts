import { Schema, model, models, Document, Types } from 'mongoose';

export interface IBatch extends Document {
    productId: Types.ObjectId;
    batchNumber: string;
    expirationDate: Date;
    purchasePrice: number;
    warehouseQty: number;
    floorQty: number;
    supplierInvoiceId?: Types.ObjectId;
    source: 'supplier_invoice' | 'initial_stock' | 'adjustment';
    notes?: string;
    createdAt: Date;
}

const batchSchema = new Schema<IBatch>({
    productId: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
    },
    batchNumber: {
        type: String,
        required: true,
        trim: true,
    },
    expirationDate: {
        type: Date,
        required: true,
    },
    purchasePrice: {
        type: Number,
        required: true,
        min: 0,
    },
    warehouseQty: {
        type: Number,
        default: 0,
        min: 0,
    },
    floorQty: {
        type: Number,
        default: 0,
        min: 0,
    },
    supplierInvoiceId: {
        type: Schema.Types.ObjectId,
        ref: 'SupplierInvoice',
    },
    source: {
        type: String,
        enum: ['supplier_invoice', 'initial_stock', 'adjustment'],
        default: 'supplier_invoice',
    },
    notes: {
        type: String,
        trim: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// FEFO queries: find batches sorted by expiration
batchSchema.index({ productId: 1, expirationDate: 1 });
// Available floor stock
batchSchema.index({ productId: 1, floorQty: 1 });
// Expiration alerts
batchSchema.index({ expirationDate: 1 });
// Supplier invoice lookup
batchSchema.index({ supplierInvoiceId: 1 });
// Source filter
batchSchema.index({ source: 1 });

const Batch = models.Batch || model<IBatch>('Batch', batchSchema);

export default Batch;
