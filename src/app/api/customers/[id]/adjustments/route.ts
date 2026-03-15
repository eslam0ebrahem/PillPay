import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/lib/auth/middleware';
import { adjustCustomerBalance } from '@/lib/services/customer.service';
import { z } from 'zod';
import { isValidObjectId } from '@/lib/utils/validation';

const adjustmentSchema = z.object({
    amountChange: z
        .number()
        .refine((val) => val !== 0, 'يجب أن يكون مبلغ التعديل مختلفاً عن الصفر'),
    reason: z.string().min(1, 'سبب التعديل مطلوب'),
});

export const POST = withPermission(
    'customers.balance.adjust',
    async (req: NextRequest, context: any) => {
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
            const parsed = adjustmentSchema.parse(body);

            const result = await adjustCustomerBalance(
                id,
                Math.round(parsed.amountChange * 100), // EGP to piasters
                parsed.reason,
                context.user._id
            );

            return NextResponse.json(result, { status: 201 });
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
    }
);
