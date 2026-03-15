import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

type ApiHandlerFn<T = unknown> = () => Promise<T>;

interface ApiHandlerOptions {
    /** HTTP status code to use for a successful response (default: 200). */
    successStatus?: number;
}

/**
 * Wraps an API route handler with standardized error handling.
 *
 * - ZodError         → 400 VALIDATION_ERROR
 * - Error('...')     → 500 INTERNAL_ERROR  (message forwarded to client)
 * - Unknown thrown   → 500 INTERNAL_ERROR  with generic message
 *
 * Usage:
 * ```ts
 * export const GET = withPermission('resource.view', (req) =>
 *   apiHandler(() => {
 *     const data = await fetchData();
 *     return NextResponse.json({ data });
 *   })
 * );
 * ```
 */
export async function apiHandler<T>(
    fn: ApiHandlerFn<T>,
    { successStatus = 200 }: ApiHandlerOptions = {}
): Promise<NextResponse> {
    try {
        const result = await fn();
        // If the handler already returns a NextResponse, pass it through.
        if (result instanceof NextResponse) return result;
        return NextResponse.json(result, { status: successStatus });
    } catch (error) {
        if (error instanceof ZodError) {
            return NextResponse.json(
                { error: { code: 'VALIDATION_ERROR', message: error.errors } },
                { status: 400 }
            );
        }
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message } }, { status: 500 });
    }
}
