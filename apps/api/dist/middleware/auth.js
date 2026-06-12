/**
 * Middleware - Authentication
 * API key authentication middleware
 */
import { cacheGet } from '../utils/cache.js';
import { validateApiKey } from '../utils/errors.js';
export async function authenticate(req, res, next) {
    try {
        const apiKey = req.headers['x-api-key'];
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
        const apiKeyData = await cacheGet(`api-key:${apiKey}`);
        if (!apiKeyData) {
            res.status(401).json({
                success: false,
                error: 'API_KEY_NOT_FOUND',
                message: 'API key not found or expired',
            });
            return;
        }
        req.apiKeyData = apiKeyData;
        next();
    }
    catch (error) {
        console.error('Authentication error:', error);
        res.status(500).json({
            success: false,
            error: 'AUTH_ERROR',
            message: 'Authentication failed',
        });
    }
}
export function optionalAuth(req, res, next) {
    const apiKey = req.headers['x-api-key'];
    if (apiKey && validateApiKey(apiKey)) {
        // Attach if valid, otherwise continue without auth
        cacheGet(`api-key:${apiKey}`).then((data) => {
            if (data) {
                req.apiKeyData = data;
            }
            next();
        });
    }
    else {
        next();
    }
}
