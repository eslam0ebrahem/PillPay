import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/lib/auth/middleware';
import { connectDB } from '@/lib/db/connection';
import Category from '@/lib/models/Category';

export const GET = withPermission('products.view', async (_req: NextRequest) => {
    try {
        await connectDB();

        const categories = await Category.find({ isActive: true })
            .sort({ nameAr: 1 })
            .lean();

        return NextResponse.json({ data: categories });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Error fetching categories';
        return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message } }, { status: 500 });
    }
});
