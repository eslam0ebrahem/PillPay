import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/lib/auth/middleware';
import { connectDB } from '@/lib/db/connection';
import StockTransfer from '@/lib/models/StockTransfer';
import { transferToFloor, transferToWarehouse } from '@/lib/services/stock.service';
import { z } from 'zod';
import mongoose from 'mongoose';

const transferSchema = z.object({
    productId: z.string(),
    batchId: z.string(),
    quantity: z.number().int().positive(),
    direction: z.enum(['to_floor', 'to_warehouse']),
    reason: z.string().min(1, 'السبب مطلوب'),
});

export const GET = withPermission('stock.view', async (request: NextRequest) => {
    try {
        await connectDB();
        const searchParams = request.nextUrl.searchParams;
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');
        const productId = searchParams.get('productId');
        const direction = searchParams.get('direction');

        const filter: any = {};
        if (productId) {
            filter.productId = new mongoose.Types.ObjectId(productId);
        }
        if (direction) {
            filter.direction = direction;
        }

        const transfers = await StockTransfer.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('productId', 'nameAr')
            .populate('batchId', 'batchNumber expirationDate')
            .populate('transferredBy', 'name');

        const total = await StockTransfer.countDocuments(filter);

        return NextResponse.json({
            data: transfers,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});

export const POST = withPermission('stock.transfer', async (request: NextRequest, context) => {
    try {
        const body = await request.json();
        const validatedPayload = transferSchema.parse(body);

        const userId = context.user._id;

        let transfer;
        if (validatedPayload.direction === 'to_floor') {
            transfer = await transferToFloor(
                validatedPayload.productId,
                validatedPayload.batchId,
                validatedPayload.quantity,
                validatedPayload.reason,
                userId
            );
        } else {
            transfer = await transferToWarehouse(
                validatedPayload.productId,
                validatedPayload.batchId,
                validatedPayload.quantity,
                validatedPayload.reason,
                userId
            );
        }

        return NextResponse.json({ success: true, data: transfer }, { status: 201 });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'بيانات غير صالحة', details: error.errors }, { status: 400 });
        }
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
});
