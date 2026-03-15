import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/lib/auth/middleware';
import { getInventoryAuditSession } from '@/lib/services/inventory-audit.service';
import { isValidObjectId } from '@/lib/utils/validation';

export const GET = withPermission(
    'inventory-audits.manage',
    async (_request: NextRequest, context) => {
        try {
            const { id } = (await context.params) as { id: string };

            if (!isValidObjectId(id)) {
                return NextResponse.json(
                    { error: { code: 'INVALID_INPUT', message: 'المعرف غير صالح' } },
                    { status: 400 }
                );
            }

            const session = await getInventoryAuditSession(id);

            if (!session) {
                return NextResponse.json(
                    { error: { code: 'NOT_FOUND', message: 'جلسة الجرد غير موجودة' } },
                    { status: 404 }
                );
            }

            return NextResponse.json({ data: session });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'تعذر تحميل جلسة الجرد';
            return NextResponse.json(
                { error: { code: 'INTERNAL_ERROR', message } },
                { status: 500 }
            );
        }
    }
);
