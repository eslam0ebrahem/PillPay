import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/lib/auth/middleware';
import { getStockReport } from '@/lib/services/report.service';

export const GET = withPermission('reports.view', async (request: NextRequest) => {
    try {
        const report = await getStockReport({
            period: request.nextUrl.searchParams.get('period'),
            from: request.nextUrl.searchParams.get('from'),
            to: request.nextUrl.searchParams.get('to'),
            compare: request.nextUrl.searchParams.get('compare'),
        });

        return NextResponse.json(report);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'تعذر تحميل تقرير المخزون';
        return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message } }, { status: 500 });
    }
});
