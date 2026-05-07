import { redisClient } from '../redis/client.js';

export async function checkAnomaly(contract_id: string | null, function_name: string | null, amount: number) {
  const key = contract_id && function_name 
    ? `baseline:${contract_id}:${function_name}`
    : `baseline:native:transfer`;
    
  const values = await redisClient.lRange(key, 0, -1);
  const numericValues = values.map((v: string) => parseFloat(v));
  
  let isAnomaly = false;
  let multiplier = 1.0;
  
  if (numericValues.length >= 10) { // Need some data for meaningful stats
    const mean = numericValues.reduce((a: number, b: number) => a + b, 0) / numericValues.length;
    const variance = numericValues.reduce((a: number, b: number) => a + Math.pow(b - mean, 2), 0) / numericValues.length;
    const stddev = Math.sqrt(variance);
    
    if (amount > mean + (2 * stddev)) {
      isAnomaly = true;
    }
    
    if (mean > 0) {
      multiplier = amount / mean;
    }
  }
  
  // Record current value
  await redisClient.lPush(key, amount.toString());
  await redisClient.lTrim(key, 0, 999);
  await redisClient.expire(key, 2592000); // 30 days
  
  return { isAnomaly, multiplier };
}
