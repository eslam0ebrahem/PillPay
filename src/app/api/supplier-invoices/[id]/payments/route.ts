import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/lib/auth/middleware';
import { recordSupplierPayment } from '@/lib/services/supplier.service';
import { connectDB } from '@/lib/db/connection';
import SupplierInvoice from '@/lib/models/SupplierInvoice';
import { z } from 'zod';

const paymentSchema = z.object({
    amount: z.number().min(1, 'المبلغ يجب أن يكون أكبر من صفر'),
});

export const POST = withPermission('supplier-invoices.payments', async (req: NextRequest, context: any) => {
    try {
        const params = await context.params;
        const id = params.id; // This is the invoiceId

        const body = await req.json();
        const parsed = paymentSchema.parse(body);

        await connectDB();

        const invoice = await SupplierInvoice.findById(id).lean<{ supplierId: { toString(): string } | string } | null>();
        if (!invoice) {
            return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'الفاتورة غير موجودة' } }, { status: 404 });
        }

        const payment = await recordSupplierPayment(
            typeof invoice.supplierId === 'string' ? invoice.supplierId : invoice.supplierId.toString(),
            Math.round(parsed.amount * 100), // EGP to piasters
            context.user._id,
            id
        );

        return NextResponse.json(payment, { status: 201 });
    } catch (error: any) {
        if (error.name === 'ZodError') {
            return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: error.errors } }, { status: 400 });
        }
        return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: error.message } }, { status: 500 });
    }
});
