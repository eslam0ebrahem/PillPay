import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { z } from 'zod';
import { withPermission } from '@/lib/auth/middleware';
import { connectDB } from '@/lib/db/connection';
import Refund from '@/lib/models/Refund';
import { createRefund } from '@/lib/services/refund.service';

const createRefundSchema = z.object({
    originalInvoiceId: z.string().trim().optional(),
    customerId: z.string().trim().optional(),
    items: z
        .array(
            z.object({
                productId: z.string().trim().min(1),
                quantity: z.number().int().positive(),
                unitPrice: z.number().int().nonnegative().optional(),
                subtotal: z.number().int().nonnegative().optional(),
            })
        )
        .min(1, 'يجب إضافة صنف واحد على الأقل'),
});

function parseDateBoundary(value: string | null, endOfDay = false) {
    if (!value) {
        return null;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return null;
    }

    if (endOfDay) {
        date.setHours(23, 59, 59, 999);
    } else {
        date.setHours(0, 0, 0, 0);
    }

    return date;
}

export const GET = withPermission(
    'refunds.view',
    async (request: NextRequest) => {
        try {
            await connectDB();

            const searchParams = request.nextUrl.searchParams;
            const page = Math.max(1, Number(searchParams.get('page') || '1'));
            const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || '20')));
            const originalInvoiceId = searchParams.get('originalInvoiceId');
            const customerId = searchParams.get('customerId');
            const from = parseDateBoundary(searchParams.get('from'));
            const to = parseDateBoundary(searchParams.get('to'), true);

            const filter: Record<string, unknown> = {};

            if (originalInvoiceId && Types.ObjectId.isValid(originalInvoiceId)) {
                filter.originalInvoiceId = new Types.ObjectId(originalInvoiceId);
            }

            if (customerId && Types.ObjectId.isValid(customerId)) {
                filter.customerId = new Types.ObjectId(customerId);
            }

            if (from || to) {
                filter.createdAt = {
                    ...(from ? { $gte: from } : {}),
                    ...(to ? { $lte: to } : {}),
                };
            }

            const [refunds, total] = await Promise.all([
                Refund.find(filter)
                    .sort({ createdAt: -1 })
                    .skip((page - 1) * limit)
                    .limit(limit)
                    .populate('items.productId', 'nameAr')
                    .populate('customerId', 'name')
                    .populate('processedBy', 'name')
                    .populate('originalInvoiceId', 'invoiceNumber')
                    .lean(),
                Refund.countDocuments(filter),
            ]);

            return NextResponse.json({
                data: refunds,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
                },
            });
        } catch (error) {
            const message =
                error instanceof Error ? error.message : 'تعذر تحميل المرتجعات';
            return NextResponse.json(
                { error: { code: 'INTERNAL_ERROR', message } },
                { status: 500 }
            );
        }
    }
);

export const POST = withPermission(
    'refunds.create',
    async (request: NextRequest, context) => {
        try {
            const payload = createRefundSchema.parse(await request.json());

            const refund = await createRefund({
                originalInvoiceId: payload.originalInvoiceId,
                customerId: payload.customerId,
                items: payload.items,
                userId: context.user._id,
            });

            return NextResponse.json({ success: true, data: refund }, { status: 201 });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return NextResponse.json(
                    {
                        error: {
                            code: 'VALIDATION_ERROR',
                            message: 'بيانات المرتجع غير صالحة',
                            details: error.issues.map((issue) => ({
                                field: issue.path.join('.'),
                                message: issue.message,
                            })),
                        },
                    },
                    { status: 400 }
                );
            }

            const message =
                error instanceof Error ? error.message : 'تعذر إنشاء المرتجع';
            return NextResponse.json(
                { error: { code: 'REFUND_ERROR', message } },
                { status: 400 }
            );
        }
    }
);
