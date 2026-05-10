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

function matchesContractId(ruleContractId: string | null, txContractId: string | undefined): boolean {
  if (!ruleContractId) return true;
  if (!txContractId) return false;
  
  if (ruleContractId.toLowerCase() === txContractId.toLowerCase()) return true;
  
  const ruleName = ruleContractId.split('.')[1]?.toLowerCase();
  const txName = txContractId.split('.')[1]?.toLowerCase();
  if (ruleName && txName && ruleName === txName) return true;
  
  return false;
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
  }
  
  if (tx_type === 'token_transfer') {
    stx_amount = toSTX(tx.token_transfer.amount);
  } else if (tx_type === 'contract_call') {
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
    if (!matchesContractId(rule.contract_id, contract_id)) continue;
    if (rule.function_name && rule.function_name !== function_name) continue;
    if (rule.min_stx !== null && stx_amount < rule.min_stx) continue;
    if (rule.max_stx !== null && stx_amount > rule.max_stx) continue;
    
    matchedRule = rule;
    break;
  }

  if (matchedRule) {
    console.log(`[Matcher] ✓ ${tx.tx_id.slice(0, 8)} → ${matchedRule.id} (${matchedRule.signal})`);
  } else {
    if (tx_type === 'contract_call') {
      console.log(`[Matcher] ✗ No rule for: ${contract_id} :: ${function_name} (${stx_amount} STX)`);
    }
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
    multiplier,
    is_anomaly: isAnomaly
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
