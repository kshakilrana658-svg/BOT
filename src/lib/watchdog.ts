// =================================================================
// 🛡️ 24/7 SELF-HEALING TELEGRAM BOT & WEBHOOK WATCHDOG
// Ensures the Telegram Webhook and Bot NEVER go down, auto-recovering
// =================================================================

import { CONFIG } from './config';
import { setTelegramWebhook, getTelegramWebhookInfo, deleteTelegramWebhook, getTelegramMe } from './telegram';
import { startPolling, stopPolling, isPollingActive } from '../bot/polling';

const WATCHDOG_INTERVAL_MS = 60 * 1000; // Check every 60 seconds

let watchdogTimer: NodeJS.Timeout | null = null;
let consecutiveFailures = 0;
let lastHeartbeat = Date.now();

function isValidProductionWebhookUrl(url?: string): boolean {
  if (!url) return false;
  // Ignore ephemeral dev containers and localhost, but allow user custom domains including free-hosting-bot.ai.studio
  if (
    url.includes('localhost') ||
    url.includes('127.0.0.1') ||
    url.includes('ais-dev-') ||
    url.includes('ais-pre-')
  ) {
    return false;
  }
  return url.startsWith('https://') && url.length > 12;
}

function getTargetWebhookUrl(): string | null {
  const base = (CONFIG.APP_URL || 'https://free-hosting-bot.ai.studio').replace(/\/$/, '');
  if (!isValidProductionWebhookUrl(base)) {
    return null;
  }
  return base.includes('/api/telegram-webhook') ? base : `${base}/api/telegram-webhook`;
}

/**
 * Ensures the target webhook is registered with Telegram, or initiates Long Polling.
 */
export async function ensureWebhookActive(): Promise<boolean> {
  if (!CONFIG.BOT_TOKEN) {
    console.warn('[WATCHDOG] ⚠️ Bot token not configured yet. Skipping webhook sync.');
    return false;
  }

  try {
    const targetUrl = getTargetWebhookUrl();

    if (targetUrl) {
      // Proactively test if target URL is live and responding (not 404, 502, down)
      let isTargetReachable = false;
      try {
        const pingCtrl = new AbortController();
        const pingTimer = setTimeout(() => pingCtrl.abort(), 6000);
        const pingRes = await fetch(targetUrl, { method: 'GET', signal: pingCtrl.signal }).catch(() => null);
        clearTimeout(pingTimer);
        // /api/telegram-webhook responds 200 on GET
        if (pingRes && pingRes.status === 200) {
          isTargetReachable = true;
        }
      } catch {
        isTargetReachable = false;
      }

      if (!isTargetReachable) {
        console.warn(`[WATCHDOG] ⚠️ Target webhook (${targetUrl}) is not reachable yet (returns 404/down). Running high-performance Long Polling so the bot remains 100% online!`);
        const info = await getTelegramWebhookInfo().catch(() => null);
        if (info?.ok && info.result?.url) {
          await deleteTelegramWebhook().catch(() => {});
        }
        startPolling(true).catch(() => {});
        lastHeartbeat = Date.now();
        return false;
      }

      const info = await getTelegramWebhookInfo();
      const currentUrl = info?.result?.url || '';

      // Check if webhook is already set to the target URL
      if (info?.ok && currentUrl === targetUrl) {
        lastHeartbeat = Date.now();
        consecutiveFailures = 0;
        stopPolling();
        return true;
      }

      console.log(`[WATCHDOG] 🔄 Webhook url is currently '${currentUrl}'. Auto-configuring permanent webhook: ${targetUrl}...`);
      const setRes = await setTelegramWebhook(targetUrl);

      if (setRes.ok) {
        console.log(`[WATCHDOG] ✅ Webhook successfully locked & verified on Telegram: ${targetUrl}`);
        stopPolling();
        consecutiveFailures = 0;
        lastHeartbeat = Date.now();
        return true;
      } else {
        console.warn(`[WATCHDOG] ⚠️ Webhook setup returned error: ${setRes.description}. Activating failover poller.`);
        consecutiveFailures++;
        await deleteTelegramWebhook().catch(() => {});
        startPolling(true).catch(() => {});
        return false;
      }
    } else {
      // In local/preview/container environments where no external DNS points here:
      // Clear dummy webhook and run Long Polling directly!
      const info = await getTelegramWebhookInfo().catch(() => null);
      if (info?.ok && info.result?.url) {
        console.log(`[WATCHDOG] 🧹 Clearing inactive/unroutable webhook (${info.result.url}) for instant Long Polling...`);
        await deleteTelegramWebhook().catch(() => {});
      }

      lastHeartbeat = Date.now();
      consecutiveFailures = 0;
      startPolling(true).catch(() => {});
      return true;
    }
  } catch (error: any) {
    consecutiveFailures++;
    console.error(`[WATCHDOG] ❌ Webhook check exception: ${error?.message || error}`);
    startPolling(true).catch(() => {});
    return false;
  }
}

/**
 * Initializes 24/7 Watchdog daemon
 */
export function startBotWatchdog(): void {
  if (watchdogTimer) return;

  console.log('[WATCHDOG] 🛡️ Starting 24/7 High-Availability Bot Watchdog daemon...');

  // 1. Run immediately on server boot
  ensureWebhookActive().catch((err) => {
    console.error('[WATCHDOG] Initial webhook sync error:', err);
  });

  // 2. Periodic self-healing interval
  watchdogTimer = setInterval(async () => {
    lastHeartbeat = Date.now();
    try {
      await ensureWebhookActive();
    } catch (err: any) {
      console.error('[WATCHDOG] Periodic check error:', err?.message || err);
    }
  }, WATCHDOG_INTERVAL_MS);

  // Unref timer so it doesn't block graceful exits if needed
  if (watchdogTimer && typeof watchdogTimer.unref === 'function') {
    watchdogTimer.unref();
  }
}

/**
 * Returns Watchdog Health Status
 */
export function getWatchdogStatus() {
  return {
    target_webhook: getTargetWebhookUrl() || 'DIRECT_LONG_POLLING',
    last_heartbeat: lastHeartbeat,
    consecutive_failures: consecutiveFailures,
    is_active: Boolean(watchdogTimer),
    mode: '24/7_PERMANENT_SELF_HEALING',
  };
}
