import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/lib/auth/middleware';
import { searchProducts } from '@/lib/services/pos.service';

export const POST = withPermission('pos.search', async (req: NextRequest) => {
    try {
        const { query, type } = await req.json();

        if (!query || !['text', 'barcode'].includes(type)) {
            return NextResponse.json(
                { error: { code: 'VALIDATION_ERROR', message: 'Invalid search parameters' } },
                { status: 400 }
            );
        }

        const results = await searchProducts(query, type as 'text' | 'barcode');
        return NextResponse.json(results);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Error searching products';
        return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message } }, { status: 500 });
    }
});
