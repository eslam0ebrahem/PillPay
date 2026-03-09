import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/lib/auth/middleware';
import { connectDB } from '@/lib/db/connection';
import Batch from '@/lib/models/Batch';
import Product from '@/lib/models/Product';
import { logAction } from '@/lib/services/audit.service';
import { z } from 'zod';

const adjustmentSchema = z.object({
    productId: z.string().min(1, 'مطلوب إدخال معرف المنتج'),
    batchId: z.string().min(1, 'مطلوب إدخال معرف التشغيلة'),
    location: z.enum(['floor', 'warehouse'], { required_error: 'مطلوب تحديد الموقع (صيدلية أو مخزن)' }),
    newQuantity: z.number().min(0, 'الكمية يجب أن تكون رمقاً صحيحاً موجباً'),
    reason: z.string().min(5, 'يجب تقديم سبب واضح للتعديل'),
});

export const POST = withPermission('stock.adjust', async (req: NextRequest) => {
    try {
        await connectDB();

        // Extract userId from req initialized by middleware (req as any).user._id
        const user = (req as any).user;
        const userId = user?.id || user?._id;

        const body = await req.json();
        const parsed = adjustmentSchema.parse(body);

        const batch = await Batch.findOne({ _id: parsed.batchId, productId: parsed.productId });
        if (!batch) {
            return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'التشغيلة غير موجودة' } }, { status: 404 });
        }

        const product = await Product.findById(parsed.productId);
        if (!product) {
            return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'المنتج غير موجود' } }, { status: 404 });
        }

        const oldQuantity = parsed.location === 'floor' ? batch.floorQty : batch.warehouseQty;
        const quantityDiff = parsed.newQuantity - oldQuantity;

        if (quantityDiff === 0) {
            return NextResponse.json({ message: 'لم يتم إجراء أي تغيير على الكمية' });
        }

        if (parsed.location === 'floor') {
            batch.floorQty = parsed.newQuantity;
        } else {
            batch.warehouseQty = parsed.newQuantity;
        }

        await batch.save();

        await logAction({
            userId: userId,
            action: 'STOCK_ADJUSTMENT',
            entityType: 'Batch',
            entityId: batch._id.toString(),
            productId: product._id.toString(),
            details: {
                location: parsed.location,
                oldQuantity,
                newQuantity: parsed.newQuantity,
                diff: quantityDiff,
                reason: parsed.reason,
            }
        });

        return NextResponse.json({ message: 'تم تعديل المخزون بنجاح' });
    } catch (error: any) {
        if (error.name === 'ZodError') {
            return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: error.errors } }, { status: 400 });
        }
        const message = error instanceof Error ? error.message : 'Error adjusting stock';
        return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message } }, { status: 500 });
    }
});
