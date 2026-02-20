'use client';

import { useCallback } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

const getAuthHeaders = () => {
    if (typeof window === 'undefined') {
        return {};
    }

    const token = localStorage.getItem('access_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export const useChat = () => {
    const sendMessage = useCallback(async (message: string, businessId?: string) => {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders(),
            },
            body: JSON.stringify({ message, businessId }),
        });

        if (!response.ok) {
            const payload = await response.json().catch(() => null);
            const errorMessage = payload?.error || payload?.detail || 'Failed to send message';
            throw new Error(errorMessage);
        }

        const data = await response.json();
        return data.response || '';
    }, []);

    const getHistory = useCallback(async () => {
        const response = await fetch(`${API_BASE_URL}/chat/history/`, {
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders(),
            },
        });

        if (!response.ok) {
            const payload = await response.json().catch(() => null);
            const errorMessage = payload?.detail || payload?.error || 'Failed to fetch history';
            throw new Error(errorMessage);
        }

        return response.json();
    }, []);

    return {
        sendMessage,
        getHistory,
    };
};
