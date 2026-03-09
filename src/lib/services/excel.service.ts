import ExcelJS from 'exceljs';
import type {
    BaseReportResult,
    DebtReportRow,
    DebtReportSummary,
    ProfitReportRow,
    ProfitReportSummary,
    SalesReportRow,
    SalesReportSummary,
    StockReportRow,
    StockReportSummary,
} from '@/lib/services/report.service';

interface WorksheetColumn {
    header: string;
    key: string;
    width?: number;
    money?: boolean;
}

function formatSummaryValue(value: number | string, money?: boolean) {
    if (typeof value === 'number' && money) {
        return value / 100;
    }

    return value;
}

async function buildWorkbook<TRow extends object>(options: {
    title: string;
    sheetName: string;
    columns: WorksheetColumn[];
    summaryRows: Array<{ label: string; value: number | string; money?: boolean }>;
    rows: TRow[];
    fileLabel: string;
}) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Codex';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet(options.sheetName);
    worksheet.views = [{ rightToLeft: true }];
    worksheet.properties.defaultRowHeight = 22;

    worksheet.addRow([options.title]);
    worksheet.mergeCells(1, 1, 1, options.columns.length);
    worksheet.getRow(1).font = { bold: true, size: 16 };
    worksheet.getRow(1).alignment = { horizontal: 'center' };

    worksheet.addRow([`تم التصدير: ${options.fileLabel}`]);
    worksheet.mergeCells(2, 1, 2, options.columns.length);
    worksheet.getRow(2).font = { italic: true };

    for (const summaryRow of options.summaryRows) {
        worksheet.addRow([
            summaryRow.label,
            formatSummaryValue(summaryRow.value, summaryRow.money),
        ]);
    }

    worksheet.addRow([]);

    worksheet.columns = options.columns.map((column) => ({
        header: column.header,
        key: column.key,
        width: column.width ?? 18,
    }));

    for (const row of options.rows) {
        const preparedRow: Record<string, unknown> = {};
        const sourceRow = row as Record<string, unknown>;

        for (const column of options.columns) {
            const value = sourceRow[column.key];
            preparedRow[column.key] =
                column.money && typeof value === 'number' ? value / 100 : value;
        }

        worksheet.addRow(preparedRow);
    }

    const headerRowIndex = options.summaryRows.length + 4;
    const headerRow = worksheet.getRow(headerRowIndex);
    headerRow.font = { bold: true };
    headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6F4FF' },
    };

    options.columns.forEach((column, index) => {
        if (!column.money) {
            return;
        }

        worksheet.getColumn(index + 1).numFmt = '#,##0.00 "ج.م"';
    });

    return Buffer.from(await workbook.xlsx.writeBuffer());
}

export async function generateSalesExcel(
    report: BaseReportResult<SalesReportRow, SalesReportSummary>
) {
    return buildWorkbook({
        title: 'تقرير المبيعات',
        sheetName: 'المبيعات',
        fileLabel: report.meta.label,
        summaryRows: [
            { label: 'إجمالي المبيعات', value: report.summary.totalSales, money: true },
            { label: 'عدد الفواتير', value: report.summary.invoiceCount },
            {
                label: 'متوسط قيمة الفاتورة',
                value: report.summary.averageInvoiceValue,
                money: true,
            },
            { label: 'المحصل', value: report.summary.paidAmount, money: true },
            { label: 'الآجل المتبقي', value: report.summary.remainingBalance, money: true },
        ],
        columns: [
            { header: 'التاريخ', key: 'date', width: 16 },
            { header: 'إجمالي المبيعات', key: 'totalSales', width: 18, money: true },
            { header: 'عدد الفواتير', key: 'invoiceCount', width: 16 },
            { header: 'المحصل', key: 'paidAmount', width: 18, money: true },
            { header: 'الآجل المتبقي', key: 'remainingBalance', width: 18, money: true },
        ],
        rows: report.data,
    });
}

export async function generateProfitExcel(
    report: BaseReportResult<ProfitReportRow, ProfitReportSummary>
) {
    return buildWorkbook({
        title: 'تقرير الربحية',
        sheetName: 'الربحية',
        fileLabel: report.meta.label,
        summaryRows: [
            { label: 'إجمالي المبيعات', value: report.summary.totalSales, money: true },
            { label: 'تكلفة البضاعة', value: report.summary.cogs, money: true },
            { label: 'صافي الربح', value: report.summary.netProfit, money: true },
            { label: 'عدد الفواتير', value: report.summary.invoiceCount },
            { label: 'هامش الربح %', value: report.summary.marginPercent },
        ],
        columns: [
            { header: 'التاريخ', key: 'date', width: 16 },
            { header: 'المبيعات', key: 'totalSales', width: 18, money: true },
            { header: 'التكلفة', key: 'cogs', width: 18, money: true },
            { header: 'صافي الربح', key: 'netProfit', width: 18, money: true },
            { header: 'عدد الفواتير', key: 'invoiceCount', width: 16 },
        ],
        rows: report.data,
    });
}

export async function generateStockExcel(
    report: BaseReportResult<StockReportRow, StockReportSummary>
) {
    return buildWorkbook({
        title: 'تقرير المخزون',
        sheetName: 'المخزون',
        fileLabel: report.meta.label,
        summaryRows: [
            { label: 'عدد المنتجات', value: report.summary.totalProducts },
            { label: 'كمية المخزن', value: report.summary.totalWarehouseQty },
            { label: 'كمية الرف', value: report.summary.totalFloorQty },
            { label: 'إجمالي الكمية', value: report.summary.totalQty },
            { label: 'قيمة المخزون', value: report.summary.stockValue, money: true },
        ],
        columns: [
            { header: 'المنتج', key: 'nameAr', width: 24 },
            { header: 'التصنيف', key: 'category', width: 18 },
            { header: 'كمية المخزن', key: 'warehouseQty', width: 16 },
            { header: 'كمية الرف', key: 'floorQty', width: 16 },
            { header: 'إجمالي الكمية', key: 'totalQty', width: 16 },
            { header: 'قيمة المخزون', key: 'stockValue', width: 18, money: true },
            { header: 'أقرب انتهاء', key: 'earliestExpiry', width: 16 },
        ],
        rows: report.data,
    });
}

export async function generateCustomerDebtExcel(
    report: BaseReportResult<DebtReportRow, DebtReportSummary>
) {
    return buildWorkbook({
        title: 'تقرير مديونية العملاء',
        sheetName: 'مديونية العملاء',
        fileLabel: report.meta.label,
        summaryRows: [
            { label: 'عدد العملاء', value: report.summary.entityCount },
            { label: 'إجمالي المديونية', value: report.summary.totalOwed, money: true },
        ],
        columns: [
            { header: 'العميل', key: 'name', width: 24 },
            { header: 'الهاتف', key: 'phone', width: 18 },
            { header: 'إجمالي المديونية', key: 'totalOwed', width: 18, money: true },
            { header: 'تاريخ الإنشاء', key: 'createdAt', width: 16 },
        ],
        rows: report.data,
    });
}

export async function generateSupplierDebtExcel(
    report: BaseReportResult<DebtReportRow, DebtReportSummary>
) {
    return buildWorkbook({
        title: 'تقرير مستحقات الموردين',
        sheetName: 'مستحقات الموردين',
        fileLabel: report.meta.label,
        summaryRows: [
            { label: 'عدد الموردين', value: report.summary.entityCount },
            { label: 'إجمالي المستحقات', value: report.summary.totalOwed, money: true },
        ],
        columns: [
            { header: 'المورد', key: 'name', width: 24 },
            { header: 'الهاتف', key: 'phone', width: 18 },
            { header: 'إجمالي المستحقات', key: 'totalOwed', width: 18, money: true },
            { header: 'تاريخ الإنشاء', key: 'createdAt', width: 16 },
        ],
        rows: report.data,
    });
}
