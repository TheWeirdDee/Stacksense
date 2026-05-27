/**
 * README: API Architecture Guide
 * Overview of the StackSense API architecture and patterns
 */

# API Architecture

## Overview

The StackSense API is built with Express.js and follows a modular, service-oriented architecture.

## Directory Structure

```
apps/api/src/
├── constants.ts          # Global configuration constants
├── index.ts              # Server entry point
├── engine/               # Business logic engines
├── ingestion/            # Data pipeline ingestion
├── integrations/         # External service integrations
├── middleware/           # Express middleware
├── routes/               # API endpoint definitions
├── services/             # Business logic services
├── utils/                # Utility functions
├── types/                # TypeScript type definitions
├── redis/                # Redis client configuration
└── ws/                   # WebSocket server
```

## Key Patterns

### 1. Middleware Stack

- **Authentication**: `middleware/auth.ts` validates API keys
- **Rate Limiting**: `middleware/rateLimit.ts` prevents abuse
- **Error Handling**: Consistent error response format

### 2. Service Layer

Services in `services/` handle business logic:
- Encapsulate complex operations
- Abstract Redis operations
- Provide consistent error handling
- Support caching and invalidation

### 3. Utils Organization

- `utils/cache.ts`: Redis cache helpers
- `utils/errors.ts`: Error handling and validation
- `utils/logger.ts`: Structured logging

### 4. API Response Format

All endpoints return consistent JSON:

```json
{
  "success": true,
  "data": {},
  "timestamp": "2024-01-01T00:00:00Z"
}
```

Errors use:

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human readable message",
  "details": {}
}
```

## Cache Strategy

- **API Keys**: 30-day TTL
- **Subscriptions**: 30-day TTL
- **Processed Transactions**: 48-hour TTL
- **Usage Stats**: 24-hour TTL

## Extending the API

1. Create new route file in `routes/`
2. Implement handlers with proper error handling
3. Add middleware as needed
4. Export and mount in `index.ts`
5. Document endpoints in OpenAPI schema
