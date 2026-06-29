import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import { redisClient } from '../redis/client.js';

dotenv.config({ path: '../../.env' });

const token = process.env.TELEGRAM_BOT_TOKEN;
const globalChatId = process.env.TELEGRAM_CHAT_ID;

let bot: TelegramBot | null = null;

if (token) {
  bot = new TelegramBot(token, { polling: false });
  console.log('[Telegram] Bot initialized');
} else {
  console.warn('[Telegram] Skipping initialization: TELEGRAM_BOT_TOKEN missing');
}

export async function sendHighConvictionAlert(event: any) {
  if (!bot || !globalChatId) return;

  if (!event || !event.title) {
    console.warn('[Telegram] Missing event payload');
    return;
  }

  const message = buildAlertMessage(event);
  try {
    await bot.sendMessage(globalChatId, message, { parse_mode: 'Markdown' });
  } catch (error: any) {
    console.error('[Telegram] Failed to send alert:', error?.message || error);
  }
}

function buildAlertMessage(event: any, label?: string): string {
  const signalIcon = event.signal === 'anomaly' ? '⚠️' : event.signal === 'bullish' ? '🟢' : event.signal === 'risk' ? '🟠' : '⬜';
  return `${signalIcon} *${event.title}*${label ? `\n📍 _${label}_` : ''}

${event.description}

💰 *Amount:* ${event.stx_amount?.toLocaleString()} STX
👤 *Wallet:* \`${event.wallet_address}\`
🏷️ *Archetype:* ${event.wallet_archetype}

🔗 [View on Explorer](${event.explorer_url})`;
}
// Send a Telegram DM to a specific chat ID (used for per-wallet subscriptions).
 
export async function sendDirectAlert(chatId: string, event: any, label?: string) {
  if (!bot) return;
  const message = buildAlertMessage(event, label);
  try {
    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error: any) {
    console.error(`[Telegram] DM failed to ${chatId}:`, error?.message || error);
  }
}

// Called after each event is emitted — notify subscribers watching the wallet.
export async function notifyWalletSubscribers(event: any) {
  if (!bot) return;
  try {
    const subIds = await redisClient.sMembers(`tg:wallet:${event.wallet_address}:subs`);
    for (const subId of subIds) {
      const raw = await redisClient.get(`tg:sub:${subId}`);
      if (!raw) continue;
      const sub = JSON.parse(raw);
      if (!sub.active) continue;
      const label = `Watching ${event.wallet_address.slice(0, 6)}...${event.wallet_address.slice(-4)}`;
      sendDirectAlert(sub.chatId, event, label).catch(() => {});
    }
  } catch (err) {
    console.error('[Telegram] notifyWalletSubscribers error:', err);
  }
}
