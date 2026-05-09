import { sendHighConvictionAlert } from '../integrations/telegram.js';

const mockEvent = {
  id: 'test-id',
  title: '🚀 TEST ALERT: BOT IS LIVE',
  description: 'This is a test notification from your StackSense production backend.',
  stx_amount: 100000,
  usd_amount: 250000,
  wallet_address: 'SP3DBM7M6CEM4BW7XQX5VGH7KRC64FD11X3N1D2DV',
  wallet_archetype: 'Whale Wallet',
  signal: 'anomaly',
  explorer_url: 'https://explorer.stacks.co',
  is_anomaly: true,
  multiplier: 10.0
};

console.log('Sending test alert...');
sendHighConvictionAlert(mockEvent).then(() => {
  console.log('✅ Test alert sent! Check your Telegram.');
}).catch((err) => {
  console.error('❌ Failed to send test alert:', err);
});
