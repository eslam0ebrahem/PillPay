import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/lib/auth/middleware';
import { getAlertsDetail } from '@/lib/services/alerts.service';

export const GET = withPermission('products.view', async (_req: NextRequest) => {
    try {
        const alerts = await getAlertsDetail();
        return NextResponse.json(alerts);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Error fetching alerts summary';
        return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message } }, { status: 500 });
    }
});
