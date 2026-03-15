import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/lib/auth/middleware';
import { recordCustomerPayment } from '@/lib/services/customer.service';
import { z } from 'zod';
import { isValidObjectId } from '@/lib/utils/validation';
import { withIdempotency } from '@/lib/utils/idempotency';

const paymentSchema = z.object({
    amount: z.number().min(1, 'المبلغ يجب أن يكون أكبر من صفر'),
});

export const POST = withPermission(
    'customers.payments',
    withIdempotency(async (req: NextRequest, context: any) => {
        try {
            const params = await context.params;
            const id = params.id; // customerId

            if (!isValidObjectId(id)) {
                return NextResponse.json(
                    { error: { code: 'INVALID_INPUT', message: 'المعرف غير صالح' } },
                    { status: 400 }
                );
            }

            const body = await req.json();
            const parsed = paymentSchema.parse(body);

            const payment = await recordCustomerPayment(
                id,
                Math.round(parsed.amount * 100), // EGP to piasters
                context.user._id
            );

            return NextResponse.json(payment, { status: 201 });
        } catch (error: any) {
            if (error.name === 'ZodError') {
                return NextResponse.json(
                    { error: { code: 'VALIDATION_ERROR', message: error.errors } },
                    { status: 400 }
                );
            }
            return NextResponse.json(
                { error: { code: 'INTERNAL_ERROR', message: error.message } },
                { status: 500 }
            );
        }
    })
);
