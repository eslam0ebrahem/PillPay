import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/lib/auth/middleware';
import { recordCustomerPayment } from '@/lib/services/customer.service';
import { z } from 'zod';

const paymentSchema = z.object({
    amount: z.number().min(1, 'المبلغ يجب أن يكون أكبر من صفر'),
});

export const POST = withPermission('customers.payments', async (req: NextRequest, context: any) => {
    try {
        const user = (req as any).user;
        const userId = user?.id || user?._id;
        const params = await context.params;
        const id = params.id; // customerId

        const body = await req.json();
        const parsed = paymentSchema.parse(body);

        const payment = await recordCustomerPayment(
            id,
            Math.round(parsed.amount * 100), // EGP to piasters
            userId
        );

        return NextResponse.json(payment, { status: 201 });
    } catch (error: any) {
        if (error.name === 'ZodError') {
            return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: error.errors } }, { status: 400 });
        }
        return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: error.message } }, { status: 500 });
    }
});
