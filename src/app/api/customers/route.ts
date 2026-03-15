import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/lib/auth/middleware';
import { connectDB } from '@/lib/db/connection';
import Customer from '@/lib/models/Customer';
import { z } from 'zod';

const createCustomerSchema = z.object({
    name: z.string().min(1, 'اسم العميل مطلوب'),
    phone: z.string().optional(),
    totalOwed: z.number().optional().default(0),
});

export const GET = withPermission('customers.view', async (req: NextRequest) => {
    try {
        await connectDB();

        const searchParams = req.nextUrl.searchParams;
        const search = searchParams.get('search') || '';
        const hasDebt = searchParams.get('hasDebt') === 'true';

        const filter: any = {};

        if (search) {
            const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            filter.$or = [
                { name: { $regex: safeSearch, $options: 'i' } },
                { phone: { $regex: safeSearch, $options: 'i' } },
            ];
        }

        if (hasDebt) {
            filter.totalOwed = { $gt: 0 };
        }

        const customers = await Customer.find(filter).sort({ name: 1 }).lean();

        return NextResponse.json({ data: customers });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Error fetching customers';
        return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message } }, { status: 500 });
    }
});

export const POST = withPermission('customers.manage', async (req: NextRequest) => {
    try {
        await connectDB();
        const body = await req.json();

        // Validation
        const parsed = createCustomerSchema.parse(body);

        // Convert totalOwed setup value to piasters if it's considered EGP, but normally it starts at 0 anyway
        if (parsed.totalOwed && parsed.totalOwed > 0) {
            parsed.totalOwed = Math.round(parsed.totalOwed * 100);
        }

        const customer = new Customer(parsed);
        await customer.save();

        return NextResponse.json(customer, { status: 201 });
    } catch (error: any) {
        if (error.name === 'ZodError') {
            return NextResponse.json(
                { error: { code: 'VALIDATION_ERROR', message: error.errors } },
                { status: 400 }
            );
        }
        return NextResponse.json(
            { error: { code: 'INTERNAL_ERROR', message: error.message } },
            { status: 500 }
        );
    }
});
