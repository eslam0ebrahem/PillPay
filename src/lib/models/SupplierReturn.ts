import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IReturnItem {
    productId: mongoose.Types.ObjectId;
    batchId: mongoose.Types.ObjectId;
    quantity: number;
    unitCost: number; // in piasters
    lineTotal: number; // in piasters
}

export interface ISupplierReturn extends Document {
    supplierId: mongoose.Types.ObjectId;
    supplierInvoiceId?: mongoose.Types.ObjectId;
    items: IReturnItem[];
    total: number; // in piasters
    processedBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const returnItemSchema = new Schema<IReturnItem>({
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    batchId: { type: Schema.Types.ObjectId, ref: 'Batch', required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitCost: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
});

const supplierReturnSchema = new Schema<ISupplierReturn>(
    {
        supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
        supplierInvoiceId: { type: Schema.Types.ObjectId, ref: 'SupplierInvoice' },
        items: [returnItemSchema],
        total: { type: Number, required: true, min: 0 },
        processedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    },
    { timestamps: true }
);

supplierReturnSchema.index({ supplierId: 1, createdAt: -1 });

const SupplierReturn: Model<ISupplierReturn> =
    mongoose.models.SupplierReturn || mongoose.model<ISupplierReturn>('SupplierReturn', supplierReturnSchema);

export default SupplierReturn;
