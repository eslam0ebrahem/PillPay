import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/lib/auth/middleware';
import { adjustSupplierBalance } from '@/lib/services/supplier.service';
import { z } from 'zod';

const adjustmentSchema = z.object({
    amountChange: z.number().refine(val => val !== 0, 'يجب أن يكون مبلغ التعديل مختلفاً عن الصفر'),
    reason: z.string().min(1, 'سبب التعديل مطلوب'),
});

export const POST = withPermission('balance.adjust', async (req: NextRequest, context: any) => {
    try {
        const params = await context.params;
        const id = params.id; // supplierId

        const body = await req.json();
        const parsed = adjustmentSchema.parse(body);

        const supplier = await adjustSupplierBalance(
            id,
            Math.round(parsed.amountChange * 100), // EGP to piasters
            parsed.reason,
            context.user._id
        );

        return NextResponse.json(supplier, { status: 201 });
    } catch (error: any) {
        if (error.name === 'ZodError') {
            return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: error.errors } }, { status: 400 });
        }
        return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: error.message } }, { status: 500 });
    }
});
