import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/lib/auth/middleware';
import { approveInventoryAudit } from '@/lib/services/inventory-audit.service';

export const POST = withPermission('inventory-audits.manage', async (_request: NextRequest, context) => {
    try {
        const { id } = (await context.params) as { id: string };
        const session = await approveInventoryAudit(id, context.user._id);

        return NextResponse.json({ data: session });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'تعذر اعتماد الجرد';
        return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message } }, { status: 400 });
    }
});
