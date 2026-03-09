export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/lib/auth/middleware';
import { getDashboardSummary } from '@/lib/services/report.service';

export const GET = withPermission('reports.view', async (_req: NextRequest) => {
    try {
        const summary = await getDashboardSummary();
        return NextResponse.json(summary);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Error fetching dashboard summary';
        return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message } }, { status: 500 });
    }
});
