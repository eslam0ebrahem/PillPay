import { describe, it, expect, beforeAll } from 'vitest';

// JWT module-level env validation runs on import — set secrets before importing
beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long!!';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-at-least-32-chars-long!!';
});

describe('JWT utilities', () => {
    it('generates and verifies an access token', async () => {
        // Dynamic import ensures env vars are set before the module-level validation runs
        const { generateAccessToken, verifyAccessToken } = await import('@/lib/auth/jwt');
        const payload = { userId: 'user123', role: 'owner' as const, email: 'test@example.com' };
        const token = generateAccessToken(payload);
        expect(typeof token).toBe('string');
        const decoded = verifyAccessToken(token);
        expect(decoded.userId).toBe('user123');
        expect(decoded.role).toBe('owner');
    });

    it('generates and verifies a refresh token', async () => {
        const { generateRefreshToken, verifyRefreshToken } = await import('@/lib/auth/jwt');
        const payload = {
            userId: 'user456',
            role: 'cashier' as const,
            email: 'cashier@example.com',
        };
        const token = generateRefreshToken(payload);
        const decoded = verifyRefreshToken(token);
        expect(decoded.userId).toBe('user456');
    });

    it('throws on invalid access token', async () => {
        const { verifyAccessToken } = await import('@/lib/auth/jwt');
        expect(() => verifyAccessToken('invalid.token.here')).toThrow();
    });

    it('throws when verifying access token with refresh secret (wrong key)', async () => {
        const { generateRefreshToken, verifyAccessToken } = await import('@/lib/auth/jwt');
        const token = generateRefreshToken({
            userId: 'x',
            role: 'owner' as const,
            email: 'x@x.com',
        });
        expect(() => verifyAccessToken(token)).toThrow();
    });
});
