import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

let bot: TelegramBot | null = null;

if (token && chatId) {
  bot = new TelegramBot(token, { polling: false });
  console.log('[Telegram] Bot initialized');
} else {
  console.warn('[Telegram] Skipping initialization: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID missing');
}

export async function sendHighConvictionAlert(event: any) {
  if (!bot || !chatId) return;

  if (!event || !event.title) {
    console.warn('[Telegram] Missing event payload');
    return;
  }

  const message = `
🚨 *HIGH CONVICTION SIGNAL* 🚨

*${event.title}*
${event.description}

💰 *Amount:* ${event.stx_amount.toLocaleString()} STX ($${event.usd_amount.toLocaleString()})
👤 *Wallet:* \`${event.wallet_address}\`
🏷️ *Archetype:* ${event.wallet_archetype}
🔥 *Intensity:* ${event.signal === 'anomaly' ? '⚠️ ANOMALY DETECTED' : '✅ WHALE ACTIVITY'}

🔗 [View on Explorer](${event.explorer_url})
  `;

  try {
    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error: any) {
    console.error('[Telegram] Failed to send alert:', error?.message || error);
  }
}
