// =================================================================
// 𝗩𝗘𝗥𝗖𝗘𝗟 𝗙𝗥𝗘𝗘 𝗛𝗢𝗦𝗧𝗜𝗡𝗚 𝗕𝗢𝗧 — START & VERIFICATION HANDLERS
// =================================================================

import { CONFIG } from '../../lib/config';
import { getOrCreateUser, setUserVerified, logSystemAction, getUser, isAdmin } from '../../lib/firebase';
import { sendMessage, checkChatMember, answerCallbackQuery } from '../../lib/telegram';
import {
  getVerificationKeyboard,
  getMainMenuKeyboard,
  getUserWelcomeInlineKeyboard,
  getChannelUrl,
  getGroupUrl,
  getOwnerUrl,
} from '../keyboards';
import { TelegramMessage, TelegramCallbackQuery } from '../../types';

/**
 * Real-Time Active Force Join Verification Check
 * Checks live Telegram membership for both Channel and Group.
 * If user left the group/channel after verifying, this immediately detects it and revokes verification.
 */
export async function isUserCurrentlyJoined(userId: number): Promise<boolean> {
  // Super admin always bypasses membership check
  if (userId === CONFIG.SUPER_ADMIN_ID) {
    return true;
  }

  const channelTarget = CONFIG.CHANNEL_USERNAME
    ? `@${CONFIG.CHANNEL_USERNAME}`
    : CONFIG.CHANNEL_ID;
  const groupTarget = CONFIG.GROUP_USERNAME
    ? `@${CONFIG.GROUP_USERNAME}`
    : CONFIG.GROUP_ID;

  // If neither channel nor group is configured, pass check
  if (!channelTarget && !groupTarget) {
    return true;
  }

  try {
    const channelCheck = channelTarget
      ? await checkChatMember(channelTarget, userId)
      : { isMember: true };
    const groupCheck = groupTarget
      ? await checkChatMember(groupTarget, userId)
      : { isMember: true };

    const isMember = Boolean(channelCheck.isMember && groupCheck.isMember);

    // Synchronize durable verification status with real-time membership
    await setUserVerified(userId, isMember);

    return isMember;
  } catch (error) {
    console.error(`Force join check error for user ${userId}:`, error);
    return false;
  }
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Handles /start command
 */
export async function handleStartCommand(message: TelegramMessage) {
  const from = message.from;
  if (!from) return;

  // 1. Register or update user record in Firebase / MySQL
  const user = await getOrCreateUser(from.id, {
    username: from.username,
    first_name: from.first_name,
    last_name: from.last_name,
  });

  // 2. Check if user is banned
  if (user.banned) {
    await sendMessage(
      message.chat.id,
      `🚫 <b>ACCOUNT SUSPENDED</b>\n\nYour account has been suspended by the administrator. You cannot use this bot.`,
      { parse_mode: 'HTML' }
    );
    return;
  }

  // 3. Strict Real-Time Force Join Membership Verification
  const isJoined = await isUserCurrentlyJoined(from.id);

  if (!isJoined) {
    const safeBotName = escapeHtml(CONFIG.BOT_NAME || 'VERCEL FREE HOSTING BOT');
    const verificationText = `🔐 <b>Verification Required / ফোর্স জয়েন আবশ্যক</b>

To use <b>${safeBotName}</b>, you MUST join our official Channel and Group.

⚠️ <b>Rules:</b> You must remain in the channel and group to keep using the bot. If you leave at any time, access will be revoked automatically.

👉 Please join both using the buttons below, then click <b>✅ Verify Membership</b>:`;

    await sendMessage(message.chat.id, verificationText, {
      parse_mode: 'HTML',
      reply_markup: getVerificationKeyboard(),
    });
    return;
  }

  // User is verified & currently a member
  await sendWelcomeSuccess(message.chat.id, from.first_name || 'User', from.id);
}

/**
 * Handles the inline "✅ Verify Membership" button click
 */
export async function handleVerifyCallback(callbackQuery: TelegramCallbackQuery) {
  const from = callbackQuery.from;
  const chatId = callbackQuery.message?.chat.id || from.id;

  // Real-time live membership check
  const isJoined = await isUserCurrentlyJoined(from.id);

  if (isJoined) {
    await setUserVerified(from.id, true);
    await logSystemAction(from.id, 'USER_VERIFIED', 'SUCCESS');

    await answerCallbackQuery(callbackQuery.id, {
      text: '✅ Verification Successful! Welcome.',
      show_alert: false,
    });

    await sendWelcomeSuccess(chatId, from.first_name || 'User', from.id);
  } else {
    await answerCallbackQuery(callbackQuery.id, {
      text: '❌ Verification Failed! You must join both Channel & Group first.',
      show_alert: true,
    });

    const failedText = `❌ <b>Verification Failed / ভেরিফিকেশন ব্যর্থ</b>

You haven't joined our required Channel and Group yet.

1️⃣ Join the Official Channel
2️⃣ Join the Support Group
3️⃣ Click <b>✅ Verify Membership</b> again below.`;

    await sendMessage(chatId, failedText, {
      parse_mode: 'HTML',
      reply_markup: getVerificationKeyboard(),
    });
  }
}

/**
 * Sends the main welcome message and displays Main Menu Reply Keyboard & Inline Links
 */
export async function sendWelcomeSuccess(
  chatId: number | string,
  firstName: string,
  userId?: number
) {
  const userIsAdmin = userId ? await isAdmin(userId) : false;
  const channelLink = getChannelUrl();
  const groupLink = getGroupUrl();
  const ownerLink = getOwnerUrl();

  const safeName = escapeHtml(firstName || 'User');
  const safeBotName = escapeHtml(CONFIG.BOT_NAME || 'VERCEL FREE HOSTING BOT');

  const welcomeText = `👋 <b>Welcome, ${safeName}!</b>

Welcome to <b>${safeBotName}</b> 🚀
The fastest way to deploy and host your web projects on <b>Vercel</b> directly from Telegram!

✨ <b>Features & Limits:</b>
• ⚡️ <b>${CONFIG.DEFAULT_DAILY_LIMIT} Free Deployments Daily</b>
• 📦 <b>HTML, CSS, JS, React, Vite, Next.js & ZIP uploads</b>
• 🌐 <b>Instant HTTPS Live URL & Custom Domains</b>
• 🔄 <b>Instant Redeploy, File Editor & Env Manager</b>

📢 <a href="${channelLink}">Official Channel</a> | 👥 <a href="${groupLink}">Support Group</a> | 👨‍💻 <a href="${ownerLink}">Developer</a>

━━━━━━━━━━━━━━━━━━━━━━━━━━
👇 <b>Select an option from the menu below to get started:</b>`;

  // Send single message with full links and the persistent main menu reply keyboard
  await sendMessage(chatId, welcomeText, {
    parse_mode: 'HTML',
    reply_markup: getMainMenuKeyboard(userIsAdmin),
  });
}

