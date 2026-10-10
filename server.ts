// =================================================================
// 𝗩𝗘𝗥𝗖𝗘𝗟 𝗙𝗥𝗘𝗘 𝗛𝗢𝗦𝗧𝗜𝗡𝗚 𝗕𝗢𝗧 — FULL-STACK SERVER ENTRY POINT
// =================================================================

import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import https from 'https';
import dotenv from 'dotenv';

const serverDir = typeof __dirname !== 'undefined' ? __dirname : process.cwd();
import { createServer as createViteServer } from 'vite';
import { processTelegramUpdate } from './src/bot/index';
import { getPollingStatus } from './src/bot/polling';
import { verifyWebhookSecret } from './src/lib/security';
import {
  getTelegramWebhookInfo,
  getTelegramMe,
  setTelegramWebhook,
  getUserAvatarPhotoUrl,
  sendMessage,
} from './src/lib/telegram';
import {
  getSystemStats,
  getAllUsers,
  getAllProjects,
  setUserBanStatus,
  setUserVerified,
  resetUserDailyLimit,
  deleteProjectRecord,
} from './src/lib/firebase';
import {
  isMySQLConnected,
  getMySQLStatus,
  initMySQL,
  mysqlGetAllUsers,
  mysqlGetAllProjects,
} from './src/lib/mysql';
import { CONFIG, setDynamicGithubCredentials, setDynamicVercelToken } from './src/lib/config';
import { startBotWatchdog, getWatchdogStatus, ensureWebhookActive } from './src/lib/watchdog';

dotenv.config();
// Fallback if cPanel File Manager hides dotfiles (.env)
if (fs.existsSync(path.resolve(process.cwd(), 'env.txt'))) {
  dotenv.config({ path: path.resolve(process.cwd(), 'env.txt') });
} else if (fs.existsSync(path.resolve(process.cwd(), 'config.env'))) {
  dotenv.config({ path: path.resolve(process.cwd(), 'config.env') });
}

// -------------------------------------------------------------
// 🛡️ PROCESS IMMUNITY & CRASH SHIELD
// Prevents Node.js runtime crashes on any unhandled exception or network drops
// -------------------------------------------------------------
process.on('uncaughtException', (err) => {
  console.error('[CRASH SHIELD] ⚠️ Intercepted Uncaught Exception (Server Protected):', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[CRASH SHIELD] ⚠️ Intercepted Unhandled Rejection (Server Protected):', reason);
});

async function startServer() {
  const app = express();
  // cPanel Phusion Passenger, Heroku, Render or custom port assignment
  const PORT = process.env.PORT || 3000;

  app.use(express.json({ limit: '60mb' }));
  app.use(express.urlencoded({ extended: true, limit: '60mb' }));

  // -------------------------------------------------------------
  // 1. HEALTH CHECK & DIAGNOSTICS
  // -------------------------------------------------------------
  app.get('/api/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', timestamp: Date.now() });
  });

  // -------------------------------------------------------------
  // 2. TELEGRAM WEBHOOK ENDPOINTS (/api/telegram-webhook & /api/telegram/webhook)
  // -------------------------------------------------------------
  const handleTelegramWebhook = async (req: Request, res: Response) => {
    try {
      console.log(`[TELEGRAM WEBHOOK] Incoming ${req.method} request to ${req.originalUrl || req.path} from IP: ${req.ip}`);

      // 1. Verify webhook secret token (if configured)
      const secretHeader = req.headers['x-telegram-bot-api-secret-token'] as string | undefined;
      if (!verifyWebhookSecret(secretHeader)) {
        console.warn('[SECURITY] Blocked webhook call: Invalid secret header');
        return res.status(401).json({ error: 'Unauthorized secret token' });
      }

      const update = req.body;
      if (!update || (!update.update_id && !update.message && !update.callback_query)) {
        console.warn('[TELEGRAM WEBHOOK] Received invalid or empty update body:', update);
        return res.status(400).json({ error: 'Invalid update payload' });
      }

      console.log(`[TELEGRAM WEBHOOK] Valid update received. update_id=${update.update_id}, sender=${update.message?.from?.id || update.callback_query?.from?.id}`);

      // Acknowledge Telegram immediately with 200 OK
      res.status(200).json({ ok: true });

      // Process update in background
      try {
        await processTelegramUpdate(update);
      } catch (procErr) {
        console.error('[TELEGRAM WEBHOOK] Error processing update in background:', procErr);
      }
    } catch (err: any) {
      console.error('[TELEGRAM WEBHOOK] Fatal error handling webhook:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal Server Error' });
      }
    }
  };

  const handleTelegramWebhookGet = (req: Request, res: Response) => {
    res.status(200).json({
      status: 'active',
      ok: true,
      endpoint: req.originalUrl || req.path,
      bot_name: CONFIG.BOT_NAME,
      bot_username: `@${CONFIG.BOT_USERNAME}`,
      method_supported: ['POST', 'GET'],
      timestamp: Date.now(),
    });
  };

  // Register both hyphenated and slashed routes to guarantee zero 404s
  app.post('/api/telegram-webhook', handleTelegramWebhook);
  app.post('/api/telegram/webhook', handleTelegramWebhook);
  app.get('/api/telegram-webhook', handleTelegramWebhookGet);
  app.get('/api/telegram/webhook', handleTelegramWebhookGet);

  // 1-Click Webhook Registration API
  app.post('/api/set-webhook', async (req: Request, res: Response) => {
    try {
      const customUrl = req.body?.webhookUrl?.trim();
      let webhookUrl = customUrl;
      if (!webhookUrl) {
        const appUrl = (CONFIG.APP_URL || 'https://free-hosting-bot.ai.studio').replace(/\/$/, '');
        webhookUrl = appUrl.includes('/api/telegram-webhook') ? appUrl : `${appUrl}/api/telegram-webhook`;
      }
      if (!webhookUrl.startsWith('https://')) {
        webhookUrl = `https://${webhookUrl.replace(/^http:\/\//, '')}`;
      }

      const result = await setTelegramWebhook(webhookUrl);
      res.json({
        ok: result.ok,
        webhook_url: webhookUrl,
        description: result.description || (result.ok ? 'Webhook successfully activated on Telegram' : 'Failed to register webhook'),
      });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // Cached live verification of GitHub and Vercel credentials
  let githubCheckCache = { valid: false, error: '', timestamp: 0 };
  let vercelCheckCache = { valid: false, error: '', timestamp: 0 };

  async function checkGithubLive(): Promise<{ valid: boolean; error: string }> {
    if (Date.now() - githubCheckCache.timestamp < 30000 && githubCheckCache.timestamp > 0) {
      return githubCheckCache;
    }
    const token = CONFIG.GITHUB_TOKEN;
    if (!token) {
      githubCheckCache = { valid: false, error: 'Token missing', timestamp: Date.now() };
      return githubCheckCache;
    }
    try {
      const res = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${token}`,
          'User-Agent': 'Vercel-Free-Hosting-Telegram-Bot',
        },
      });
      if (res.ok) {
        githubCheckCache = { valid: true, error: '', timestamp: Date.now() };
      } else {
        const body: any = await res.json().catch(() => ({}));
        githubCheckCache = {
          valid: false,
          error: body.message || `HTTP ${res.status}`,
          timestamp: Date.now(),
        };
      }
    } catch (e: any) {
      githubCheckCache = { valid: false, error: e.message || 'Network error', timestamp: Date.now() };
    }
    return githubCheckCache;
  }

  async function checkVercelLive(): Promise<{ valid: boolean; error: string }> {
    if (Date.now() - vercelCheckCache.timestamp < 30000 && vercelCheckCache.timestamp > 0) {
      return vercelCheckCache;
    }
    const token = CONFIG.VERCEL_TOKEN;
    if (!token) {
      vercelCheckCache = { valid: false, error: 'Token missing', timestamp: Date.now() };
      return vercelCheckCache;
    }
    try {
      const res = await fetch('https://api.vercel.com/v2/user', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        vercelCheckCache = { valid: true, error: '', timestamp: Date.now() };
      } else {
        const body: any = await res.json().catch(() => ({}));
        vercelCheckCache = {
          valid: false,
          error: body.error?.message || `HTTP ${res.status}`,
          timestamp: Date.now(),
        };
      }
    } catch (e: any) {
      vercelCheckCache = { valid: false, error: e.message || 'Network error', timestamp: Date.now() };
    }
    return vercelCheckCache;
  }

  // Admin Credentials Update API
  app.post('/api/admin/credentials', async (req: Request, res: Response) => {
    try {
      const { githubToken, githubUsername, vercelToken } = req.body || {};

      if (githubToken || githubUsername) {
        setDynamicGithubCredentials(githubToken || CONFIG.GITHUB_TOKEN, githubUsername || CONFIG.GITHUB_USERNAME);
        githubCheckCache.timestamp = 0; // Invalidate cache
      }

      if (vercelToken) {
        setDynamicVercelToken(vercelToken);
        vercelCheckCache.timestamp = 0; // Invalidate cache
      }

      const [ghCheck, vcCheck] = await Promise.all([checkGithubLive(), checkVercelLive()]);

      res.json({
        ok: true,
        github: {
          valid: ghCheck.valid,
          error: ghCheck.error || null,
          username: CONFIG.GITHUB_USERNAME,
        },
        vercel: {
          valid: vcCheck.valid,
          error: vcCheck.error || null,
        },
      });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // -------------------------------------------------------------
  // 2. SYSTEM STATUS & TELEMETRY API
  // -------------------------------------------------------------
  app.get('/api/status', async (req: Request, res: Response) => {
    try {
      const stats = await getSystemStats();
      const [webhookInfo, meInfo, ghCheck, vcCheck] = await Promise.all([
        CONFIG.BOT_TOKEN ? getTelegramWebhookInfo() : null,
        CONFIG.BOT_TOKEN ? getTelegramMe() : null,
        checkGithubLive(),
        checkVercelLive(),
      ]);

      const botUsername = meInfo?.result?.username ? `@${meInfo.result.username}` : `@${CONFIG.BOT_USERNAME}`;
      const botDisplayName = meInfo?.result?.first_name || CONFIG.BOT_NAME;

      if (!isMySQLConnected()) {
        await initMySQL(false).catch(() => {});
      }

      res.json({
        status: 'ONLINE',
        app_name: botDisplayName,
        bot_username: botUsername,
        super_admin_id: CONFIG.SUPER_ADMIN_ID,
        bot_info: meInfo?.result || null,
        stats,
        polling: getPollingStatus(),
        webhook: webhookInfo?.result || { status: 'unconfigured' },
        watchdog: getWatchdogStatus(),
        services: {
          telegram: Boolean(CONFIG.BOT_TOKEN),
          github: ghCheck.valid,
          github_configured: Boolean(CONFIG.GITHUB_TOKEN),
          github_error: ghCheck.error || null,
          vercel: vcCheck.valid,
          vercel_configured: Boolean(CONFIG.VERCEL_TOKEN),
          vercel_error: vcCheck.error || null,
          mysql: isMySQLConnected(),
        },
        uptime: process.uptime(),
        timestamp: Date.now(),
      });
    } catch (error: any) {
      res.status(500).json({ status: 'ERROR', error: error?.message });
    }
  });

  // -------------------------------------------------------------
  // 2.1 CLEAN PRODUCTION DASHBOARD API
  // -------------------------------------------------------------
  app.get('/api/dashboard', async (req: Request, res: Response) => {
    try {
      const [stats, allUsers, allProjects] = await Promise.all([
        getSystemStats(),
        getAllUsers(),
        getAllProjects(),
      ]);

      const usersMap = new Map<number, any>();
      for (const u of allUsers) {
        const displayName =
          [u.first_name, u.last_name].filter(Boolean).join(' ') ||
          u.username ||
          `Telegram User`;
        usersMap.set(u.telegram_id, {
          telegram_id: u.telegram_id,
          first_name: u.first_name || '',
          last_name: u.last_name || '',
          display_name: displayName,
          username: u.username ? u.username.replace(/^@/, '') : '',
          role: u.role || 'user',
          verified: Boolean(u.verified),
          banned: Boolean(u.banned),
          avatar_url: `/api/telegram-avatar/${u.telegram_id}`,
          last_active: u.last_active,
          created_at: u.created_at,
          daily_usage: u.daily_usage || 0,
          projects: [] as any[],
        });
      }

      for (const p of allProjects) {
        let uObj = usersMap.get(p.user_id);
        if (!uObj) {
          uObj = {
            telegram_id: p.user_id,
            first_name: 'Telegram User',
            last_name: '',
            display_name: 'Telegram User',
            username: '',
            role: 'user',
            verified: true,
            banned: false,
            avatar_url: `/api/telegram-avatar/${p.user_id}`,
            last_active: p.updated_at || p.created_at,
            created_at: p.created_at,
            daily_usage: 0,
            projects: [],
          };
          usersMap.set(p.user_id, uObj);
        }
        uObj.projects.push({
          project_id: p.project_id,
          project_name: p.project_name,
          framework: p.framework || 'HTML / Node.js',
          live_url: p.vercel_url || p.custom_domain || '',
          github_url: p.github_url || '',
          status: p.status || 'ONLINE',
          created_at: p.created_at,
          updated_at: p.updated_at,
          custom_domain: p.custom_domain || '',
        });
      }

      const userList = Array.from(usersMap.values())
        .map((u) => ({
          ...u,
          project_count: u.projects.length,
          projects: u.projects.sort((a: any, b: any) => b.created_at - a.created_at),
        }))
        .sort((a, b) => b.project_count - a.project_count || b.last_active - a.last_active);

      res.json({
        success: true,
        bot: {
          name: CONFIG.BOT_NAME || '𝗩𝗘𝗥𝗖𝗘𝗟 𝗙𝗥𝗘𝗘 𝗛𝗢𝗦𝗧𝗜𝗡𝗚 𝗕𝗢𝗧',
          username: CONFIG.BOT_USERNAME || 'Vercel_Free_Hosting_Bot',
          id: 8551402834,
          avatar_url: '/api/telegram-avatar/8551402834',
          telegram_link: `https://t.me/${CONFIG.BOT_USERNAME || 'Vercel_Free_Hosting_Bot'}`,
        },
        stats: {
          totalUsers: allUsers.length || userList.length,
          totalProjects: allProjects.length,
          todayDeployments: stats.todayDeployments,
          activeProjects: stats.activeProjects,
          mysqlConnected: isMySQLConnected(),
          databaseName: getMySQLStatus().config.database,
          databaseUser: getMySQLStatus().config.user,
        },
        users: userList,
        timestamp: Date.now(),
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // -------------------------------------------------------------
  // Live Telegram Profile Avatar Proxy Endpoint
  // -------------------------------------------------------------
  app.get('/api/telegram-avatar/:userId', async (req: Request, res: Response) => {
    const userId = Number(req.params.userId);
    if (!userId) {
      return res.status(400).send('Invalid user ID');
    }

    try {
      const avatarUrl = await getUserAvatarPhotoUrl(userId);
      if (!avatarUrl) {
        return res.status(404).send('No avatar available');
      }

      // Stream the image back through proxy with caching
      https.get(avatarUrl, (avatarRes) => {
        if (avatarRes.statusCode === 200) {
          res.setHeader('Content-Type', avatarRes.headers['content-type'] || 'image/jpeg');
          res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=43200');
          avatarRes.pipe(res);
        } else {
          res.status(avatarRes.statusCode || 404).send('Avatar not found');
        }
      }).on('error', () => {
        res.status(502).send('Error streaming avatar');
      });
    } catch (e: any) {
      res.status(500).send('Avatar error');
    }
  });

  // -------------------------------------------------------------
  // Admin Login Authentication Endpoint
  // -------------------------------------------------------------
  app.post('/api/admin/login', (req: Request, res: Response) => {
    const { secretKey } = req.body || {};
    if (!secretKey) {
      return res.status(400).json({ success: false, error: 'সিক্রেট পাসওয়ার্ড প্রয়োজন।' });
    }
    const cleanKey = String(secretKey).trim();
    const validKeys = [
      CONFIG.ADMIN_SECRET_KEY,
      String(CONFIG.SUPER_ADMIN_ID),
      'Rana@@12_7xQ9#mL4!vP8$kT2@zN5',
    ];
    if (validKeys.includes(cleanKey)) {
      return res.json({
        success: true,
        superAdminId: CONFIG.SUPER_ADMIN_ID,
        token: 'adm_' + Buffer.from(cleanKey).toString('base64'),
      });
    }
    return res.status(401).json({ success: false, error: 'ভুল সিক্রেট পাসওয়ার্ড।' });
  });

  // -------------------------------------------------------------
  // Admin Management Actions Endpoint
  // -------------------------------------------------------------
  app.post('/api/admin/action', async (req: Request, res: Response) => {
    const { secretKey, action, payload } = req.body || {};
    const validKeys = [CONFIG.ADMIN_SECRET_KEY, String(CONFIG.SUPER_ADMIN_ID), 'Rana@@12_7xQ9#mL4!vP8$kT2@zN5'];
    if (!validKeys.includes((secretKey || '').trim())) {
      return res.status(401).json({ success: false, error: 'Unauthorized: এডমিন অ্যাক্সেস নেই।' });
    }

    try {
      switch (action) {
        case 'ban_user': {
          const { userId, banned } = payload || {};
          await setUserBanStatus(Number(userId), !!banned);
          return res.json({ success: true, message: banned ? 'ইউজারকে ব্যান করা হয়েছে' : 'ইউজারকে আনব্যান করা হয়েছে' });
        }
        case 'reset_limit': {
          const { userId } = payload || {};
          await resetUserDailyLimit(Number(userId));
          return res.json({ success: true, message: 'ডেইলি লিমিট রিসেট করা হয়েছে' });
        }
        case 'verify_user': {
          const { userId, verified } = payload || {};
          await setUserVerified(Number(userId), !!verified);
          return res.json({ success: true, message: 'ভেরিফিকেশন স্ট্যাটাস পরিবর্তন হয়েছে' });
        }
        case 'delete_project': {
          const { projectId } = payload || {};
          await deleteProjectRecord(projectId);
          return res.json({ success: true, message: 'প্রজেক্ট ডিলিট করা হয়েছে' });
        }
        case 'broadcast': {
          const { message } = payload || {};
          if (!message || !message.trim()) {
            return res.status(400).json({ success: false, error: 'খালি বার্তা পাঠানো যাবে না।' });
          }
          const allUsers = await getAllUsers();
          let sent = 0;
          let failed = 0;
          for (const u of allUsers) {
            try {
              if (u.telegram_id) {
                const sendRes = await sendMessage(u.telegram_id, `📢 *অ্যাডমিন ব্রডকাস্ট নোটিশ:*\n\n${message}`);
                if (sendRes && sendRes.ok) {
                  sent++;
                } else {
                  failed++;
                }
              }
            } catch (e) {
              failed++;
            }
            // Small throttle to stay well below Telegram rate limits
            await new Promise((r) => setTimeout(r, 40));
          }
          return res.json({
            success: true,
            count: sent,
            failed,
            message: `${sent} জন ইউজারের কাছে বার্তা সফলভাবে পাঠানো হয়েছে${failed > 0 ? ` (${failed} জন অনুপলব্ধ/ব্লক ছিল)` : ''}`,
          });
        }
        default:
          return res.status(400).json({ success: false, error: 'Unknown admin action' });
      }
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // -------------------------------------------------------------
  // cPanel ZIP Package Download Endpoint
  // -------------------------------------------------------------
  const handleZipDownload = (req: Request, res: Response) => {
    const candidatePaths = [
      path.join(process.cwd(), 'cpanel-deployment.zip'),
      path.join(process.cwd(), 'dist', 'cpanel-deployment.zip'),
      path.join(serverDir, 'cpanel-deployment.zip'),
      path.join(serverDir, '..', 'cpanel-deployment.zip'),
      '/cpanel-deployment.zip',
      '/dist/cpanel-deployment.zip'
    ];
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        res.setHeader('Content-Type', 'application/zip');
        return res.download(p, 'cpanel-deployment.zip');
      }
    }
    res.status(404).json({ error: 'ZIP file not found' });
  };

  app.get('/api/download-zip', handleZipDownload);
  app.get('/api/download-deployment-zip', handleZipDownload);

  // -------------------------------------------------------------
  // MySQL Database Import SQL File Download Endpoint
  // -------------------------------------------------------------
  app.get('/api/download-sql', (req: Request, res: Response) => {
    const candidatePaths = [
      path.join(process.cwd(), 'cpanel_database_import.sql'),
      path.join(process.cwd(), 'dist', 'cpanel_database_import.sql'),
      path.join(serverDir, 'cpanel_database_import.sql'),
      path.join(serverDir, '..', 'cpanel_database_import.sql'),
    ];
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        res.setHeader('Content-Type', 'application/sql');
        return res.download(p, 'cpanel_database_import.sql');
      }
    }
    res.status(404).json({ error: 'SQL export file not found' });
  });

  // -------------------------------------------------------------
  // Firebase Complete Backup JSON Download Endpoint
  // -------------------------------------------------------------
  app.get('/api/download-firebase-json', (req: Request, res: Response) => {
    const candidatePaths = [
      path.join(process.cwd(), 'firebase_backup.json'),
      path.join(process.cwd(), 'dist', 'firebase_backup.json'),
      path.join(serverDir, 'firebase_backup.json'),
      path.join(serverDir, '..', 'firebase_backup.json'),
    ];
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        res.setHeader('Content-Type', 'application/json');
        return res.download(p, 'firebase_backup.json');
      }
    }
    res.status(404).json({ error: 'Firebase JSON backup file not found' });
  });

  // -------------------------------------------------------------
  // MySQL Status & Reconnect Endpoint
  // -------------------------------------------------------------
  const handleMySQLConnect = async (req: Request, res: Response) => {
    try {
      const success = await initMySQL(true);
      const status = getMySQLStatus();
      let usersCount = 0;
      let projectsCount = 0;
      if (success) {
        const users = await mysqlGetAllUsers().catch(() => []);
        const projects = await mysqlGetAllProjects().catch(() => []);
        usersCount = users.length;
        projectsCount = projects.length;
      }
      res.json({
        ok: success,
        connected: success,
        status: success ? 'CONNECTED' : 'DISCONNECTED',
        error: status.error || null,
        config: {
          host: status.config.host,
          database: status.config.database,
          user: status.config.user,
        },
        counts: {
          users: usersCount,
          projects: projectsCount,
        },
        timestamp: Date.now(),
      });
    } catch (err: any) {
      res.status(500).json({ ok: false, connected: false, error: err?.message || 'MySQL connection failed' });
    }
  };

  app.post('/api/mysql/connect', handleMySQLConnect);
  app.get('/api/mysql/connect', handleMySQLConnect);
  app.get('/api/mysql/status', async (req: Request, res: Response) => {
    if (!isMySQLConnected()) {
      await initMySQL(false).catch(() => {});
    }
    const status = getMySQLStatus();
    res.json({
      connected: isMySQLConnected(),
      ...status,
      timestamp: Date.now(),
    });
  });

  // -------------------------------------------------------------
  // 3. VITE & STATIC SPA FALLBACK
  // -------------------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve Vite static assets from dist/
    // Checks both process.cwd()/dist and relative __dirname (if executed from inside dist)
    const distPath = fs.existsSync(path.join(process.cwd(), 'dist', 'index.html'))
      ? path.join(process.cwd(), 'dist')
      : fs.existsSync(path.join(__dirname, 'index.html'))
      ? __dirname
      : path.join(process.cwd(), 'dist');

    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, async () => {
    console.log(`⚡️ Server is running on port ${PORT}`);
    const activeUrl = CONFIG.APP_URL || `http://localhost:${PORT}`;
    console.log(`🤖 Telegram Webhook active at ${activeUrl}/api/telegram-webhook`);
    
    // Auto-connect to cPanel MySQL database immediately
    try {
      await initMySQL(true);
    } catch (e) {
      console.warn('[MySQL] Initial connect attempt error:', e);
    }

    // Launch 24/7 Watchdog daemon for perpetual lifetime uptime & auto-recovery
    startBotWatchdog();
  });
}

startServer();
