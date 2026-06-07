/**
 * Contract Configuration Types
 * Stacks blockchain smart contract constants and types
 */

export interface ContractConfig {
  address: string;
  name: string;
  network: 'mainnet' | 'testnet' | 'devnet';
}

export const SUBSCRIPTION_CONTRACT: ContractConfig = {
  address: process.env.NEXT_PUBLIC_SUBSCRIPTION_CONTRACT_ADDRESS || '',
  name: process.env.NEXT_PUBLIC_SUBSCRIPTION_CONTRACT_NAME || 'subcription-tips',
  network: (process.env.NEXT_PUBLIC_NETWORK as 'mainnet' | 'testnet' | 'devnet') || 'mainnet',
};

export const SIGNAL_TIPS_CONTRACT: ContractConfig = {
  address: process.env.NEXT_PUBLIC_SIGNAL_TIPS_CONTRACT || '',
  name: 'signal-tips',
  network: (process.env.NEXT_PUBLIC_NETWORK as 'mainnet' | 'testnet' | 'devnet') || 'mainnet',
};

export interface ContractFunction {
  name: string;
  args: unknown[];
  postConditions?: unknown[];
}

export const CONTRACT_FUNCTIONS = {
  subscribeFreeTier: 'subscribe-free-tier',
  subscribeProTier: 'subscribe-pro-tier',
  subscribeEnterpriseTier: 'subscribe-enterprise-tier',
  upgradeSubscription: 'upgrade-subscription',
  getSubscription: 'get-subscription',
  getApiKey: 'get-api-key',
} as const;

export interface TransactionOptions {
  fee?: number;
  nonce?: number;
  anchorMode?: 'onChainOnly' | 'offChainOnly' | 'any';
}

export const DEFAULT_TRANSACTION_OPTIONS: TransactionOptions = {
  anchorMode: 'any',
};
