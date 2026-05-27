/**
 * API Client Module
 * Centralized API communication with error handling and request/response interceptors
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { getApiUrl } from '@/lib/config';
import { ApiError, ApiResponse } from '@/types/api';

class ApiClient {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor() {
    this.baseUrl = getApiUrl();
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    this.client.interceptors.request.use((config) => {
      const apiKey = this.getApiKeyFromStorage();
      if (apiKey && config.headers) {
        config.headers['x-api-key'] = apiKey;
      }
      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        const apiError: ApiError = {
          code: error.code || 'UNKNOWN_ERROR',
          message: error.message,
          statusCode: error.response?.status || 0,
          details: error.response?.data,
        };
        return Promise.reject(apiError);
      }
    );
  }

  private getApiKeyFromStorage(): string | null {
    if (typeof window === 'undefined') return null;
    const address = this.extractAddressFromStorage();
    return address ? localStorage.getItem(`stacksense-api-key:${address}`) : null;
  }

  private extractAddressFromStorage(): string | null {
    if (typeof window === 'undefined') return null;
    const keys = Object.keys(localStorage);
    const addressKey = keys.find((k) => k.startsWith('stacksense-api-key:'));
    return addressKey ? addressKey.split(':')[1] : null;
  }

  async get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
    const response = await this.client.get<T>(url, { params });
    return response.data;
  }

  async post<T>(url: string, data?: unknown): Promise<T> {
    const response = await this.client.post<T>(url, data);
    return response.data;
  }

  async put<T>(url: string, data?: unknown): Promise<T> {
    const response = await this.client.put<T>(url, data);
    return response.data;
  }

  async delete<T>(url: string): Promise<T> {
    const response = await this.client.delete<T>(url);
    return response.data;
  }
}

export const apiClient = new ApiClient();
