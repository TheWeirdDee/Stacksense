'use client';

import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { GlobalStats } from '@/types';

import { getApiUrl } from '@/lib/config';

const API_BASE = getApiUrl();

export function useStats() {
  return useQuery<GlobalStats>({
    queryKey: ['global-stats'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE}/api/v1/stats`);
      return response.data;
    },
    refetchInterval: 60000,
  });
}
