import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/lib/auth/middleware';
import {
    generateCustomerDebtExcel,
    generateProfitExcel,
    generateSalesExcel,
    generateStockExcel,
    generateSupplierDebtExcel,
} from '@/lib/services/excel.service';
import {
    getCustomerDebtReport,
    getProfitReport,
    getSalesReport,
    getStockReport,
    getSupplierDebtReport,
} from '@/lib/services/report.service';

export const GET = withPermission('reports.view', async (request: NextRequest, context) => {
    try {
        const { type } = (await context.params) as { type: string };
        const filters = {
            period: request.nextUrl.searchParams.get('period'),
            from: request.nextUrl.searchParams.get('from'),
            to: request.nextUrl.searchParams.get('to'),
            compare: request.nextUrl.searchParams.get('compare'),
        };

        let fileName = '';
        let buffer: Buffer;

        switch (type) {
            case 'sales':
                fileName = 'sales-report.xlsx';
                buffer = await generateSalesExcel(await getSalesReport(filters));
                break;
            case 'profit':
                fileName = 'profit-report.xlsx';
                buffer = await generateProfitExcel(await getProfitReport(filters));
                break;
            case 'stock':
                fileName = 'stock-report.xlsx';
                buffer = await generateStockExcel(await getStockReport(filters));
                break;
            case 'customer-debt':
                fileName = 'customer-debt-report.xlsx';
                buffer = await generateCustomerDebtExcel(await getCustomerDebtReport(filters));
                break;
            case 'supplier-debt':
                fileName = 'supplier-debt-report.xlsx';
                buffer = await generateSupplierDebtExcel(await getSupplierDebtReport(filters));
                break;
            default:
                return NextResponse.json(
                    { error: { code: 'NOT_FOUND', message: 'نوع التقرير غير مدعوم' } },
                    { status: 404 }
                );
        }

        return new NextResponse(new Uint8Array(buffer), {
            status: 200,
            headers: {
                'Content-Type':
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="${fileName}"`,
            },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'تعذر تصدير التقرير';
        return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message } }, { status: 500 });
    }
});
