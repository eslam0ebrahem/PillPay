import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/lib/auth/middleware';
import { connectDB } from '@/lib/db/connection';
import SupplierInvoice from '@/lib/models/SupplierInvoice';
import { createSupplierInvoice } from '@/lib/services/supplier.service';
import { supplierInvoiceSchema } from '@/lib/utils/validation';

export const GET = withPermission('suppliers.view', async (req: NextRequest) => {
    try {
        await connectDB();

        const searchParams = req.nextUrl.searchParams;
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const supplierId = searchParams.get('supplierId');
        const status = searchParams.get('status');
        const invoiceNumber = searchParams.get('invoiceNumber');

        const filter: any = {};

        if (supplierId) filter.supplierId = supplierId;
        if (status) filter.status = status;
        if (invoiceNumber) filter.invoiceNumber = { $regex: invoiceNumber, $options: 'i' };

        const skip = (page - 1) * limit;

        const [invoices, total] = await Promise.all([
            SupplierInvoice.find(filter)
                .populate('supplierId', 'name')
                .sort({ date: -1, createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            SupplierInvoice.countDocuments(filter),
        ]);

        return NextResponse.json({
            data: invoices,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Error fetching supplier invoices';
        return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message } }, { status: 500 });
    }
});

export const POST = withPermission('suppliers.manage', async (req: NextRequest) => {
    try {
        const user = (req as any).user;
        const userId = user?.id || user?._id;

        const body = await req.json();

        // Validation
        const parsed = supplierInvoiceSchema.parse(body);

        // Calculate totals dynamically instead of trusting the client
        let total = 0;
        const items = parsed.items.map((item) => {
            const lineTotal = item.quantity * item.unitCost;
            total += lineTotal;
            return {
                ...item,
                lineTotal,
            };
        });

        const invoiceData = {
            ...parsed,
            items,
            total,
            paidAmount: body.paidAmount || 0, // from client if they made an immediate payment
        };

        const invoice = await createSupplierInvoice(invoiceData, userId);

        return NextResponse.json(invoice, { status: 201 });
    } catch (error: any) {
        if (error.name === 'ZodError') {
            return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: error.errors } }, { status: 400 });
        }
        return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: error.message } }, { status: 500 });
    }
});
