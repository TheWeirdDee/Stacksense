

export interface WalletAddress {
  mainnet: string;
  testnet: string;
}

export interface UserData {
  username?: string;
  avatar?: string;
  profile?: {
    stxAddress: WalletAddress;
  };
}

export interface WalletSession {
  isSessionValid: boolean;
  userData: UserData | null;
}

export interface TransactionRequest {
  recipient: string;
  amount: string;
  memo?: string;
  network: string;
}

export interface TransactionResponse {
  txId: string;
  status: 'pending' | 'confirmed' | 'failed';
  amount: string;
  timestamp: number;
}

export interface ContractCall {
  contractAddress: string;
  contractName: string;
  functionName: string;
  functionArgs: unknown[];
  postConditions?: unknown[];
}
