import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IStockTransfer extends Document {
    productId: mongoose.Types.ObjectId;
    batchId: mongoose.Types.ObjectId;
    quantity: number; // in base units
    direction: 'to_floor' | 'to_warehouse';
    reason: string;
    transferredBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const stockTransferSchema = new Schema<IStockTransfer>(
    {
        productId: {
            type: Schema.Types.ObjectId,
            ref: 'Product',
            required: true,
        },
        batchId: {
            type: Schema.Types.ObjectId,
            ref: 'Batch',
            required: true,
        },
        quantity: {
            type: Number,
            required: true,
            min: 1,
        },
        direction: {
            type: String,
            enum: ['to_floor', 'to_warehouse'],
            required: true,
        },
        reason: {
            type: String,
            required: true,
            trim: true,
        },
        transferredBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    { timestamps: true }
);

// Indexes for querying transfer history
stockTransferSchema.index({ productId: 1, createdAt: -1 });
stockTransferSchema.index({ createdAt: -1 });

const StockTransfer: Model<IStockTransfer> =
    mongoose.models.StockTransfer || mongoose.model<IStockTransfer>('StockTransfer', stockTransferSchema);

export default StockTransfer;
