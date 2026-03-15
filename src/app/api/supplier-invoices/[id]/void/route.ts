import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/lib/auth/middleware';
import { voidSupplierInvoice } from '@/lib/services/supplier.service';
import { isValidObjectId } from '@/lib/utils/validation';

export const POST = withPermission(
    'supplier-invoices.manage',
    async (_req: NextRequest, context: any) => {
        try {
            const params = await context.params;
            const id = params.id; // InvoiceId

            if (!isValidObjectId(id)) {
                return NextResponse.json(
                    { error: { code: 'INVALID_INPUT', message: 'المعرف غير صالح' } },
                    { status: 400 }
                );
            }

            const result = await voidSupplierInvoice(id, context.user._id);

            return NextResponse.json(result);
        } catch (error: any) {
            // Return 409 Conflict if stock already sold
            if (error.message.includes('لا يمكن إلغاء')) {
                return NextResponse.json(
                    { error: { code: 'CONFLICT', message: error.message } },
                    { status: 409 }
                );
            }
            return NextResponse.json(
                { error: { code: 'INTERNAL_ERROR', message: error.message } },
                { status: 500 }
            );
        }
    }
);
