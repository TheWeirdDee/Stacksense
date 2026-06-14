/**
 * Backend Utilities - Error Handling
 * Common error handling for Express endpoints
 */
export class ApiError extends Error {
    code;
    message;
    statusCode;
    details;
    constructor(code, message, statusCode, details) {
        super(message);
        this.code = code;
        this.message = message;
        this.statusCode = statusCode;
        this.details = details;
        this.name = 'ApiError';
    }
}
export function sendError(res, error, defaultStatus = 500) {
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
export function sendSuccess(res, data, statusCode = 200) {
    return res.status(statusCode).json({
        success: true,
        data,
        timestamp: new Date().toISOString(),
    });
}
export function validateApiKey(key) {
    return /^[a-f0-9]{64}$/i.test(key);
}
export function validateAddress(address) {
    return /^(SP|SM)[A-Z0-9]{30,}$/.test(address);
}
export function validateTxId(txId) {
    return /^0x[a-f0-9]{64}$/.test(txId.toLowerCase());
}
export function logError(message, error) {
    if (process.env.NODE_ENV === 'development') {
        console.error(`[Error] ${message}`, error);
    }
}
export function logInfo(message, data) {
    if (process.env.NODE_ENV === 'development') {
        console.log(`[Info] ${message}`, data);
    }
}
