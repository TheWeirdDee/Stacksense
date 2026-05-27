/**
 * Validation Utilities
 * Common validation functions for form inputs and API responses
 */

export function isValidAddress(address: string): boolean {
  return /^(SP|SM)[A-Z0-9]{30,}$/.test(address);
}

export function isValidTxId(txId: string): boolean {
  return /^0x[a-f0-9]{64}$/.test(txId.toLowerCase());
}

export function isValidApiKey(key: string): boolean {
  return /^[a-f0-9]{64}$/i.test(key);
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function isPositiveNumber(num: number): boolean {
  return Number.isFinite(num) && num > 0;
}

export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

export function validateRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export function validateForm(
  data: Record<string, unknown>,
  schema: Record<string, (value: unknown) => boolean>
): ValidationResult {
  const errors: Record<string, string> = {};
  let valid = true;

  Object.entries(schema).forEach(([field, validator]) => {
    if (!validator(data[field])) {
      errors[field] = `Invalid ${field}`;
      valid = false;
    }
  });

  return { valid, errors };
}
