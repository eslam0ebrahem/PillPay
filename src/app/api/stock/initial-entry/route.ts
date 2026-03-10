import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/lib/auth/middleware';
import { initialStockMultiEntrySchema } from '@/lib/utils/validation';
import { createMultipleInitialStockBatches } from '@/lib/services/stock.service';
import { z } from 'zod';

export const POST = withPermission('stock.adjust', async (req: NextRequest, context) => {
    try {
        const body = await req.json();
        const { productId, batches } = initialStockMultiEntrySchema.parse(body);

        const createdBatches = await createMultipleInitialStockBatches(
            productId,
            batches,
            context.user._id
        );

        return NextResponse.json(
            { message: 'تم تسجيل المخزون الأولي بنجاح', data: createdBatches },
            { status: 201 }
        );
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'بيانات غير صالحة',
                        details: error.issues.map((issue) => ({
                            field: issue.path.join('.'),
                            message: issue.message,
                        })),
                    },
                },
                { status: 400 }
            );
        }

        const message = error instanceof Error ? error.message : 'Error creating initial stock';
        const status = message.includes('غير موجود') ? 404 : 400;
        return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message } }, { status });
    }
});
