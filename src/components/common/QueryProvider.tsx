'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import type { ReactNode } from 'react';

// 1. Define the client configuration factory
function makeQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 60 * 1000, // 1 minute
                refetchOnWindowFocus: false,
                
                // Critical for POS: Don't silently retry failing requests 3 times (the default).
                // If a barcode fails to fetch, the cashier needs to know immediately, not 5 seconds later.
                retry: 1, 
            },
        },
    });
}

// 2. Singleton to hold the client in the browser
let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
    if (typeof window === 'undefined') {
        // Server: always make a new query client so data doesn't leak between users
        return makeQueryClient();
    } else {
        // Browser: make a new query client if we don't already have one
        if (!browserQueryClient) browserQueryClient = makeQueryClient();
        return browserQueryClient;
    }
}

export default function QueryProvider({ children }: { children: ReactNode }) {
    // 3. Initialize safely
    const queryClient = getQueryClient();

    return (
        <QueryClientProvider client={queryClient}>
            {children}
            {/* 4. Devtools: Only loads in development, incredibly helpful for debugging caches */}
            <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
        </QueryClientProvider>
    );
}