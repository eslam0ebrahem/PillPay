import { connectDB } from '@/lib/db/connection';
import mongoose from 'mongoose';
import Customer from '@/lib/models/Customer';

// The Report service will need the SaleInvoice and SupplierInvoice models
// which will be created in later phases, but we can set up the skeleton
// and the customer debt calculation for now.

export interface DashboardSummary {
    todaySales: number;
    netProfit: number;
    cashInHand: number;
    totalCustomerDebt: number;
    totalSupplierDebt: number;
    topSellingProducts: { id: string; name: string; quantity: number }[];
    slowMovingProducts: { id: string; name: string; quantity: number }[];
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
    await connectDB();

    // 1. Calculate Customer Debt
    const customerDebtAgg = await Customer.aggregate([
        { $group: { _id: null, total: { $sum: '$totalOwed' } } },
    ]);
    const totalCustomerDebt = customerDebtAgg[0]?.total || 0;

    // Since we haven't created the SaleInvoice or Supplier and SupplierInvoice models yet 
    // (these are in Phase 4 and Phase 6 respectively), we'll return mock data or 
    // partial data for the missing metrics until those models are available.

    // TO DO: Implement query for actual todaySales, netProfit, cashInHand (from SaleInvoice)
    const todaySales = 0;
    const netProfit = 0;
    const cashInHand = 0;

    // TO DO: Implement query for totalSupplierDebt (from Supplier model, once created)
    const totalSupplierDebt = 0;

    // TO DO: Implement query for top/slow moving products (from SaleInvoice aggregation)
    const topSellingProducts: { id: string; name: string; quantity: number }[] = [];
    const slowMovingProducts: { id: string; name: string; quantity: number }[] = [];

    return {
        todaySales,
        netProfit,
        cashInHand,
        totalCustomerDebt,
        totalSupplierDebt,
        topSellingProducts,
        slowMovingProducts,
    };
}
