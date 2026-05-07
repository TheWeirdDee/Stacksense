import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { toSTX, formatSTX, formatUSD } from './utils.js';
import { getArchetype } from './archetype.js';
import { checkAnomaly } from './anomaly.js';
import { redisClient } from '../redis/client.js';
import { InterpretedEventSchema } from './schemas.js';

interface Rule {
  id: string;
  protocol: string;
  tx_type: 'contract_call' | 'token_transfer';
  contract_id: string | null;
  function_name: string | null;
  min_stx: number | null;
  max_stx: number | null;
  signal: 'bullish' | 'neutral' | 'risk' | 'anomaly';
  title_template: string;
  description_template: string;
  context_template: string | null;
}

let rules: Rule[] = [];

async function loadRules() {
  if (rules.length === 0) {
    const rulesPath = path.resolve(process.cwd(), 'rules/rules.json');
    const data = await fs.readFile(rulesPath, 'utf8');
    rules = JSON.parse(data);
  }
}

export async function matchTransaction(tx: any) {
  await loadRules();
  
  const tx_type = tx.tx_type;
  let stx_amount = 0;
  let contract_id = null;
  let function_name = null;
  
  if (tx_type === 'contract_call') {
    contract_id = tx.contract_call.contract_id;
    function_name = tx.contract_call.function_name;
    // Extract STX amount if any. Hiro API puts this in various places depending on the call.
    // For simplicity in v1, we check if there's a post-condition or transfer involved.
    // But the prompt says "STX value must be >= min_stx".
    // I'll assume we look at the tx's fee or a specific transfer inside it? 
    // Actually, usually we look at the amount being moved. 
    // For native transfers it's easy. For contract calls, it's more complex.
    // I'll check for `tx.token_transfer.amount` if available or just use 0 for now unless I find where Hiro puts it.
    // Wait, the prompt says "All STX amounts from the Hiro API are in microSTX."
    // I'll check `tx.token_transfer.amount` for `token_transfer` type.
  }
  
  if (tx_type === 'token_transfer') {
    stx_amount = toSTX(tx.token_transfer.amount);
  } else if (tx_type === 'contract_call') {
    // Extract STX amount from post-conditions where the sender is providing STX
    if (tx.post_conditions && Array.isArray(tx.post_conditions)) {
      const senderPostConditions = tx.post_conditions.filter(
        (pc: any) => pc.condition_code === 'sent_equal_to' || pc.condition_code === 'sent_greater_than_or_equal_to'
      );
      
      let totalMicroSTX = 0;
      for (const pc of senderPostConditions) {
        if (pc.asset_type === 'stx' && pc.amount) {
          totalMicroSTX += parseInt(pc.amount, 10);
        }
      }
      
      if (totalMicroSTX > 0) {
        stx_amount = toSTX(totalMicroSTX);
      }
    }
    
    // Fallback: Check if there are internal STX transfers (stx_transfers array in some API versions)
    if (stx_amount === 0 && tx.stx_transfers && Array.isArray(tx.stx_transfers)) {
      const totalInternal = tx.stx_transfers
        .filter((t: any) => t.sender === tx.sender_address)
        .reduce((sum: number, t: any) => sum + parseInt(t.amount, 10), 0);
      if (totalInternal > 0) {
        stx_amount = toSTX(totalInternal);
      }
    }
  }

  let matchedRule = null;
  for (const rule of rules) {
    if (rule.tx_type !== tx_type) continue;
    if (rule.contract_id && rule.contract_id !== contract_id) continue;
    if (rule.function_name && rule.function_name !== function_name) continue;
    if (rule.min_stx !== null && stx_amount < rule.min_stx) continue;
    if (rule.max_stx !== null && stx_amount > rule.max_stx) continue;
    
    matchedRule = rule;
    break;
  }
  
  if (!matchedRule) {
    if (stx_amount >= 1000) {
      matchedRule = {
        id: 'generic-large-tx',
        protocol: 'Native STX',
        tx_type: 'token_transfer',
        contract_id: null,
        function_name: null,
        min_stx: 1000,
        max_stx: null,
        signal: 'neutral',
        title_template: 'Large Transaction Detected',
        description_template: 'A transaction of {stx_amount} STX was processed on-chain.',
        context_template: null
      } as Rule;
    } else {
      return null;
    }
  }
  
  const wallet_address = tx.sender_address;
  const archetype = await getArchetype(wallet_address);
  const stxPrice = await getSTXPrice();
  const usd_amount = stx_amount * stxPrice;
  
  // Anomaly Detection
  const { isAnomaly, multiplier } = await checkAnomaly(contract_id, function_name, stx_amount);
  const finalSignal = isAnomaly ? 'anomaly' : matchedRule.signal;
  
  const templateVars = {
    archetype,
    stx_amount: formatSTX(stx_amount),
    usd_amount: formatUSD(usd_amount),
    protocol: matchedRule.protocol,
    multiplier: `${multiplier.toFixed(1)}x`
  };
  
  const event = {
    id: uuidv4(),
    tx_id: tx.tx_id,
    timestamp: tx.burn_block_time_iso || new Date().toISOString(),
    signal: finalSignal,
    protocol: matchedRule.protocol,
    title: fillTemplate(matchedRule.title_template, templateVars),
    description: fillTemplate(matchedRule.description_template, templateVars),
    context: matchedRule.context_template ? fillTemplate(matchedRule.context_template, templateVars) : null,
    stx_amount: Math.round(stx_amount),
    usd_amount,
    wallet_address,
    wallet_archetype: archetype,
    explorer_url: `https://explorer.stacks.co/txid/${tx.tx_id}?chain=mainnet`,
    rule_id: matchedRule.id,
  };
  
  return InterpretedEventSchema.parse(event);
}

function fillTemplate(template: string, vars: Record<string, string>) {
  return template.replace(/{(\w+)}/g, (_, key) => vars[key] || `{${key}}`);
}

async function getSTXPrice(): Promise<number> {
  const cached = await redisClient.get('stx:price:usd');
  return cached ? parseFloat(cached) : 0;
}
