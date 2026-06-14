/**
 * Middleware - Authentication
 * API key authentication middleware
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { cacheGet } from '../utils/cache.js';
import { validateApiKey, validateAddress } from '../utils/errors.js';

// Keys are stored hashed (sha256) at generation time, so look them up by hash.
function hashKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

export interface AuthRequest extends Request {
  apiKeyData?: {
    address: string;
    tier: string;
    createdAt: string;
  };
}

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      res.status(401).json({
        success: false,
        error: 'MISSING_API_KEY',
        message: 'API key is required',
      });
      return;
    }

    if (!validateApiKey(apiKey)) {
      res.status(400).json({
        success: false,
        error: 'INVALID_API_KEY_FORMAT',
        message: 'Invalid API key format',
      });
      return;
    }

    const apiKeyData = await cacheGet(`api-key:${hashKey(apiKey)}`);

    if (!apiKeyData) {
      res.status(401).json({
        success: false,
        error: 'API_KEY_NOT_FOUND',
        message: 'API key not found or expired',
      });
      return;
    }

    req.apiKeyData = apiKeyData as AuthRequest['apiKeyData'];
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'AUTH_ERROR',
      message: 'Authentication failed',
    });
  }
}

export function optionalAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const apiKey = req.headers['x-api-key'] as string;

  if (apiKey && validateApiKey(apiKey)) {
    // Attach if valid, otherwise continue without auth
    cacheGet<AuthRequest['apiKeyData']>(`api-key:${hashKey(apiKey)}`).then((data) => {
      if (data) {
        req.apiKeyData = data as AuthRequest['apiKeyData'];
      }
      next();
    });
  } else {
    next();
  }
}
