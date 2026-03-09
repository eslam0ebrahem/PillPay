import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/lib/auth/middleware';
import { connectDB } from '@/lib/db/connection';
import SupplierInvoice from '@/lib/models/SupplierInvoice';

export const GET = withPermission('suppliers.view', async (req: NextRequest, context: any) => {
    try {
        await connectDB();

        const params = await context.params;
        const id = params.id;

        const invoice = await SupplierInvoice.findById(id)
            .populate('supplierId', 'name phone address')
            .populate('items.productId', 'nameAr nameEn barcode')
            .lean();

        if (!invoice) {
            return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'الفاتورة غير موجودة' } }, { status: 404 });
        }

        return NextResponse.json(invoice);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Error fetching invoice';
        return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message } }, { status: 500 });
    }
});
