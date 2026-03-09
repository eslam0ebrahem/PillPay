import { connectDB } from '@/lib/db/connection';
import Customer from '@/lib/models/Customer';
import SaleInvoice from '@/lib/models/SaleInvoice';
import CustomerPayment from '@/lib/models/CustomerPayment';
import BalanceAdjustment from '@/lib/models/BalanceAdjustment';
import { logAction } from '@/lib/services/audit.service';
import mongoose from 'mongoose';

export async function recordCustomerPayment(customerId: string, amount: number, userId: string) {
    await connectDB();
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const customer = await Customer.findById(customerId).session(session);
        if (!customer) throw new Error('العميل غير موجود');
        if (customer.totalOwed <= 0) throw new Error('لا توجد مديونية مستحقة لهذا العميل');

        const amountToApply = Math.min(amount, customer.totalOwed);

        // FIFO Allocation: Find oldest unpaid invoices
        const unpaidInvoices = await SaleInvoice.find({
            customerId,
            paymentStatus: { $in: ['unpaid', 'partial'] }
        }).sort({ createdAt: 1 }).session(session);

        let remainingAmount = amountToApply;
        const allocations = [];

        for (const invoice of unpaidInvoices) {
            if (remainingAmount <= 0) break;

            const invoiceRemaining = invoice.total - invoice.paidAmount;
            const allocated = Math.min(remainingAmount, invoiceRemaining);

            invoice.paidAmount += allocated;
            if (invoice.paidAmount >= invoice.total) {
                invoice.paymentStatus = 'paid';
            } else {
                invoice.paymentStatus = 'partial';
            }
            await invoice.save({ session });

            allocations.push({
                invoiceId: invoice._id,
                amount: allocated
            });

            remainingAmount -= allocated;
        }

        const payment = new CustomerPayment({
            customerId,
            amount: amountToApply,
            allocations,
            receivedBy: userId
        });
        await payment.save({ session });

        // Update customer totalOwed (reduce Debt)
        const oldBalance = customer.totalOwed;
        customer.totalOwed = Math.max(0, customer.totalOwed - amountToApply);
        await customer.save({ session });

        await session.commitTransaction();

        await logAction({
            userId,
            action: 'CUSTOMER_PAYMENT_RECORDED',
            entityType: 'CustomerPayment',
            entityId: payment._id.toString(),
            details: {
                requestedAmount: amount,
                appliedAmount: amountToApply,
                oldBalance,
                newBalance: customer.totalOwed,
                customerId,
                allocations,
            }
        });

        return payment;
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
}

export async function adjustCustomerBalance(customerId: string, amountChange: number, reason: string, userId: string) {
    await connectDB();
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const customer = await Customer.findById(customerId).session(session);
        if (!customer) throw new Error('العميل غير موجود');

        const oldBalance = customer.totalOwed;
        customer.totalOwed += amountChange;

        await customer.save({ session });

        const adjustment = new BalanceAdjustment({
            entityType: 'customer',
            entityId: customerId,
            amount: amountChange,
            reason,
            adjustedBy: userId
        });
        await adjustment.save({ session });

        await session.commitTransaction();

        await logAction({
            userId,
            action: 'CUSTOMER_BALANCE_ADJUSTED',
            entityType: 'BalanceAdjustment',
            entityId: adjustment._id.toString(),
            details: { oldBalance, newBalance: customer.totalOwed, amountChange, reason }
        });

        return { customer, adjustment };
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
}
