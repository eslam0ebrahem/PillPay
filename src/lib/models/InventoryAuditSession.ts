import { Document, Schema, Types, model, models } from 'mongoose';
import type { AuditSessionStatus, IAuditCount } from '@/lib/types';

export interface IInventoryAuditSession extends Document {
    status: AuditSessionStatus;
    counts: IAuditCount[];
    startedBy: Types.ObjectId;
    startedAt: Date;
    completedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

const auditCountSchema = new Schema<IAuditCount>(
    {
        productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        location: { type: String, enum: ['warehouse', 'floor'], required: true },
        expectedQty: { type: Number, required: true, min: 0 },
        actualQty: { type: Number, required: true, min: 0 },
        discrepancy: { type: Number, required: true, default: 0 },
        adjusted: { type: Boolean, required: true, default: false },
    },
    { _id: false }
);

const inventoryAuditSessionSchema = new Schema<IInventoryAuditSession>(
    {
        status: {
            type: String,
            enum: ['in_progress', 'completed'],
            required: true,
            default: 'in_progress',
        },
        counts: {
            type: [auditCountSchema],
            default: [],
        },
        startedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        startedAt: { type: Date, required: true, default: Date.now },
        completedAt: { type: Date, default: null },
    },
    { timestamps: true }
);

inventoryAuditSessionSchema.index({ status: 1 });
inventoryAuditSessionSchema.index({ startedAt: -1 });

const InventoryAuditSession =
    models.InventoryAuditSession ||
    model<IInventoryAuditSession>('InventoryAuditSession', inventoryAuditSessionSchema);

export default InventoryAuditSession;
