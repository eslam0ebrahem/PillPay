import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISupplierPayment extends Document {
    supplierId: mongoose.Types.ObjectId;
    supplierInvoiceId?: mongoose.Types.ObjectId;
    amount: number; // in piasters
    paidBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const supplierPaymentSchema = new Schema<ISupplierPayment>(
    {
        supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
        supplierInvoiceId: { type: Schema.Types.ObjectId, ref: 'SupplierInvoice' },
        amount: { type: Number, required: true, min: 1 },
        paidBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    },
    { timestamps: true }
);

supplierPaymentSchema.index({ supplierId: 1, createdAt: -1 });

const SupplierPayment: Model<ISupplierPayment> =
    mongoose.models.SupplierPayment || mongoose.model<ISupplierPayment>('SupplierPayment', supplierPaymentSchema);

export default SupplierPayment;
