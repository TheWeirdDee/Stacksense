// Trigger deployment on Railway with all files present
const isServer = typeof window === 'undefined';

const getIsLocalhost = () => {
  if (isServer) return false;
  return (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.startsWith('192.168.')
  );
};

export const getApiUrl = (): string => {
  const defaultVal = 'https://stacksense-production-7a6f.up.railway.app';
  if (isServer) {
    return process.env.NEXT_PUBLIC_API_BASE || defaultVal;
  }
  const isLocal = getIsLocalhost();
  const envVal = process.env.NEXT_PUBLIC_API_BASE;
  if (envVal && !envVal.startsWith('http')) {
    console.warn('[Config] Ignoring invalid NEXT_PUBLIC_API_BASE value');
    return defaultVal;
  }
  
  if (isLocal) {
    return envVal || 'http://localhost:3002';
  } else {
    // If running in production (non-localhost) but envVal is a localhost URL, override it
    if (envVal && !envVal.includes('localhost') && !envVal.includes('127.0.0.1')) {
      return envVal;
    }
    return defaultVal;
  }
};

export const getWsUrl = (): string => {
  const defaultVal = 'wss://stacksense-production-7a6f.up.railway.app/ws';
  if (isServer) {
    return process.env.NEXT_PUBLIC_WS_URL || defaultVal;
  }
  const isLocal = getIsLocalhost();
  const envVal = process.env.NEXT_PUBLIC_WS_URL;
  
  if (isLocal) {
    return envVal || 'ws://localhost:3002/ws';
  } else {
    // Override localhost URL in production
    if (envVal && !envVal.includes('localhost') && !envVal.includes('127.0.0.1')) {
      return envVal;
    }
    return defaultVal;
  }
};
