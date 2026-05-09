import { z } from 'zod';

export const InterpretedEventSchema = z.object({
  id: z.string().uuid(),
  tx_id: z.string(),
  timestamp: z.string().datetime(),
  signal: z.enum(['bullish', 'neutral', 'risk', 'anomaly']),
  protocol: z.string(),
  title: z.string(),
  description: z.string(),
  context: z.string().nullable(),
  stx_amount: z.number(),
  usd_amount: z.number(),
  wallet_address: z.string(),
  wallet_archetype: z.string(),
  explorer_url: z.string().url(),
  rule_id: z.string(),
  multiplier: z.number().optional(),
  is_anomaly: z.boolean().optional(),
});

export const RuleSchema = z.object({
  id: z.string(),
  protocol: z.string(),
  tx_type: z.enum(['contract_call', 'token_transfer']),
  contract_id: z.string().nullable(),
  function_name: z.string().nullable(),
  min_stx: z.number().nullable(),
  max_stx: z.number().nullable(),
  signal: z.enum(['bullish', 'neutral', 'risk', 'anomaly']),
  title_template: z.string(),
  description_template: z.string(),
  context_template: z.string().nullable(),
});
