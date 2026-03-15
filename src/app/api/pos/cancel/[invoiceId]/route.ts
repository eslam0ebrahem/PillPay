import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/lib/auth/middleware';
import { cancelSale, getRefundInvoiceLookup } from '@/lib/services/refund.service';
import { isValidObjectId } from '@/lib/utils/validation';

export const GET = withPermission('pos.cancel', async (_request: NextRequest, context) => {
    try {
        const { invoiceId } = (await context.params) as { invoiceId: string };

        if (!isValidObjectId(invoiceId)) {
            return NextResponse.json(
                { error: { code: 'INVALID_INPUT', message: 'المعرف غير صالح' } },
                { status: 400 }
            );
        }

        const invoice = await getRefundInvoiceLookup(decodeURIComponent(invoiceId));

        return NextResponse.json({ data: invoice });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'تعذر تحميل بيانات الفاتورة';
        const status = message.includes('غير موجودة') ? 404 : 400;

        return NextResponse.json({ error: { code: 'LOOKUP_ERROR', message } }, { status });
    }
});

export const POST = withPermission('pos.cancel', async (_request: NextRequest, context) => {
    try {
        const { invoiceId } = (await context.params) as { invoiceId: string };

        if (!isValidObjectId(invoiceId)) {
            return NextResponse.json(
                { error: { code: 'INVALID_INPUT', message: 'المعرف غير صالح' } },
                { status: 400 }
            );
        }

        const result = await cancelSale(decodeURIComponent(invoiceId), context.user._id);

        return NextResponse.json({ success: true, data: result });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'تعذر إلغاء الفاتورة';
        const status = message.includes('غير موجودة') ? 404 : 400;

        return NextResponse.json({ error: { code: 'CANCEL_ERROR', message } }, { status });
    }
});
