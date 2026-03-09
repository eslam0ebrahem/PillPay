import { connectDB } from '@/lib/db/connection';
import Customer from '@/lib/models/Customer';
import Product from '@/lib/models/Product';
import SaleInvoice from '@/lib/models/SaleInvoice';
import Supplier from '@/lib/models/Supplier';

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

function getTodayRange() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    return { start, end };
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
    await connectDB();

    const { start, end } = getTodayRange();

    const [
        todayMetrics,
        customerDebt,
        supplierDebt,
        topSellingProducts,
        soldQuantities,
        activeProducts,
    ] = await Promise.all([
        SaleInvoice.aggregate([
            {
                $match: {
                    status: 'completed',
                    createdAt: { $gte: start, $lt: end },
                },
            },
            {
                $project: {
                    total: 1,
                    paidAmount: 1,
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
                    _id: null,
                    todaySales: { $sum: '$total' },
                    cashInHand: { $sum: '$paidAmount' },
                    netProfit: { $sum: { $subtract: ['$total', '$cogs'] } },
                },
            },
        ]),
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
        Product.find({ isActive: true })
            .select('_id nameAr')
            .lean<Array<{ _id: { toString(): string }; nameAr: string }>>(),
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
        .sort((left, right) => left.quantity - right.quantity || left.name.localeCompare(right.name, 'ar'))
        .slice(0, 5);

    const todaySummary = todayMetrics[0] ?? {
        todaySales: 0,
        cashInHand: 0,
        netProfit: 0,
    };

    return {
        todaySales: todaySummary.todaySales ?? 0,
        cashInHand: todaySummary.cashInHand ?? 0,
        netProfit: todaySummary.netProfit ?? 0,
        totalCustomerDebt: customerDebt[0]?.totalCustomerDebt ?? 0,
        totalSupplierDebt: supplierDebt[0]?.totalSupplierDebt ?? 0,
        topSellingProducts,
        slowMovingProducts,
    };
}
