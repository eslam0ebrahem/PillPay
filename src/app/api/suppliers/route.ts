import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/lib/auth/middleware';
import { connectDB } from '@/lib/db/connection';
import Supplier from '@/lib/models/Supplier';
import { z } from 'zod';

// Extend the basic supplier schema for full creation
const createSupplierSchema = z.object({
    name: z.string().min(1, 'اسم المورد مطلوب'),
    phone: z.string().optional(),
    email: z.string().email('بريد إلكتروني غير صالح').optional().or(z.literal('')),
    address: z.string().optional(),
    contactPerson: z.string().optional(),
    taxId: z.string().optional(),
    commercialRegister: z.string().optional(),
    isActive: z.boolean().optional(),
});

export const GET = withPermission('suppliers.view', async (req: NextRequest) => {
    try {
        await connectDB();

        const searchParams = req.nextUrl.searchParams;
        const search = searchParams.get('search') || '';
        const isActive = searchParams.get('isActive');

        const filter: any = {};

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
                { contactPerson: { $regex: search, $options: 'i' } },
            ];
        }

        if (isActive !== null && isActive !== undefined && isActive !== '') {
            filter.isActive = isActive === 'true';
        }

        const suppliers = await Supplier.find(filter).sort({ name: 1 }).lean();

        return NextResponse.json({ data: suppliers });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Error fetching suppliers';
        return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message } }, { status: 500 });
    }
});

export const POST = withPermission('suppliers.manage', async (req: NextRequest) => {
    try {
        await connectDB();
        const body = await req.json();

        // Validation
        const parsed = createSupplierSchema.parse(body);

        const supplier = new Supplier(parsed);
        await supplier.save();

        return NextResponse.json(supplier, { status: 201 });
    } catch (error: any) {
        if (error.name === 'ZodError') {
            return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: error.errors } }, { status: 400 });
        }
        return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: error.message } }, { status: 500 });
    }
});
