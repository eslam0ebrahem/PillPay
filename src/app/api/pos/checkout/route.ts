import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/lib/auth/middleware';
import { checkout } from '@/lib/services/pos.service';
import { getCurrentUser } from '@/lib/auth/session';

export const POST = withPermission('pos.checkout', async (req: NextRequest) => {
    try {
        const input = await req.json();
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 });
        }

        // Attach cashier ID
        input.cashierId = user._id;

        const invoiceId = await checkout(input);
        return NextResponse.json({ success: true, invoiceId }, { status: 201 });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Error processing checkout';
        // Return 400 for business logic errors like insufficient stock, 500 otherwise
        const status = message.includes('المخزون غير كافي') || message.includes('المنتج') ? 400 : 500;
        return NextResponse.json({ error: { code: 'CHECKOUT_ERROR', message } }, { status });
    }
});
