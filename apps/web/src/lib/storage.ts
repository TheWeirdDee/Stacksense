/**
 * Storage Utilities
 * Helpers for localStorage and session management
 */

const STORAGE_PREFIX = 'stacksense';

export function getStorageKey(key: string): string {
  return `${STORAGE_PREFIX}:${key}`;
}

export function setStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    const fullKey = getStorageKey(key);
    localStorage.setItem(fullKey, JSON.stringify(value));
  } catch (error) {
    console.error(`Failed to set storage key ${key}:`, error);
  }
}

export function getStorage<T>(key: string, defaultValue?: T): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const fullKey = getStorageKey(key);
    const item = localStorage.getItem(fullKey);
    return item ? JSON.parse(item) : defaultValue ?? null;
  } catch (error) {
    console.error(`Failed to get storage key ${key}:`, error);
    return defaultValue ?? null;
  }
}

export function removeStorage(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    const fullKey = getStorageKey(key);
    localStorage.removeItem(fullKey);
  } catch (error) {
    console.error(`Failed to remove storage key ${key}:`, error);
  }
}

export function clearStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(STORAGE_PREFIX));
    keys.forEach((key) => localStorage.removeItem(key));
  } catch (error) {
    console.error('Failed to clear storage:', error);
  }
}

export function getApiKey(address?: string): string | null {
  if (address) {
    return getStorage(`api-key:${address}`);
  }
  
  if (typeof window === 'undefined') return null;
  const keys = Object.keys(localStorage);
  const apiKeyEntry = keys.find((k) => k.includes('api-key:'));
  if (!apiKeyEntry) return null;
  
  try {
    return JSON.parse(localStorage.getItem(apiKeyEntry) || 'null');
  } catch {
    return null;
  }
}

export function setApiKey(address: string, key: string): void {
  setStorage(`api-key:${address}`, key);
}

export function clearApiKey(address: string): void {
  removeStorage(`api-key:${address}`);
}
