import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '@/lib/auth/middleware';
import { updateInventoryAuditCounts } from '@/lib/services/inventory-audit.service';

const countsSchema = z.object({
    counts: z.array(
        z.object({
            productId: z.string().min(1),
            location: z.enum(['warehouse', 'floor']),
            actualQty: z.number().int().min(0),
        })
    ),
});

export const PUT = withPermission('inventory-audits.manage', async (request: NextRequest, context) => {
    try {
        const { id } = (await context.params) as { id: string };
        const payload = countsSchema.parse(await request.json());
        const session = await updateInventoryAuditCounts(id, payload.counts);

        return NextResponse.json({ data: session });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'بيانات العد غير صالحة',
                        details: error.issues,
                    },
                },
                { status: 400 }
            );
        }

        const message = error instanceof Error ? error.message : 'تعذر حفظ العد';
        return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message } }, { status: 400 });
    }
});
