import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/lib/auth/middleware';
import { connectDB } from '@/lib/db/connection';
import Supplier from '@/lib/models/Supplier';
import SupplierInvoice from '@/lib/models/SupplierInvoice';
import SupplierPayment from '@/lib/models/SupplierPayment';
import { z } from 'zod';

const updateSupplierSchema = z.object({
    name: z.string().min(1, 'اسم المورد مطلوب').optional(),
    phone: z.string().optional(),
    email: z.string().email('بريد إلكتروني غير صالح').optional().or(z.literal('')),
    address: z.string().optional(),
    contactPerson: z.string().optional(),
    taxId: z.string().optional(),
    commercialRegister: z.string().optional(),
    isActive: z.boolean().optional(),
});

export const GET = withPermission('suppliers.view', async (req: NextRequest, context: any) => {
    try {
        await connectDB();

        const params = await context.params;
        const id = params.id;

        const supplier = await Supplier.findById(id).lean();
        if (!supplier) {
            return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'المورد غير موجود' } }, { status: 404 });
        }

        const recentInvoices = await SupplierInvoice.find({ supplierId: id })
            .sort({ date: -1 })
            .limit(10)
            .lean();

        const recentPayments = await SupplierPayment.find({ supplierId: id })
            .sort({ date: -1 })
            .populate('recordedBy', 'name')
            .limit(10)
            .lean();

        return NextResponse.json({ supplier, recentInvoices, recentPayments });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Error fetching supplier';
        return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message } }, { status: 500 });
    }
});

export const PUT = withPermission('suppliers.manage', async (req: NextRequest, context: any) => {
    try {
        await connectDB();

        const params = await context.params;
        const id = params.id;
        const body = await req.json();

        // Validation
        const parsed = updateSupplierSchema.parse(body);

        const supplier = await Supplier.findByIdAndUpdate(id, parsed, { new: true, runValidators: true });
        if (!supplier) {
            return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'المورد غير موجود' } }, { status: 404 });
        }

        return NextResponse.json(supplier);
    } catch (error: any) {
        if (error.name === 'ZodError') {
            return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: error.errors } }, { status: 400 });
        }
        return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: error.message } }, { status: 500 });
    }
});
