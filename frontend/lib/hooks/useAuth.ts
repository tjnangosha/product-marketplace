'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

interface Business {
    id: number;
    name: string;
}

interface User {
    id: number;
    username: string;
    email: string;
    role: string | null;
    business?: Business | null;
    is_business_admin?: boolean;
}

const permissionMap: Record<string, string[]> = {
    create: ['admin', 'editor'],
    edit: ['admin', 'editor'],
    approve: ['admin', 'approver'],
    delete: ['admin'],
    manage_users: ['admin'],
};

const getAccessToken = () => {
    if (typeof window === 'undefined') {
        return null;
    }
    return localStorage.getItem('access_token');
};

const clearTokens = () => {
    if (typeof window === 'undefined') {
        return;
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
};

const setTokens = (access: string, refresh?: string) => {
    if (typeof window === 'undefined') {
        return;
    }
    localStorage.setItem('access_token', access);
    if (refresh) {
        localStorage.setItem('refresh_token', refresh);
    }
};

const getAuthHeaders = () => {
    const token = getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export const useAuth = () => {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const loadUser = useCallback(async () => {
        const token = getAccessToken();
        if (!token) {
            setUser(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/auth/me/`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders(),
                },
            });

            if (!response.ok) {
                if (response.status === 401) {
                    clearTokens();
                }
                setUser(null);
                return;
            }

            const data = (await response.json()) as User;
            setUser(data);
        } catch (error) {
            console.error('Failed to load user', error);
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadUser();
    }, [loadUser]);

    const login = useCallback(
        async (username: string, password: string) => {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/auth/login/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            if (!response.ok) {
                const errorPayload = await response.json().catch(() => null);
                const message =
                    errorPayload?.detail ||
                    errorPayload?.message ||
                    'Unable to sign in. Please try again.';
                setLoading(false);
                throw new Error(message);
            }

            const data = await response.json();
            setTokens(data.access, data.refresh);
            await loadUser();
            router.push('/dashboard/products');
        },
        [loadUser, router]
    );

    const logout = useCallback(() => {
        clearTokens();
        setUser(null);
        router.push('/login');
    }, [router]);

    const hasPermission = useCallback(
        (permission: string) => {
            if (!user) {
                return false;
            }
            if (user.is_business_admin || user.role === 'admin') {
                return true;
            }
            const allowedRoles = permissionMap[permission] || [];
            return !!user.role && allowedRoles.includes(user.role);
        },
        [user]
    );

    return {
        user,
        loading,
        login,
        logout,
        hasPermission,
    };
};
