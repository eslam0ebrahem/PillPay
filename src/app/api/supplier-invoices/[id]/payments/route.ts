import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/lib/auth/middleware';
import { recordSupplierPayment } from '@/lib/services/supplier.service';
import { connectDB } from '@/lib/db/connection';
import SupplierInvoice from '@/lib/models/SupplierInvoice';
import { z } from 'zod';
import { isValidObjectId } from '@/lib/utils/validation';
import { withIdempotency } from '@/lib/utils/idempotency';

const paymentSchema = z.object({
    amount: z.number().min(0.01, 'المبلغ يجب أن يكون أكبر من صفر'),
});

export const POST = withPermission(
    'supplier-invoices.payments',
    withIdempotency(async (req: NextRequest, context: any) => {
        try {
            const params = await context.params;
            const id = params.id; // This is the invoiceId

            if (!isValidObjectId(id)) {
                return NextResponse.json(
                    { error: { code: 'INVALID_INPUT', message: 'معرف الفاتورة غير صالح' } },
                    { status: 400 }
                );
            }

            const body = await req.json();
            const parsed = paymentSchema.parse(body);

            await connectDB();

            const invoice = await SupplierInvoice.findById(id).lean<{
                supplierId: { toString(): string } | string;
                remainingBalance: number;
                status: string;
            } | null>();
            if (!invoice) {
                return NextResponse.json(
                    { error: { code: 'NOT_FOUND', message: 'الفاتورة غير موجودة' } },
                    { status: 404 }
                );
            }

            if (invoice.status === 'voided') {
                return NextResponse.json(
                    { error: { code: 'INVALID_INPUT', message: 'لا يمكن الدفع على فاتورة ملغاة' } },
                    { status: 400 }
                );
            }

            const amountInPiasters = Math.round(parsed.amount * 100);
            if (amountInPiasters > invoice.remainingBalance) {
                return NextResponse.json(
                    {
                        error: {
                            code: 'INVALID_INPUT',
                            message: 'مبلغ الدفع يتجاوز الرصيد المستحق للفاتورة',
                        },
                    },
                    { status: 400 }
                );
            }

            const payment = await recordSupplierPayment(
                typeof invoice.supplierId === 'string'
                    ? invoice.supplierId
                    : invoice.supplierId.toString(),
                amountInPiasters,
                context.user._id,
                id
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
