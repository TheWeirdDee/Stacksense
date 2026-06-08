
import { apiClient } from '@/lib/apiClient';
import { getApiKey, setApiKey, clearApiKey } from '@/lib/storage';
import { generateApiKeyHex, maskApiKey } from '@/lib/crypto';
import { logger } from '@/lib/logger';

export interface ApiKeyInfo {
  key: string;
  maskedKey: string;
  tier: string;
  createdAt: string;
  expiresAt: string;
}

class ApiKeyService {
  async generateKey(address: string): Promise<string> {
    try {
      const key = generateApiKeyHex();
      setApiKey(address, key);
      logger.info('API key generated', { address, maskedKey: maskApiKey(key) });
      return key;
    } catch (error) {
      logger.error('Failed to generate API key', error, { address });
      throw error;
    }
  }

  async fetchKeyInfo(address: string): Promise<ApiKeyInfo | null> {
    try {
      const response = await apiClient.get(`/api/v1/subscriptions/api-key/${address}`);
      return response as ApiKeyInfo;
    } catch (error) {
      logger.error('Failed to fetch API key info', error, { address });
      return null;
    }
  }

  async regenerateKey(address: string): Promise<string> {
    try {
      clearApiKey(address);
      const newKey = generateApiKeyHex();
      setApiKey(address, newKey);

      await apiClient.post('/api/v1/subscriptions/api-key/regenerate', {
        subscriberAddress: address,
        newKey,
      });

      logger.info('API key regenerated', { address });
      return newKey;
    } catch (error) {
      logger.error('Failed to regenerate API key', error, { address });
      throw error;
    }
  }

  async revokeKey(address: string): Promise<boolean> {
    try {
      clearApiKey(address);
      logger.info('API key revoked', { address });
      return true;
    } catch (error) {
      logger.error('Failed to revoke API key', error, { address });
      return false;
    }
  }

  getStoredKey(address: string): string | null {
    return getApiKey(address);
  }

  getMaskedKey(address: string): string | null {
    const key = getApiKey(address);
    return key ? maskApiKey(key) : null;
  }
}

export const apiKeyService = new ApiKeyService();
