import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/lib/auth/middleware';
import { connectDB } from '@/lib/db/connection';
import Product from '@/lib/models/Product';
import Batch from '@/lib/models/Batch';
import { productSchema, isValidObjectId } from '@/lib/utils/validation';

export const GET = withPermission('products.view', async (req: NextRequest, context: any) => {
    try {
        await connectDB();

        const params = await context.params;
        const id = params.id;

        if (!isValidObjectId(id)) {
            return NextResponse.json(
                { error: { code: 'INVALID_INPUT', message: 'المعرف غير صالح' } },
                { status: 400 }
            );
        }

        const product = await Product.findById(id)
            .populate('brand', 'nameAr nameEn image')
            .lean<any>();
        if (!product) {
            return NextResponse.json(
                { error: { code: 'NOT_FOUND', message: 'المنتج غير موجود' } },
                { status: 404 }
            );
        }

        const batches = await Batch.find({ productId: id })
            .sort({ expirationDate: 1 })
            .populate('supplierInvoiceId', 'invoiceNumber date')
            .lean();

        // Calculate aggregated stock
        let totalFloorQty = 0;
        let totalWarehouseQty = 0;
        batches.forEach((b) => {
            totalFloorQty += b.floorQty;
            totalWarehouseQty += b.warehouseQty;
        });

        return NextResponse.json({
            product,
            batches,
            stockSummary: {
                totalFloorQty,
                totalWarehouseQty,
                totalQty: totalFloorQty + totalWarehouseQty,
            },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Error fetching product';
        return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message } }, { status: 500 });
    }
});

export const PUT = withPermission('products.manage', async (req: NextRequest, context: any) => {
    try {
        await connectDB();

        const params = await context.params;
        const id = params.id;

        if (!isValidObjectId(id)) {
            return NextResponse.json(
                { error: { code: 'INVALID_INPUT', message: 'المعرف غير صالح' } },
                { status: 400 }
            );
        }

        const body = await req.json();

        const parsed = productSchema.parse(body);

        // Check barcode uniqueness if provided and changed
        if (parsed.barcode) {
            const existing = await Product.findOne({ barcode: parsed.barcode, _id: { $ne: id } });
            if (existing) {
                return NextResponse.json(
                    { error: { code: 'INVALID_INPUT', message: 'منتج آخر يستخدم نفس الباركود' } },
                    { status: 400 }
                );
            }
        }

        // Clean barcode
        if (!parsed.barcode || parsed.barcode.trim() === '') {
            (parsed as any).barcode = null;
        }

        const product = await Product.findByIdAndUpdate(id, parsed, {
            new: true,
            runValidators: true,
        });
        if (!product) {
            return NextResponse.json(
                { error: { code: 'NOT_FOUND', message: 'المنتج غير موجود' } },
                { status: 404 }
            );
        }

        return NextResponse.json(product);
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
