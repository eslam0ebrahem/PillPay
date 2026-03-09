import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/lib/auth/middleware';
import { connectDB } from '@/lib/db/connection';
import Customer from '@/lib/models/Customer';
import SaleInvoice from '@/lib/models/SaleInvoice';
import CustomerPayment from '@/lib/models/CustomerPayment';
import BalanceAdjustment from '@/lib/models/BalanceAdjustment';
import { z } from 'zod';

const updateCustomerSchema = z.object({
    name: z.string().min(1, 'اسم العميل مطلوب').optional(),
    phone: z.string().optional(),
});

export const GET = withPermission('customers.view', async (req: NextRequest, context: any) => {
    try {
        await connectDB();
        const params = await context.params;
        const id = params.id;

        const customer = await Customer.findById(id).lean();
        if (!customer) {
            return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'العميل غير موجود' } }, { status: 404 });
        }

        const unpaidInvoices = await SaleInvoice.find({
            customerId: id,
            paymentStatus: { $in: ['unpaid', 'partial'] }
        }).sort({ date: -1 }).lean();

        const recentPayments = await CustomerPayment.find({ customerId: id })
            .sort({ createdAt: -1 })
            .populate('receivedBy', 'name')
            .limit(10)
            .lean();

        const recentAdjustments = await BalanceAdjustment.find({
            entityType: 'customer',
            entityId: id
        }).sort({ createdAt: -1 })
            .populate('adjustedBy', 'name')
            .limit(10)
            .lean();

        return NextResponse.json({ customer, unpaidInvoices, recentPayments, recentAdjustments });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Error fetching customer profile';
        return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message } }, { status: 500 });
    }
});

export const PUT = withPermission('customers.manage', async (req: NextRequest, context: any) => {
    try {
        await connectDB();

        const params = await context.params;
        const id = params.id;
        const body = await req.json();

        // Validation
        const parsed = updateCustomerSchema.parse(body);

        const customer = await Customer.findByIdAndUpdate(id, parsed, { new: true, runValidators: true });
        if (!customer) {
            return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'العميل غير موجود' } }, { status: 404 });
        }

        return NextResponse.json(customer);
    } catch (error: any) {
        if (error.name === 'ZodError') {
            return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: error.errors } }, { status: 400 });
        }
        return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: error.message } }, { status: 500 });
    }
});
