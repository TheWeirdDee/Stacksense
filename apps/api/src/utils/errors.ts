/**
 * Backend Utilities - Error Handling
 * Common error handling for Express endpoints
 */

import { Response } from 'express';
import { HTTP_STATUS, ERROR_MESSAGES } from '../constants';

export class ApiError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function sendError(res: Response, error: unknown, defaultStatus = 500): Response {
  if (error instanceof ApiError) {
    return res.status(error.statusCode).json({
      success: false,
      error: error.code,
      message: error.message,
      details: error.details,
    });
  }

  if (error instanceof Error) {
    return res.status(defaultStatus).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: error.message,
    });
  }

  return res.status(defaultStatus).json({
    success: false,
    error: 'UNKNOWN_ERROR',
    message: 'An unexpected error occurred',
  });
}

export function sendSuccess<T>(res: Response, data: T, statusCode = 200): Response {
  return res.status(statusCode).json({
    success: true,
    data,
    timestamp: new Date().toISOString(),
  });
}

export function validateApiKey(key: string): boolean {
  return /^[a-f0-9]{64}$/i.test(key);
}

export function validateAddress(address: string): boolean {
  return /^(SP|SM)[A-Z0-9]{30,}$/.test(address);
}

export function validateTxId(txId: string): boolean {
  return /^0x[a-f0-9]{64}$/.test(txId.toLowerCase());
}

export function logError(message: string, error?: unknown): void {
  if (process.env.NODE_ENV === 'development') {
    console.error(`[Error] ${message}`, error);
  }
}

export function logInfo(message: string, data?: unknown): void {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Info] ${message}`, data);
  }
}
