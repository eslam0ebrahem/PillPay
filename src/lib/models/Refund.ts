import mongoose, { Document, Model, Schema } from 'mongoose';
import { generateRefundNumber } from '@/lib/utils/invoiceNumber';

export interface IRefundItem {
    productId: mongoose.Types.ObjectId;
    quantity: number;
    unitPrice: number;
    subtotal: number;
}

export interface IRefund extends Document {
    refundNumber: string;
    originalInvoiceId?: mongoose.Types.ObjectId | null;
    items: IRefundItem[];
    total: number;
    customerId?: mongoose.Types.ObjectId | null;
    processedBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const refundItemSchema = new Schema<IRefundItem>(
    {
        productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        quantity: { type: Number, required: true, min: 1 },
        unitPrice: { type: Number, required: true, min: 0 },
        subtotal: { type: Number, required: true, min: 0 },
    },
    { _id: false }
);

const refundSchema = new Schema<IRefund>(
    {
        refundNumber: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        originalInvoiceId: {
            type: Schema.Types.ObjectId,
            ref: 'SaleInvoice',
            default: null,
        },
        items: {
            type: [refundItemSchema],
            required: true,
            validate: {
                validator: (items: IRefundItem[]) => items.length > 0,
                message: 'يجب إدخال صنف واحد على الأقل في المرتجع',
            },
        },
        total: { type: Number, required: true, min: 0 },
        customerId: {
            type: Schema.Types.ObjectId,
            ref: 'Customer',
            default: null,
        },
        processedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    },
    { timestamps: true }
);

refundSchema.index({ originalInvoiceId: 1 });
refundSchema.index({ customerId: 1 });
refundSchema.index({ createdAt: -1 });

refundSchema.pre('validate', async function assignRefundNumber(next) {
    if (!this.isNew || this.refundNumber) {
        next();
        return;
    }

    try {
        this.refundNumber = await generateRefundNumber();
        next();
    } catch (error) {
        next(error as Error);
    }
});

const Refund: Model<IRefund> =
    mongoose.models.Refund || mongoose.model<IRefund>('Refund', refundSchema);

export default Refund;
