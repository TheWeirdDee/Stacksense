'use client';

import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { GlobalStats } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:3001';

export function useStats() {
  return useQuery<GlobalStats>({
    queryKey: ['global-stats'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE}/api/v1/stats`);
      return response.data;
    },
    refetchInterval: 60000, // Refresh every 60s
  });
}
