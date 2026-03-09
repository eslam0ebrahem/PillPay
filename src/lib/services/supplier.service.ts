import { connectDB } from '@/lib/db/connection';
import Supplier from '@/lib/models/Supplier';
import SupplierInvoice from '@/lib/models/SupplierInvoice';
import SupplierPayment from '@/lib/models/SupplierPayment';
import SupplierReturn from '@/lib/models/SupplierReturn';
import Batch from '@/lib/models/Batch';
import { logAction } from '@/lib/services/audit.service';
import mongoose from 'mongoose';

export async function createSupplierInvoice(invoiceData: any, userId: string) {
    await connectDB();
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const invoice = new SupplierInvoice({
            ...invoiceData,
            remainingBalance: invoiceData.total - (invoiceData.paidAmount || 0),
            status: 'active'
        });
        await invoice.save({ session });

        for (const item of invoiceData.items) {
            const batch = new Batch({
                productId: item.productId,
                batchNumber: item.batchNumber,
                expirationDate: item.expirationDate,
                purchasePrice: item.unitCost,
                warehouseQty: item.quantity,
                floorQty: 0,
                supplierId: invoice.supplierId,
                supplierInvoiceId: invoice._id
            });
            await batch.save({ session });
        }

        const supplier = await Supplier.findById(invoice.supplierId).session(session);
        if (supplier) {
            supplier.totalOwed += invoice.remainingBalance;
            await supplier.save({ session });
        }

        if (invoiceData.paidAmount > 0) {
            const payment = new SupplierPayment({
                supplierId: invoice.supplierId,
                supplierInvoiceId: invoice._id,
                amount: invoiceData.paidAmount,
                paidBy: userId
            });
            await payment.save({ session });
        }

        await session.commitTransaction();

        await logAction({
            userId,
            action: 'SUPPLIER_INVOICE_CREATE',
            entityType: 'SupplierInvoice',
            entityId: invoice._id.toString(),
            details: { invoiceNumber: invoice.invoiceNumber, total: invoice.total }
        });

        return invoice;
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
}

export async function recordSupplierPayment(supplierId: string, amount: number, userId: string, invoiceId?: string) {
    await connectDB();
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const payment = new SupplierPayment({
            supplierId,
            supplierInvoiceId: invoiceId,
            amount,
            paidBy: userId
        });
        await payment.save({ session });

        const supplier = await Supplier.findById(supplierId).session(session);
        if (!supplier) throw new Error('المورد غير موجود');

        supplier.totalOwed -= amount; // Amount paid reduces what we owe
        await supplier.save({ session });

        if (invoiceId) {
            const invoice = await SupplierInvoice.findById(invoiceId).session(session);
            if (invoice) {
                invoice.paidAmount += amount;
                invoice.remainingBalance -= amount;
                await invoice.save({ session });
            }
        }

        await session.commitTransaction();

        await logAction({
            userId,
            action: 'SUPPLIER_PAYMENT',
            entityType: 'SupplierPayment',
            entityId: payment._id.toString(),
            details: { amount, supplierId, invoiceId }
        });

        return payment;
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
}

export async function voidSupplierInvoice(invoiceId: string, userId: string) {
    await connectDB();
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const invoice = await SupplierInvoice.findById(invoiceId).session(session);
        if (!invoice) throw new Error('الفاتورة غير موجودة');
        if (invoice.status === 'voided') throw new Error('الفاتورة ملغاة بالفعل');

        // Check batches: all batches from this invoice must not have been moved or sold
        // This is simplified: if any batch's warehouseQty + floorQty < initial quantity, we cannot void.
        const batches = await Batch.find({ supplierInvoiceId: invoiceId }).session(session);
        for (const batch of batches) {
            const originalItem = invoice.items.find(i =>
                i.productId.toString() === batch.productId.toString() && i.batchNumber === batch.batchNumber
            );
            if (!originalItem) continue;

            if (batch.warehouseQty + batch.floorQty < originalItem.quantity) {
                throw new Error(`لا يمكن إلغاء الفاتورة: تم استخدام أو بيع جزء من التشغيلة ${batch.batchNumber}`);
            }
        }

        // Reverse balances
        const supplier = await Supplier.findById(invoice.supplierId).session(session);
        if (supplier) {
            supplier.totalOwed -= invoice.remainingBalance;
            await supplier.save({ session });
        }

        // Delete batches
        await Batch.deleteMany({ supplierInvoiceId: invoiceId }).session(session);

        // Mark invoice voided
        invoice.status = 'voided';
        invoice.remainingBalance = 0;
        await invoice.save({ session });

        await session.commitTransaction();

        await logAction({
            userId,
            action: 'SUPPLIER_INVOICE_VOID',
            entityType: 'SupplierInvoice',
            entityId: invoiceId,
            details: { invoiceNumber: invoice.invoiceNumber }
        });

        return invoice;
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
}

export async function adjustSupplierBalance(supplierId: string, amountChange: number, reason: string, userId: string) {
    await connectDB();
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const supplier = await Supplier.findById(supplierId).session(session);
        if (!supplier) throw new Error('المورد غير موجود');

        const oldBalance = supplier.totalOwed;
        supplier.totalOwed += amountChange;

        await supplier.save({ session });
        await session.commitTransaction();

        await logAction({
            userId,
            action: 'SUPPLIER_BALANCE_ADJUST',
            entityType: 'Supplier',
            entityId: supplierId,
            details: { oldBalance, newBalance: supplier.totalOwed, amountChange, reason }
        });

        return supplier;
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
}

export async function processSupplierReturn(returnData: any, userId: string) {
    await connectDB();
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const supplier = await Supplier.findById(returnData.supplierId).session(session);
        if (!supplier) {
            throw new Error('المورد غير موجود');
        }

        for (const item of returnData.items) {
            const batch = await Batch.findById(item.batchId).session(session);
            if (!batch) {
                throw new Error('التشغيلة غير موجودة');
            }

            const availableQuantity = batch.warehouseQty + batch.floorQty;
            if (availableQuantity < item.quantity) {
                throw new Error('الكمية المرتجعة أكبر من المخزون المتاح');
            }

            let remaining = item.quantity;
            const warehouseDeduction = Math.min(batch.warehouseQty, remaining);
            batch.warehouseQty -= warehouseDeduction;
            remaining -= warehouseDeduction;

            if (remaining > 0) {
                batch.floorQty = Math.max(0, batch.floorQty - remaining);
            }

            await batch.save({ session });
        }

        const supplierReturn = new SupplierReturn({
            ...returnData,
            processedBy: userId,
        });
        await supplierReturn.save({ session });

        supplier.totalOwed = Math.max(0, supplier.totalOwed - returnData.total);
        await supplier.save({ session });

        if (returnData.supplierInvoiceId) {
            const invoice = await SupplierInvoice.findById(returnData.supplierInvoiceId).session(session);
            if (invoice) {
                invoice.total = Math.max(0, invoice.total - returnData.total);
                invoice.remainingBalance = Math.max(0, invoice.remainingBalance - returnData.total);
                await invoice.save({ session });
            }
        }

        await session.commitTransaction();

        await logAction({
            userId,
            action: 'SUPPLIER_RETURN_CREATED',
            entityType: 'SupplierReturn',
            entityId: supplierReturn._id.toString(),
            details: {
                supplierId: returnData.supplierId,
                total: returnData.total,
                itemCount: returnData.items.length,
            }
        });

        return supplierReturn;
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
}
