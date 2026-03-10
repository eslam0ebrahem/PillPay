import { connectDB } from '@/lib/db/connection';
import mongoose from 'mongoose';
import Product from '@/lib/models/Product';
import Customer from '@/lib/models/Customer';
import SaleInvoice from '@/lib/models/SaleInvoice';
import { getSettings } from '@/lib/models/Settings';
import { allocateBatchesFEFO, deductFloorStock, getProductFloorStock } from './stock.service';
import { generateInvoiceNumber } from '@/lib/utils/invoiceNumber';
import { logAction } from './audit.service';
import { calcSubtotal, calcDiscountAmount } from '@/lib/utils/money';
import { convertToBaseUnits } from '@/utils/units';
import type { DiscountObj, PaymentMode, ISaleItem, UnitSold } from '@/lib/types';

export interface CheckoutItemInput {
    productId: string;
    quantity: number;
    unitSold: UnitSold;
    discount?: DiscountObj;
}

export interface CheckoutInput {
    items: CheckoutItemInput[];
    invoiceDiscount?: DiscountObj;
    paymentMode: PaymentMode;
    paidAmount?: number;
    customerId?: string | null;
    cashierId: string;
}

interface ProductSearchResult {
    _id: string;
    barcode: string | null;
    nameAr: string;
    nameEn?: string;
    sellingPrice: number;
    baseUnit: string;
    subUnit?: string | null;
    subUnitConversionFactor?: number | null;
    floorStock: number; // calculated total floor stock
}

/**
 * Search active products by text or barcode.
 * Returns product with its total available floor stock.
 */
export async function searchProducts(
    query: string,
    type: 'text' | 'barcode'
): Promise<ProductSearchResult[]> {
    await connectDB();

    let filter: any = { isActive: true };

    if (type === 'barcode') {
        filter.barcode = query.trim();
    } else if (type === 'text' && query.trim()) {
        const q = query.trim();
        // Try text index first, fallback to regex for partial matches
        filter = {
            isActive: true,
            $or: [
                { nameAr: { $regex: q, $options: 'i' } },
                { nameEn: { $regex: q, $options: 'i' } },
            ],
        };
    } else {
        // Empty text search returns empty array
        return [];
    }

    // Limit results to 20 for performance
    const products = await Product.find(filter).limit(20).lean<any[]>();

    const results: ProductSearchResult[] = [];

    for (const p of products) {
        const floorStock = await getProductFloorStock(p._id);
        results.push({
            _id: p._id.toString(),
            barcode: p.barcode || null,
            nameAr: p.nameAr,
            nameEn: p.nameEn,
            sellingPrice: p.sellingPrice,
            baseUnit: p.baseUnit,
            subUnit: p.subUnit,
            subUnitConversionFactor: p.subUnitConversionFactor,
            floorStock,
        });
    }

    return results;
}

/**
 * Handle POS Checkout:
 * 1. Validate constraints & discounts
 * 2. Allocate & deduct FEFO stock per item
 * 3. Calculate totals & build invoice
 * 4. Update customer debt if credit/partial
 * 5. Log audit trail
 * Executed in a MongoDB Transaction.
 */
export async function checkout(input: CheckoutInput): Promise<string> {
    const { items, invoiceDiscount, paymentMode, paidAmount = 0, customerId, cashierId } = input;

    await connectDB();
    const settings = await getSettings();

    // Validate Credit/Partial needs Customer
    if ((paymentMode === 'credit' || paymentMode === 'partial') && !customerId) {
        throw new Error('يجب اختيار عميل للمعاملات الآجلة أو الجزئية');
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const saleItems: ISaleItem[] = [];
        let invoiceSubtotal = 0;

        for (const itemInput of items) {
            const product = await Product.findById(itemInput.productId).session(session);
            if (!product || !product.isActive) {
                throw new Error(`المنتج غير موجود أو غير نشط: ${itemInput.productId}`);
            }

            // Calculate quantity in base units for stock deduction
            let qtyInBaseUnits = itemInput.quantity;
            if (itemInput.unitSold === 'sub') {
                if (!product.subUnitConversionFactor) {
                    throw new Error(`المنتج ${product.nameAr} لا يحتوي على معامل تحويل فرعي`);
                }
                qtyInBaseUnits = convertToBaseUnits(itemInput.quantity, product.subUnitConversionFactor);
            }

            // Validate Discount
            if (itemInput.discount?.type === 'percentage' && itemInput.discount.value > settings.maxDiscountPercentage) {
                throw new Error(`نسبة الخصم للمنتج ${product.nameAr} تتجاوز الحد الأقصى المسموح`);
            }

            // FEFO Allocation
            const allocationResult = await allocateBatchesFEFO(product._id, qtyInBaseUnits, session);

            if (allocationResult.allocatedQuantity === 0) {
                throw new Error(`لا يوجد مخزون متاح للمنتج ${product.nameAr}`);
            }

            if (allocationResult.allocatedQuantity < qtyInBaseUnits) {
                throw new Error(`المخزون غير كافي للمنتج ${product.nameAr}`);
            }

            // Deduct Stock
            await deductFloorStock(allocationResult.allocations, session);

            // Financials
            // If selling by sub-unit, unit price is proportionally reduced
            let unitPrice = product.sellingPrice;
            if (itemInput.unitSold === 'sub' && product.subUnitConversionFactor) {
                unitPrice = Math.round(product.sellingPrice / product.subUnitConversionFactor);
            }

            const itemSubtotal = calcSubtotal(unitPrice, itemInput.quantity, itemInput.discount);
            invoiceSubtotal += itemSubtotal;

            saleItems.push({
                productId: product._id,
                productNameAr: product.nameAr,
                quantity: qtyInBaseUnits,
                unitSold: itemInput.unitSold,
                displayQuantity: itemInput.quantity,
                unitPrice,
                discount: itemInput.discount,
                subtotal: itemSubtotal,
                batchAllocations: allocationResult.allocations,
            });
        }

        // Invoice level discount validation
        if (invoiceDiscount?.type === 'percentage' && invoiceDiscount.value > settings.maxDiscountPercentage) {
            throw new Error(`نسبة خصم الفاتورة تتجاوز الحد الأقصى المسموح`);
        }

        const discountAmountTotal = calcDiscountAmount(invoiceSubtotal, invoiceDiscount);
        const total = Math.max(0, invoiceSubtotal - discountAmountTotal);

        // Calculate Paid / Remaining
        let actualPaidAmount = 0;
        let remainingBalance = 0;

        if (paymentMode === 'cash') {
            actualPaidAmount = total;
            remainingBalance = 0;
        } else if (paymentMode === 'credit') {
            actualPaidAmount = 0;
            remainingBalance = total;
        } else if (paymentMode === 'partial') {
            actualPaidAmount = Math.min(total, Math.max(0, paidAmount));
            remainingBalance = Math.max(0, total - actualPaidAmount);
        }

        let paymentStatus = 'paid';
        if (remainingBalance > 0) {
            paymentStatus = actualPaidAmount > 0 ? 'partial' : 'unpaid';
        }

        // Create Invoice
        const invoiceNumber = await generateInvoiceNumber();
        const invoice = new SaleInvoice({
            invoiceNumber,
            items: saleItems,
            subtotal: invoiceSubtotal,
            invoiceDiscount,
            total,
            paidAmount: actualPaidAmount,
            remainingBalance,
            paymentMode,
            paymentStatus,
            customerId: customerId ? new mongoose.Types.ObjectId(customerId) : undefined,
            cashierId: new mongoose.Types.ObjectId(cashierId),
            status: 'completed',
        });

        await invoice.save({ session });

        // Update Customer Debt
        if (remainingBalance > 0 && customerId) {
            await Customer.findByIdAndUpdate(
                customerId,
                { $inc: { totalOwed: remainingBalance } },
                { session }
            );
        }

        // Log Audit
        await logAction({
            userId: cashierId,
            action: 'SALE_CREATED',
            entityType: 'SaleInvoice',
            entityId: invoice._id.toString(),
            invoiceNumber,
            productId: saleItems.length === 1 ? saleItems[0].productId.toString() : undefined,
        });

        await session.commitTransaction();
        return invoice._id.toString();
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
}
