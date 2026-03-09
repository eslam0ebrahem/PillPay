import { connectDB } from '@/lib/db/connection';
import mongoose, { Schema, model, models } from 'mongoose';

interface ICounter {
    _id: string;
    seq: number;
}

const counterSchema = new Schema<ICounter>({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
});

const Counter = models.Counter || model<ICounter>('Counter', counterSchema);

function getDatePrefix(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}${m}${d}`;
}

async function getNextSequence(prefix: string): Promise<number> {
    await connectDB();
    const counter = await Counter.findByIdAndUpdate(
        prefix,
        { $inc: { seq: 1 } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return counter.seq;
}

/** Generate sequential invoice number: INV-YYYYMMDD-NNNN */
export async function generateInvoiceNumber(): Promise<string> {
    const datePrefix = getDatePrefix();
    const key = `INV-${datePrefix}`;
    const seq = await getNextSequence(key);
    return `${key}-${String(seq).padStart(4, '0')}`;
}

/** Generate sequential refund number: REF-YYYYMMDD-NNNN */
export async function generateRefundNumber(): Promise<string> {
    const datePrefix = getDatePrefix();
    const key = `REF-${datePrefix}`;
    const seq = await getNextSequence(key);
    return `${key}-${String(seq).padStart(4, '0')}`;
}
