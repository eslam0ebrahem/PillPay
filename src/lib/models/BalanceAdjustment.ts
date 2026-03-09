import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBalanceAdjustment extends Document {
    entityType: 'customer' | 'supplier';
    entityId: mongoose.Types.ObjectId;
    amount: number; // positive = increase owed amount, negative = decrease owed amount
    reason: string;
    adjustedBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const balanceAdjustmentSchema = new Schema<IBalanceAdjustment>(
    {
        entityType: { type: String, enum: ['customer', 'supplier'], required: true },
        entityId: { type: Schema.Types.ObjectId, required: true, refPath: 'entityType' },
        amount: { type: Number, required: true },
        reason: { type: String, required: true },
        adjustedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    },
    { timestamps: true }
);

balanceAdjustmentSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

const BalanceAdjustment: Model<IBalanceAdjustment> =
    mongoose.models.BalanceAdjustment || mongoose.model<IBalanceAdjustment>('BalanceAdjustment', balanceAdjustmentSchema);

export default BalanceAdjustment;
