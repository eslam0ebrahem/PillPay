import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/lib/auth/middleware';
import { checkout } from '@/lib/services/pos.service';

export const POST = withPermission('pos.checkout', async (req: NextRequest, context) => {
    try {
        const input = await req.json();

        // Attach cashier ID
        input.cashierId = context.user._id;

        const invoiceId = await checkout(input);
        return NextResponse.json({ success: true, invoiceId }, { status: 201 });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Error processing checkout';
        const status =
            message.includes('تم استهلاك المخزون بواسطة عملية أخرى')
                ? 409
                : message.includes('المخزون غير كافي') ||
                    message.includes('لا يوجد مخزون متاح') ||
                    message.includes('المنتج') ||
                    message.includes('الحد الأقصى')
                  ? 400
                  : 500;
        return NextResponse.json({ error: { code: 'CHECKOUT_ERROR', message } }, { status });
    }
});
