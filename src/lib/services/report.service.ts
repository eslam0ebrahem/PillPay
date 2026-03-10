import { connectDB } from '@/lib/db/connection';
import Batch from '@/lib/models/Batch';
import Customer from '@/lib/models/Customer';
import Product from '@/lib/models/Product';
import SaleInvoice from '@/lib/models/SaleInvoice';
import Supplier from '@/lib/models/Supplier';

export type ReportPeriod = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom';
export type ComparisonMode = 'mom' | 'yoy';
export type ExportReportType =
    | 'sales'
    | 'profit'
    | 'stock'
    | 'customer-debt'
    | 'supplier-debt';

export interface DashboardProductStat {
    id: string;
    name: string;
    quantity: number;
}

export interface DashboardSummary {
    todaySales: number;
    netProfit: number;
    cashInHand: number;
    totalCustomerDebt: number;
    totalSupplierDebt: number;
    topSellingProducts: DashboardProductStat[];
    slowMovingProducts: DashboardProductStat[];
}

export interface ReportFiltersInput {
    period?: string | null;
    from?: string | null;
    to?: string | null;
    compare?: string | null;
}

export interface ReportComparison<TSummary> {
    label: string;
    summary: TSummary;
}

export interface BaseReportResult<TRow, TSummary> {
    meta: {
        period: ReportPeriod;
        label: string;
        from: string;
        to: string;
        compare: ComparisonMode | null;
        comparisonLabel: string | null;
    };
    data: TRow[];
    summary: TSummary;
    comparison: ReportComparison<TSummary> | null;
}

export interface SalesReportRow {
    date: string;
    totalSales: number;
    invoiceCount: number;
    paidAmount: number;
    remainingBalance: number;
}

export interface SalesReportSummary {
    totalSales: number;
    invoiceCount: number;
    averageInvoiceValue: number;
    paidAmount: number;
    remainingBalance: number;
}

export interface ProfitReportRow {
    date: string;
    totalSales: number;
    cogs: number;
    netProfit: number;
    invoiceCount: number;
}

export interface ProfitReportSummary {
    totalSales: number;
    cogs: number;
    netProfit: number;
    invoiceCount: number;
    marginPercent: number;
}

export interface StockReportRow {
    productId: string;
    nameAr: string;
    category: string | null;
    warehouseQty: number;
    floorQty: number;
    totalQty: number;
    stockValue: number;
    earliestExpiry: string | null;
}

export interface StockReportSummary {
    totalProducts: number;
    totalWarehouseQty: number;
    totalFloorQty: number;
    totalQty: number;
    stockValue: number;
}

export interface DebtReportRow {
    entityId: string;
    name: string;
    phone?: string | null;
    totalOwed: number;
    createdAt?: string | null;
}

export interface DebtReportSummary {
    entityCount: number;
    totalOwed: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function cloneDate(date: Date) {
    return new Date(date.getTime());
}

function startOfDay(date: Date) {
    const next = cloneDate(date);
    next.setHours(0, 0, 0, 0);
    return next;
}

function endOfDay(date: Date) {
    const next = cloneDate(date);
    next.setHours(23, 59, 59, 999);
    return next;
}

function addDays(date: Date, days: number) {
    const next = cloneDate(date);
    next.setDate(next.getDate() + days);
    return next;
}

function formatDate(date: Date) {
    return date.toISOString().slice(0, 10);
}

function startOfWeek(date: Date) {
    const day = date.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    return startOfDay(addDays(date, diff));
}

function startOfMonth(date: Date) {
    return startOfDay(new Date(date.getFullYear(), date.getMonth(), 1));
}

function getComparisonLabel(mode: ComparisonMode) {
    return mode === 'mom' ? 'الفترة السابقة' : 'نفس الفترة من العام الماضي';
}

export function resolveReportRange(input: ReportFiltersInput = {}) {
    const today = new Date();
    const period = (input.period as ReportPeriod | undefined) || 'this_month';

    let from: Date;
    let to: Date;

    switch (period) {
        case 'today':
            from = startOfDay(today);
            to = endOfDay(today);
            break;
        case 'yesterday': {
            const yesterday = addDays(today, -1);
            from = startOfDay(yesterday);
            to = endOfDay(yesterday);
            break;
        }
        case 'this_week':
            from = startOfWeek(today);
            to = endOfDay(today);
            break;
        case 'custom': {
            const parsedFrom = input.from ? new Date(input.from) : today;
            const parsedTo = input.to ? new Date(input.to) : today;
            from = startOfDay(parsedFrom);
            to = endOfDay(parsedTo);
            break;
        }
        case 'this_month':
        default:
            from = startOfMonth(today);
            to = endOfDay(today);
            break;
    }

    const compare =
        input.compare === 'mom' || input.compare === 'yoy'
            ? (input.compare as ComparisonMode)
            : null;

    let comparisonRange: { from: Date; to: Date; label: string } | null = null;

    if (compare === 'mom') {
        const durationDays = Math.max(
            1,
            Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS) + 1
        );
        const comparisonTo = endOfDay(addDays(from, -1));
        const comparisonFrom = startOfDay(addDays(comparisonTo, -(durationDays - 1)));
        comparisonRange = {
            from: comparisonFrom,
            to: comparisonTo,
            label: getComparisonLabel(compare),
        };
    } else if (compare === 'yoy') {
        const comparisonFrom = startOfDay(
            new Date(from.getFullYear() - 1, from.getMonth(), from.getDate())
        );
        const comparisonTo = endOfDay(
            new Date(to.getFullYear() - 1, to.getMonth(), to.getDate())
        );
        comparisonRange = {
            from: comparisonFrom,
            to: comparisonTo,
            label: getComparisonLabel(compare),
        };
    }

    return {
        period,
        label: `${formatDate(from)} إلى ${formatDate(to)}`,
        from,
        to,
        compare,
        comparisonRange,
    };
}

function roundPercent(numerator: number, denominator: number) {
    if (!denominator) {
        return 0;
    }

    return Number(((numerator / denominator) * 100).toFixed(2));
}

async function aggregateSalesRange(from: Date, to: Date) {
    const rows = await SaleInvoice.aggregate([
        {
            $match: {
                status: 'completed',
                createdAt: { $gte: from, $lte: to },
            },
        },
        {
            $group: {
                _id: {
                    $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
                },
                totalSales: { $sum: '$total' },
                invoiceCount: { $sum: 1 },
                paidAmount: { $sum: '$paidAmount' },
                remainingBalance: { $sum: '$remainingBalance' },
            },
        },
        { $sort: { _id: 1 } },
        {
            $project: {
                _id: 0,
                date: '$_id',
                totalSales: 1,
                invoiceCount: 1,
                paidAmount: 1,
                remainingBalance: 1,
            },
        },
    ]);

    const summary = rows.reduce<SalesReportSummary>(
        (accumulator, row) => {
            accumulator.totalSales += row.totalSales;
            accumulator.invoiceCount += row.invoiceCount;
            accumulator.paidAmount += row.paidAmount;
            accumulator.remainingBalance += row.remainingBalance;
            return accumulator;
        },
        {
            totalSales: 0,
            invoiceCount: 0,
            averageInvoiceValue: 0,
            paidAmount: 0,
            remainingBalance: 0,
        }
    );

    summary.averageInvoiceValue = summary.invoiceCount
        ? Math.round(summary.totalSales / summary.invoiceCount)
        : 0;

    return {
        data: rows as SalesReportRow[],
        summary,
    };
}

async function aggregateProfitRange(from: Date, to: Date) {
    const rows = await SaleInvoice.aggregate([
        {
            $match: {
                status: 'completed',
                createdAt: { $gte: from, $lte: to },
            },
        },
        {
            $project: {
                createdAt: 1,
                total: 1,
                cogs: {
                    $sum: {
                        $map: {
                            input: '$items',
                            as: 'item',
                            in: {
                                $sum: {
                                    $map: {
                                        input: '$$item.batchAllocations',
                                        as: 'allocation',
                                        in: {
                                            $multiply: [
                                                '$$allocation.quantity',
                                                '$$allocation.unitCost',
                                            ],
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        {
            $group: {
                _id: {
                    $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
                },
                totalSales: { $sum: '$total' },
                cogs: { $sum: '$cogs' },
                invoiceCount: { $sum: 1 },
            },
        },
        { $sort: { _id: 1 } },
        {
            $project: {
                _id: 0,
                date: '$_id',
                totalSales: 1,
                cogs: 1,
                netProfit: { $subtract: ['$totalSales', '$cogs'] },
                invoiceCount: 1,
            },
        },
    ]);

    const summary = rows.reduce<ProfitReportSummary>(
        (accumulator, row) => {
            accumulator.totalSales += row.totalSales;
            accumulator.cogs += row.cogs;
            accumulator.netProfit += row.netProfit;
            accumulator.invoiceCount += row.invoiceCount;
            return accumulator;
        },
        {
            totalSales: 0,
            cogs: 0,
            netProfit: 0,
            invoiceCount: 0,
            marginPercent: 0,
        }
    );

    summary.marginPercent = roundPercent(summary.netProfit, summary.totalSales);

    return {
        data: rows as ProfitReportRow[],
        summary,
    };
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
    await connectDB();

    const range = resolveReportRange({ period: 'today' });

    const [
        todayProfit,
        todaySales,
        customerDebt,
        supplierDebt,
        topSellingProducts,
        soldQuantities,
        activeProducts,
    ] = await Promise.all([
        aggregateProfitRange(range.from, range.to),
        aggregateSalesRange(range.from, range.to),
        Customer.aggregate([
            { $group: { _id: null, totalCustomerDebt: { $sum: '$totalOwed' } } },
        ]),
        Supplier.aggregate([
            { $group: { _id: null, totalSupplierDebt: { $sum: '$totalOwed' } } },
        ]),
        SaleInvoice.aggregate([
            { $match: { status: 'completed' } },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.productId',
                    quantity: { $sum: '$items.quantity' },
                },
            },
            { $sort: { quantity: -1, _id: 1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'product',
                },
            },
            {
                $project: {
                    _id: 0,
                    id: { $toString: '$_id' },
                    name: {
                        $ifNull: [{ $arrayElemAt: ['$product.nameAr', 0] }, 'منتج غير متاح'],
                    },
                    quantity: 1,
                },
            },
        ]),
        SaleInvoice.aggregate([
            { $match: { status: 'completed' } },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.productId',
                    quantity: { $sum: '$items.quantity' },
                },
            },
        ]),
        // Only consider products that are active AND have been stocked (have batches).
        // This excludes catalog-only items that were never purchased by the pharmacy.
        Batch.aggregate([
            { $group: { _id: '$productId' } },
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'product',
                },
            },
            { $unwind: '$product' },
            { $match: { 'product.isActive': true } },
            {
                $project: {
                    _id: '$product._id',
                    nameAr: '$product.nameAr',
                },
            },
        ]),
    ]);

    const soldQuantityMap = new Map(
        soldQuantities.map((entry) => [entry._id.toString(), entry.quantity as number])
    );

    const slowMovingProducts = activeProducts
        .map((product) => ({
            id: product._id.toString(),
            name: product.nameAr,
            quantity: soldQuantityMap.get(product._id.toString()) ?? 0,
        }))
        .sort(
            (left, right) =>
                left.quantity - right.quantity || left.name.localeCompare(right.name, 'ar')
        )
        .slice(0, 5);

    return {
        todaySales: todayProfit.summary.totalSales,
        cashInHand: todaySales.summary.paidAmount,
        netProfit: todayProfit.summary.netProfit,
        totalCustomerDebt: customerDebt[0]?.totalCustomerDebt ?? 0,
        totalSupplierDebt: supplierDebt[0]?.totalSupplierDebt ?? 0,
        topSellingProducts,
        slowMovingProducts,
    };
}

export async function getSalesReport(
    filters: ReportFiltersInput = {}
): Promise<BaseReportResult<SalesReportRow, SalesReportSummary>> {
    await connectDB();

    const range = resolveReportRange(filters);
    const current = await aggregateSalesRange(range.from, range.to);
    const comparison = range.comparisonRange
        ? await aggregateSalesRange(range.comparisonRange.from, range.comparisonRange.to)
        : null;

    return {
        meta: {
            period: range.period,
            label: range.label,
            from: formatDate(range.from),
            to: formatDate(range.to),
            compare: range.compare,
            comparisonLabel: range.comparisonRange?.label ?? null,
        },
        data: current.data,
        summary: current.summary,
        comparison: comparison
            ? {
                  label: range.comparisonRange!.label,
                  summary: comparison.summary,
              }
            : null,
    };
}

export async function getProfitReport(
    filters: ReportFiltersInput = {}
): Promise<BaseReportResult<ProfitReportRow, ProfitReportSummary>> {
    await connectDB();

    const range = resolveReportRange(filters);
    const current = await aggregateProfitRange(range.from, range.to);
    const comparison = range.comparisonRange
        ? await aggregateProfitRange(range.comparisonRange.from, range.comparisonRange.to)
        : null;

    return {
        meta: {
            period: range.period,
            label: range.label,
            from: formatDate(range.from),
            to: formatDate(range.to),
            compare: range.compare,
            comparisonLabel: range.comparisonRange?.label ?? null,
        },
        data: current.data,
        summary: current.summary,
        comparison: comparison
            ? {
                  label: range.comparisonRange!.label,
                  summary: comparison.summary,
              }
            : null,
    };
}

export async function getStockReport(
    filters: ReportFiltersInput = {}
): Promise<BaseReportResult<StockReportRow, StockReportSummary>> {
    await connectDB();

    const range = resolveReportRange(filters);
    const [products, batches] = await Promise.all([
        Product.find({ isActive: true })
            .select('_id nameAr category')
            .lean<Array<{ _id: { toString(): string }; nameAr: string; category?: string }>>(),
        Batch.find()
            .select('productId warehouseQty floorQty purchasePrice expirationDate')
            .lean<
                Array<{
                    productId: { toString(): string };
                    warehouseQty: number;
                    floorQty: number;
                    purchasePrice: number;
                    expirationDate: Date;
                }>
            >(),
    ]);

    const byProduct = new Map<
        string,
        {
            warehouseQty: number;
            floorQty: number;
            stockValue: number;
            earliestExpiry: Date | null;
        }
    >();

    for (const batch of batches) {
        const key = batch.productId.toString();
        const current = byProduct.get(key) ?? {
            warehouseQty: 0,
            floorQty: 0,
            stockValue: 0,
            earliestExpiry: null,
        };

        current.warehouseQty += batch.warehouseQty;
        current.floorQty += batch.floorQty;
        current.stockValue += (batch.warehouseQty + batch.floorQty) * batch.purchasePrice;

        if (
            batch.warehouseQty + batch.floorQty > 0 &&
            (!current.earliestExpiry || batch.expirationDate < current.earliestExpiry)
        ) {
            current.earliestExpiry = batch.expirationDate;
        }

        byProduct.set(key, current);
    }

    const data = products
        .map<StockReportRow>((product) => {
            const stock = byProduct.get(product._id.toString()) ?? {
                warehouseQty: 0,
                floorQty: 0,
                stockValue: 0,
                earliestExpiry: null,
            };

            return {
                productId: product._id.toString(),
                nameAr: product.nameAr,
                category: product.category ?? null,
                warehouseQty: stock.warehouseQty,
                floorQty: stock.floorQty,
                totalQty: stock.warehouseQty + stock.floorQty,
                stockValue: stock.stockValue,
                earliestExpiry: stock.earliestExpiry ? formatDate(stock.earliestExpiry) : null,
            };
        })
        .sort((left, right) => right.totalQty - left.totalQty);

    const summary = data.reduce<StockReportSummary>(
        (accumulator, row) => {
            accumulator.totalProducts += 1;
            accumulator.totalWarehouseQty += row.warehouseQty;
            accumulator.totalFloorQty += row.floorQty;
            accumulator.totalQty += row.totalQty;
            accumulator.stockValue += row.stockValue;
            return accumulator;
        },
        {
            totalProducts: 0,
            totalWarehouseQty: 0,
            totalFloorQty: 0,
            totalQty: 0,
            stockValue: 0,
        }
    );

    return {
        meta: {
            period: range.period,
            label: range.label,
            from: formatDate(range.from),
            to: formatDate(range.to),
            compare: range.compare,
            comparisonLabel: null,
        },
        data,
        summary,
        comparison: null,
    };
}

export async function getCustomerDebtReport(
    filters: ReportFiltersInput = {}
): Promise<BaseReportResult<DebtReportRow, DebtReportSummary>> {
    await connectDB();

    const range = resolveReportRange(filters);
    const customers = await Customer.find({ totalOwed: { $gt: 0 } })
        .sort({ totalOwed: -1, createdAt: -1 })
        .select('_id name phone totalOwed createdAt')
        .lean<
            Array<{
                _id: { toString(): string };
                name: string;
                phone?: string | null;
                totalOwed: number;
                createdAt?: Date;
            }>
        >();

    const data = customers.map<DebtReportRow>((customer) => ({
        entityId: customer._id.toString(),
        name: customer.name,
        phone: customer.phone ?? null,
        totalOwed: customer.totalOwed,
        createdAt: customer.createdAt ? formatDate(customer.createdAt) : null,
    }));

    return {
        meta: {
            period: range.period,
            label: range.label,
            from: formatDate(range.from),
            to: formatDate(range.to),
            compare: range.compare,
            comparisonLabel: null,
        },
        data,
        summary: {
            entityCount: data.length,
            totalOwed: data.reduce((sum, customer) => sum + customer.totalOwed, 0),
        },
        comparison: null,
    };
}

export async function getSupplierDebtReport(
    filters: ReportFiltersInput = {}
): Promise<BaseReportResult<DebtReportRow, DebtReportSummary>> {
    await connectDB();

    const range = resolveReportRange(filters);
    const suppliers = await Supplier.find({ totalOwed: { $gt: 0 } })
        .sort({ totalOwed: -1, createdAt: -1 })
        .select('_id name phone totalOwed createdAt')
        .lean<
            Array<{
                _id: { toString(): string };
                name: string;
                phone?: string | null;
                totalOwed: number;
                createdAt?: Date;
            }>
        >();

    const data = suppliers.map<DebtReportRow>((supplier) => ({
        entityId: supplier._id.toString(),
        name: supplier.name,
        phone: supplier.phone ?? null,
        totalOwed: supplier.totalOwed,
        createdAt: supplier.createdAt ? formatDate(supplier.createdAt) : null,
    }));

    return {
        meta: {
            period: range.period,
            label: range.label,
            from: formatDate(range.from),
            to: formatDate(range.to),
            compare: range.compare,
            comparisonLabel: null,
        },
        data,
        summary: {
            entityCount: data.length,
            totalOwed: data.reduce((sum, supplier) => sum + supplier.totalOwed, 0),
        },
        comparison: null,
    };
}
