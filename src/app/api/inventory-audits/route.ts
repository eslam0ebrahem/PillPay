import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/lib/auth/middleware';
import {
    listInventoryAudits,
    startInventoryAudit,
} from '@/lib/services/inventory-audit.service';

export const GET = withPermission('inventory-audits.manage', async () => {
    try {
        const sessions = await listInventoryAudits();
        return NextResponse.json({ data: sessions });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'تعذر تحميل جلسات الجرد';
        return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message } }, { status: 500 });
    }
});

export const POST = withPermission('inventory-audits.manage', async (_request: NextRequest, context) => {
    try {
        const session = await startInventoryAudit(context.user._id);
        return NextResponse.json({ data: session }, { status: 201 });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'تعذر بدء الجرد';
        return NextResponse.json({ error: { code: 'AUDIT_START_ERROR', message } }, { status: 400 });
    }
});
