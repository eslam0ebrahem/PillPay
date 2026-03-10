import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/lib/auth/middleware';
import { connectDB } from '@/lib/db/connection';
import Product from '@/lib/models/Product';
import Batch from '@/lib/models/Batch';
import { productSchema } from '@/lib/utils/validation';

export const GET = withPermission('products.view', async (req: NextRequest) => {
    try {
        await connectDB();

        const searchParams = req.nextUrl.searchParams;
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const search = searchParams.get('search') || '';
        const category = searchParams.get('category') || '';
        const isActive = searchParams.get('isActive');

        const filter: any = {};

        if (search) {
            filter.$or = [
                { $text: { $search: search } },
                { nameAr: { $regex: search, $options: 'i' } },
                { nameEn: { $regex: search, $options: 'i' } },
                { barcode: search },
                { barcode2: search },
            ];
        }

        if (category) {
            filter.category = category;
        }

        if (isActive !== null && isActive !== undefined && isActive !== '') {
            filter.isActive = isActive === 'true';
        }

        const skip = (page - 1) * limit;

        const [products, total] = await Promise.all([
            Product.find(filter)
                .sort({ nameAr: 1 })
                .skip(skip)
                .limit(limit)
                .lean<any[]>(),
            Product.countDocuments(filter),
        ]);

        // Fetch total stock (floor + warehouse) for each product to show in the list
        // This is a naive aggregation for the list view
        const productIds = products.map((p) => p._id);
        const stockAgg = await Batch.aggregate([
            { $match: { productId: { $in: productIds } } },
            {
                $group: {
                    _id: '$productId',
                    totalQty: { $sum: { $add: ['$warehouseQty', '$floorQty'] } },
                },
            },
        ]);

        const stockMap = new Map(stockAgg.map((s) => [s._id.toString(), s.totalQty]));

        const productsWithStock = products.map((p) => ({
            ...p,
            totalQty: stockMap.get(p._id.toString()) || 0,
        }));

        return NextResponse.json({
            data: productsWithStock,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Error fetching products';
        return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message } }, { status: 500 });
    }
});

export const POST = withPermission('products.manage', async (req: NextRequest) => {
    try {
        await connectDB();
        const body = await req.json();

        // Validate
        const parsed = productSchema.parse(body);

        // Check barcode uniqueness if provided
        if (parsed.barcode) {
            const existing = await Product.findOne({ barcode: parsed.barcode });
            if (existing) {
                return NextResponse.json(
                    { error: { code: 'INVALID_INPUT', message: 'منتج آخر يستخدم نفس الباركود' } },
                    { status: 400 }
                );
            }
        }

        // Clean barcode to be null instead of empty string for sparse index
        if (!parsed.barcode || parsed.barcode.trim() === '') {
            (parsed as any).barcode = null;
        }

        const product = new Product(parsed);
        await product.save();

        return NextResponse.json(product, { status: 201 });
    } catch (error: any) {
        if (error.name === 'ZodError') {
            return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: error.errors } }, { status: 400 });
        }
        return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: error.message } }, { status: 500 });
    }
});
