import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/lib/auth/middleware';
import { recordSupplierPayment } from '@/lib/services/supplier.service';
import { z } from 'zod';

const paymentSchema = z.object({
    amount: z.number().min(1, 'المبلغ يجب أن يكون أكبر من صفر'),
});

export const POST = withPermission('suppliers.manage', async (req: NextRequest, context: any) => {
    try {
        const user = (req as any).user;
        const userId = user?.id || user?._id;
        const params = await context.params;
        const id = params.id; // This is the invoiceId

        const body = await req.json();
        const parsed = paymentSchema.parse(body);

        // Note: For this endpoint we assume the client provides the supplierId in body too, or we can look up the invoice.
        const invoiceRes = await fetch(new URL(`/api/supplier-invoices/${id}`, req.url).toString(), {
            headers: { 'Cookie': req.headers.get('cookie') || '' }
        });
        const invoiceData = await invoiceRes.json();
        if (!invoiceData || invoiceData.error) {
            return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'الفاتورة غير موجودة' } }, { status: 404 });
        }

        const payment = await recordSupplierPayment(
            invoiceData.supplierId._id || invoiceData.supplierId,
            Math.round(parsed.amount * 100), // EGP to piasters
            userId,
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
