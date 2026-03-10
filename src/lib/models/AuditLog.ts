import { Schema, model, models, Document, Types } from 'mongoose';

export interface IAuditLog extends Document {
    userId: Types.ObjectId;
    action: string;
    entityType: string;
    entityId: Types.ObjectId;
    details?: Record<string, unknown>;
    invoiceNumber?: string;
    productId?: Types.ObjectId;
    timestamp: Date;
}

const auditLogSchema = new Schema<IAuditLog>({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    action: {
        type: String,
        required: true,
        trim: true,
    },
    entityType: {
        type: String,
        required: true,
        trim: true,
    },
    entityId: {
        type: Schema.Types.ObjectId,
        required: true,
    },
    details: {
        type: Schema.Types.Mixed,
    },
    invoiceNumber: {
        type: String,
        sparse: true,
    },
    productId: {
        type: Schema.Types.ObjectId,
        sparse: true,
    },
    timestamp: {
        type: Date,
        required: true,
        default: Date.now,
    },
});

// Indexes for query patterns
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });
// For reports: filtering by date and status
auditLogSchema.index({ timestamp: -1 });

// IMMUTABILITY: Block update and delete operations
auditLogSchema.pre('updateOne', function () {
    throw new Error('Audit logs cannot be modified');
});
auditLogSchema.pre('updateMany', function () {
    throw new Error('Audit logs cannot be modified');
});
auditLogSchema.pre('findOneAndUpdate', function () {
    throw new Error('Audit logs cannot be modified');
});
auditLogSchema.pre('findOneAndDelete', function () {
    throw new Error('Audit logs cannot be deleted');
});
auditLogSchema.pre('deleteOne', function () {
    throw new Error('Audit logs cannot be deleted');
});
auditLogSchema.pre('deleteMany', function () {
    throw new Error('Audit logs cannot be deleted');
});

const AuditLog = models.AuditLog || model<IAuditLog>('AuditLog', auditLogSchema);

export default AuditLog;
