import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/connection';
import IdempotencyKey from '@/lib/models/IdempotencyKey';
import type { AuthUser } from '@/lib/types';
import type { AuthenticatedHandler } from '@/lib/auth/middleware';

/**
 * Wrap a handler with idempotency key support.
 * If an `Idempotency-Key` header is provided and the same user has already
 * made this request, the cached response is returned immediately.
 *
 * Keys are scoped to the user and expire after 24 hours.
 */
export function withIdempotency(handler: AuthenticatedHandler): AuthenticatedHandler {
    return async (
        req: NextRequest,
        context: { params: Promise<Record<string, string>>; user: AuthUser }
    ) => {
        const idempotencyKey = req.headers.get('idempotency-key');

        if (!idempotencyKey) {
            // No key provided — proceed normally
            return handler(req, context);
        }

        const scopedKey = `${context.user._id}:${idempotencyKey}`;

        await connectDB();

        // Check if this key was already processed
        const existing = await IdempotencyKey.findOne({ key: scopedKey }).lean<{
            responseStatus: number;
            responseBody: string;
        } | null>();

        if (existing) {
            // Return cached response
            const body = JSON.parse(existing.responseBody);
            return NextResponse.json(body, { status: existing.responseStatus });
        }

        // Process the request
        const response = await handler(req, context);

        // Cache the response (only for successful state-changing operations)
        if (response.status >= 200 && response.status < 300) {
            try {
                const cloned = response.clone();
                const body = await cloned.text();
                await IdempotencyKey.create({
                    key: scopedKey,
                    userId: context.user._id,
                    responseStatus: response.status,
                    responseBody: body,
                });
            } catch {
                // If caching fails (e.g., duplicate key race), continue normally
            }
        }

        return response;
    };
}
