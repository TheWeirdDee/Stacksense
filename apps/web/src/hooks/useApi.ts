/**
 * Custom Hook - useApi
 * Generic hook for API calls with loading and error states
 */

'use client';

import { useState, useCallback } from 'react';
import { apiClient } from '@/lib/apiClient';
import { getUserFriendlyMessage } from '@/lib/errors';

export interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useApi<T>() {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(
    async (url: string, options?: { method?: 'get' | 'post' | 'put' | 'delete'; data?: unknown }) => {
      setState({ data: null, loading: true, error: null });

      try {
        const method = options?.method ?? 'get';
        let result: T;

        if (method === 'get') {
          result = await apiClient.get<T>(url);
        } else if (method === 'post') {
          result = await apiClient.post<T>(url, options?.data);
        } else if (method === 'put') {
          result = await apiClient.put<T>(url, options?.data);
        } else if (method === 'delete') {
          result = await apiClient.delete<T>(url);
        } else {
          throw new Error('Invalid method');
        }

        setState({ data: result, loading: false, error: null });
        return result;
      } catch (error) {
        const message = getUserFriendlyMessage(error);
        setState({ data: null, loading: false, error: message });
        throw error;
      }
    },
    []
  );

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return { ...state, execute, reset };
}
