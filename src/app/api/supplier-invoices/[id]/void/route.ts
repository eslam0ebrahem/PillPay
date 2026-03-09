import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/lib/auth/middleware';
import { voidSupplierInvoice } from '@/lib/services/supplier.service';

export const POST = withPermission('suppliers.manage', async (req: NextRequest, context: any) => {
    try {
        const user = (req as any).user;
        const userId = user?.id || user?._id;
        const params = await context.params;
        const id = params.id; // InvoiceId

        const result = await voidSupplierInvoice(id, userId);

        return NextResponse.json(result);
    } catch (error: any) {
        // Return 409 Conflict if stock already sold
        if (error.message.includes('لا يمكن إلغاء')) {
            return NextResponse.json({ error: { code: 'CONFLICT', message: error.message } }, { status: 409 });
        }
        return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: error.message } }, { status: 500 });
    }
});
