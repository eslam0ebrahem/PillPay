import { NextRequest, NextResponse } from 'next/server';
import { login, seedOwnerOnFirstRun } from '@/lib/services/auth.service';
import { loginSchema } from '@/lib/utils/validation';

export async function POST(req: NextRequest) {
    try {
        // Seed owner on first run
        await seedOwnerOnFirstRun();

        const body = await req.json();
        const parsed = loginSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                {
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'بيانات غير صالحة',
                        details: parsed.error.errors.map((e) => ({
                            field: e.path.join('.'),
                            message: e.message,
                        })),
                    },
                },
                { status: 400 }
            );
        }

        const result = await login(parsed.data.email, parsed.data.password);

        const response = NextResponse.json({ user: result.user }, { status: 200 });

        // Set HTTP-only cookies
        response.cookies.set('auth-token', result.accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24, // 24 hours
        });

        response.cookies.set('refresh-token', result.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 7, // 7 days
        });

        return response;
    } catch (error) {
        const message =
            error instanceof Error ? error.message : 'حدث خطأ غير متوقع';
        return NextResponse.json(
            { error: { code: 'AUTH_ERROR', message } },
            { status: 401 }
        );
    }
}
