import { redisClient } from '../redis/client.js';
export async function checkAnomaly(contract_id, function_name, amount) {
    const key = contract_id && function_name
        ? `baseline:${contract_id}:${function_name}`
        : `baseline:native:transfer`;
    const values = await redisClient.lRange(key, 0, -1);
    const numericValues = values.map((v) => parseFloat(v));
    let isAnomaly = false;
    let multiplier = 1.0;
    if (numericValues.length >= 10) {
        const mean = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
        const variance = numericValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / numericValues.length;
        const stddev = Math.sqrt(variance);
        if (amount > mean + (2 * stddev)) {
            isAnomaly = true;
        }
        if (mean > 0) {
            multiplier = amount / mean;
        }
    }
    await redisClient.lPush(key, amount.toString());
    await redisClient.lTrim(key, 0, 999);
    await redisClient.expire(key, 2592000);
    return { isAnomaly, multiplier };
}
