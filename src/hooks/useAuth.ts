'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import type { AuthUser } from '@/lib/types';

async function fetchCurrentUser(): Promise<AuthUser | null> {
    const res = await fetch('/api/auth/me');
    if (!res.ok) return null;
    const data = await res.json();
    return data.user;
}

export function useAuth() {
    const queryClient = useQueryClient();
    const router = useRouter();

    const { data: user, isLoading, error } = useQuery({
        queryKey: ['auth', 'me'],
        queryFn: fetchCurrentUser,
        retry: false,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    const loginMutation = useMutation({
        mutationFn: async (credentials: { email: string; password: string }) => {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error?.message || 'فشل تسجيل الدخول');
            }

            return res.json();
        },
        onSuccess: (data) => {
            queryClient.setQueryData(['auth', 'me'], data.user);
            if (data.user.role === 'owner') {
                router.push('/dashboard');
            } else {
                router.push('/pos');
            }
        },
    });

    const logoutMutation = useMutation({
        mutationFn: async () => {
            await fetch('/api/auth/logout', { method: 'POST' });
        },
        onSuccess: () => {
            queryClient.setQueryData(['auth', 'me'], null);
            queryClient.clear();
            router.push('/login');
        },
    });

    return {
        user: user ?? null,
        isLoading,
        error,
        login: loginMutation.mutateAsync,
        loginError: loginMutation.error,
        isLoggingIn: loginMutation.isPending,
        logout: logoutMutation.mutateAsync,
        isLoggingOut: logoutMutation.isPending,
    };
}
