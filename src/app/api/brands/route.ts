import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/lib/auth/middleware';
import { connectDB } from '@/lib/db/connection';
import Brand from '@/lib/models/Brand';

export const GET = withPermission('products.view', async (req: NextRequest) => {
    try {
        await connectDB();

        const searchParams = req.nextUrl.searchParams;
        const search = searchParams.get('search') || '';
        const all = searchParams.get('all') === 'true';

        const filter: any = { isActive: true };

        if (search) {
            filter.$or = [
                { nameAr: { $regex: search, $options: 'i' } },
                { nameEn: { $regex: search, $options: 'i' } },
            ];
        }

        const query = Brand.find(filter).sort({ nameEn: 1 });

        if (!all) {
            query.limit(50);
        }

        const brands = await query.lean();

        return NextResponse.json({ data: brands });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Error fetching brands';
        return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message } }, { status: 500 });
    }
});
