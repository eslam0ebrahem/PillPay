import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/lib/auth/middleware';
import { adjustStockQuantity } from '@/lib/services/stock.service';
import { z } from 'zod';

const adjustmentSchema = z.object({
    productId: z.string().min(1, 'مطلوب إدخال معرف المنتج'),
    batchId: z.string().min(1, 'مطلوب إدخال معرف التشغيلة'),
    location: z.enum(['floor', 'warehouse'], { required_error: 'مطلوب تحديد الموقع (صيدلية أو مخزن)' }),
    newQuantity: z.number().min(0, 'الكمية يجب أن تكون رمقاً صحيحاً موجباً'),
    reason: z.string().min(5, 'يجب تقديم سبب واضح للتعديل'),
});

export const POST = withPermission('stock.adjust', async (req: NextRequest, context) => {
    try {
        const body = await req.json();
        const parsed = adjustmentSchema.parse(body);

        const result = await adjustStockQuantity({
            ...parsed,
            userId: context.user._id,
        });

        if (!result.changed) {
            return NextResponse.json({ message: 'لم يتم إجراء أي تغيير على الكمية' });
        }

        return NextResponse.json({
            message: 'تم تعديل المخزون بنجاح',
            data: result,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'بيانات تعديل المخزون غير صالحة',
                        details: error.issues.map((issue) => ({
                            field: issue.path.join('.'),
                            message: issue.message,
                        })),
                    },
                },
                { status: 400 }
            );
        }

        const message = error instanceof Error ? error.message : 'Error adjusting stock';
        const status =
            message.includes('غير موجودة') || message.includes('غير موجود')
                ? 404
                : 400;
        return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message } }, { status });
    }
});
