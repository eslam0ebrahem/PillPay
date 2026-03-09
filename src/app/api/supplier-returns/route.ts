import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/lib/auth/middleware';
import { processSupplierReturn } from '@/lib/services/supplier.service';
import { z } from 'zod';

const returnItemSchema = z.object({
    productId: z.string(),
    batchId: z.string(),
    quantity: z.number().min(1),
    unitCost: z.number().min(0),
});

const returnSchema = z.object({
    supplierId: z.string(),
    supplierInvoiceId: z.string().optional(),
    items: z.array(returnItemSchema).min(1),
});

export const POST = withPermission('suppliers.manage', async (req: NextRequest) => {
    try {
        const user = (req as any).user;
        const userId = user?.id || user?._id;

        const body = await req.json();
        const parsed = returnSchema.parse(body);

        // Convert costs and calculate totals
        let total = 0;
        const items = parsed.items.map(item => {
            const unitCostPiaster = Math.round(item.unitCost * 100);
            const lineTotal = item.quantity * unitCostPiaster;
            total += lineTotal;
            return {
                ...item,
                unitCost: unitCostPiaster,
                lineTotal,
            };
        });

        const returnData = {
            ...parsed,
            items,
            total,
        };

        const result = await processSupplierReturn(returnData, userId);

        return NextResponse.json(result, { status: 201 });
    } catch (error: any) {
        if (error.name === 'ZodError') {
            return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: error.errors } }, { status: 400 });
        }
        if (error.message.includes('الكمية')) {
            return NextResponse.json({ error: { code: 'CONFLICT', message: error.message } }, { status: 409 });
        }
        return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: error.message } }, { status: 500 });
    }
});
