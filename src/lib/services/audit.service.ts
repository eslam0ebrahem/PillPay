import { connectDB } from '@/lib/db/connection';
import AuditLog from '@/lib/models/AuditLog';
import { Types } from 'mongoose';
import type { ClientSession } from 'mongoose';

interface LogActionParams {
    userId: string;
    action: string;
    entityType: string;
    entityId: string;
    details?: Record<string, unknown>;
    invoiceNumber?: string;
    productId?: string;
    session?: ClientSession;
}

/**
 * Create an immutable audit log entry.
 * Pass `session` to write the log inside an existing MongoDB transaction.
 */
export async function logAction(params: LogActionParams): Promise<void> {
    await connectDB();

    await AuditLog.create(
        [
            {
                userId: new Types.ObjectId(params.userId),
                action: params.action,
                entityType: params.entityType,
                entityId: new Types.ObjectId(params.entityId),
                details: params.details,
                invoiceNumber: params.invoiceNumber,
                productId: params.productId ? new Types.ObjectId(params.productId) : undefined,
                timestamp: new Date(),
            },
        ],
        params.session ? { session: params.session } : undefined
    );
}
