import mongoose, { Document, Schema } from 'mongoose';

export interface IIdempotencyKey extends Document {
    key: string;
    userId: string;
    responseStatus: number;
    responseBody: string;
    createdAt: Date;
}

const IdempotencyKeySchema = new Schema<IIdempotencyKey>(
    {
        key: { type: String, required: true, unique: true },
        userId: { type: String, required: true },
        responseStatus: { type: Number, required: true },
        responseBody: { type: String, required: true },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
    }
);

// TTL: auto-delete after 24 hours
IdempotencyKeySchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

export default mongoose.models.IdempotencyKey ||
    mongoose.model<IIdempotencyKey>('IdempotencyKey', IdempotencyKeySchema);
