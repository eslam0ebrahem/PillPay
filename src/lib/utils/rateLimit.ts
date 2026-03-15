/**
 * Simple in-memory rate limiter.
 * Tracks request counts per key (IP or userId) within a sliding window.
 * For production with multiple instances, replace with Redis-based solution.
 */

interface RateLimitEntry {
    count: number;
    windowStart: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 10 minutes
setInterval(
    () => {
        const now = Date.now();
        for (const [key, entry] of store.entries()) {
            if (now - entry.windowStart > 10 * 60 * 1000) {
                store.delete(key);
            }
        }
    },
    10 * 60 * 1000
);

export interface RateLimitOptions {
    /** Maximum requests allowed in the window */
    max: number;
    /** Window duration in milliseconds */
    windowMs: number;
}

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetAt: number;
}

/**
 * Check if a request should be rate-limited.
 * @param key - Unique identifier (e.g., IP address or user ID)
 * @param options - Rate limit configuration
 */
export function checkRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || now - entry.windowStart >= options.windowMs) {
        // New window
        store.set(key, { count: 1, windowStart: now });
        return {
            allowed: true,
            remaining: options.max - 1,
            resetAt: now + options.windowMs,
        };
    }

    entry.count += 1;

    if (entry.count > options.max) {
        return {
            allowed: false,
            remaining: 0,
            resetAt: entry.windowStart + options.windowMs,
        };
    }

    return {
        allowed: true,
        remaining: options.max - entry.count,
        resetAt: entry.windowStart + options.windowMs,
    };
}

/** Get the client IP from a NextRequest, falling back through known proxy headers. */
export function getClientIp(req: { headers: { get(name: string): string | null } }): string {
    return (
        req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        req.headers.get('x-real-ip') ||
        'unknown'
    );
}
