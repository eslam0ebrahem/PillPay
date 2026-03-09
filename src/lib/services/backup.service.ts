import { EJSON } from 'bson';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db/connection';
import {
    AuditLog,
    BalanceAdjustment,
    Batch,
    Customer,
    CustomerPayment,
    InventoryAuditSession,
    Product,
    Refund,
    SaleInvoice,
    Settings,
    StockTransfer,
    Supplier,
    SupplierInvoice,
    SupplierPayment,
    SupplierReturn,
    User,
} from '@/lib/models';

type EJSONSerializableDocument = Parameters<typeof EJSON.deserialize>[0];

const BACKUP_MODELS = [
    User,
    Settings,
    Product,
    Supplier,
    Customer,
    SaleInvoice,
    SupplierInvoice,
    Batch,
    CustomerPayment,
    BalanceAdjustment,
    SupplierPayment,
    SupplierReturn,
    StockTransfer,
    Refund,
    InventoryAuditSession,
    AuditLog,
];

export interface BackupPayload {
    version: 1;
    exportedAt: string;
    collections: Record<string, unknown[]>;
}

function getCollectionNames() {
    return BACKUP_MODELS.map((model) => model.collection.collectionName);
}

function validateBackupPayload(value: unknown): BackupPayload {
    if (!value || typeof value !== 'object') {
        throw new Error('ملف النسخة الاحتياطية غير صالح');
    }

    const parsed = value as {
        version?: number;
        exportedAt?: string;
        collections?: Record<string, unknown>;
    };

    if (parsed.version !== 1 || typeof parsed.exportedAt !== 'string' || !parsed.collections) {
        throw new Error('هيكل ملف النسخة الاحتياطية غير صالح');
    }

    const missingCollections = getCollectionNames().filter(
        (collectionName) => !Array.isArray(parsed.collections?.[collectionName])
    );

    if (missingCollections.length > 0) {
        throw new Error(
            `النسخة الاحتياطية لا تحتوي على جميع المجموعات المطلوبة: ${missingCollections.join(', ')}`
        );
    }

    return parsed as BackupPayload;
}

export async function exportAllData(): Promise<BackupPayload> {
    await connectDB();

    const collections = Object.fromEntries(
        await Promise.all(
            BACKUP_MODELS.map(async (model) => {
                const documents = await model.collection.find({}).toArray();
                return [
                    model.collection.collectionName,
                    documents.map((document) =>
                        EJSON.serialize(document, { relaxed: false })
                    ),
                ];
            })
        )
    );

    return {
        version: 1,
        exportedAt: new Date().toISOString(),
        collections,
    };
}

export async function importFromJSON(rawData: string) {
    let parsedValue: unknown;

    try {
        parsedValue = JSON.parse(rawData);
    } catch {
        throw new Error('تعذر قراءة ملف النسخة الاحتياطية');
    }

    const backup = validateBackupPayload(parsedValue);
    await connectDB();

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const db = mongoose.connection.db;
        if (!db) {
            throw new Error('الاتصال بقاعدة البيانات غير متاح');
        }

        for (const collectionName of getCollectionNames()) {
            await db.collection(collectionName).deleteMany({}, { session });
        }

        const importedCounts: Record<string, number> = {};

        for (const model of BACKUP_MODELS) {
            const collectionName = model.collection.collectionName;
            const rawDocuments = backup.collections[collectionName] ?? [];
            const documents = rawDocuments.map((document) =>
                EJSON.deserialize(
                    document as EJSONSerializableDocument,
                    { relaxed: false }
                )
            );

            importedCounts[collectionName] = documents.length;

            if (documents.length > 0) {
                await db.collection(collectionName).insertMany(documents, { session });
            }
        }

        await session.commitTransaction();

        return {
            importedCollections: getCollectionNames().length,
            importedCounts,
            exportedAt: backup.exportedAt,
        };
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
}
