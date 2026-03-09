import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISupplierInvoiceItem {
    productId: mongoose.Types.ObjectId;
    batchNumber: string;
    expirationDate: Date;
    quantity: number;
    unitCost: number; // in piasters
    lineTotal: number; // in piasters
}

export interface ISupplierInvoice extends Document {
    invoiceNumber: string;
    supplierId: mongoose.Types.ObjectId;
    date: Date;
    items: ISupplierInvoiceItem[];
    total: number; // in piasters
    paidAmount: number; // in piasters
    remainingBalance: number; // in piasters
    status: 'active' | 'voided';
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

const supplierInvoiceItemSchema = new Schema<ISupplierInvoiceItem>({
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    batchNumber: { type: String, required: true },
    expirationDate: { type: Date, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitCost: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
});

const supplierInvoiceSchema = new Schema<ISupplierInvoice>(
    {
        invoiceNumber: { type: String, required: true },
        supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
        date: { type: Date, required: true },
        items: [supplierInvoiceItemSchema],
        total: { type: Number, required: true, min: 0 },
        paidAmount: { type: Number, default: 0, min: 0 },
        remainingBalance: { type: Number, default: 0 },
        status: { type: String, enum: ['active', 'voided'], default: 'active' },
        notes: { type: String },
    },
    { timestamps: true }
);

supplierInvoiceSchema.index({ supplierId: 1, date: -1 });
supplierInvoiceSchema.index({ invoiceNumber: 1 });

const SupplierInvoice: Model<ISupplierInvoice> =
    mongoose.models.SupplierInvoice || mongoose.model<ISupplierInvoice>('SupplierInvoice', supplierInvoiceSchema);

export default SupplierInvoice;
