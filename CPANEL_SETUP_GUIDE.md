# 🚀 cPanel-এ Node.js হোস্টিং সম্পূর্ণ গাইড (Complete cPanel Deployment Guide)

এই অ্যাপটি (Telegram Bot + Admin Dashboard) cPanel-এর **"Setup Node.js App"** ফিচার ব্যবহার করে খুব সহজেই হোস্ট করা যাবে। নিচে ধাপে ধাপে নির্দেশনা দেওয়া হলো:

---

## 📋 প্রাক-প্রস্তুতি (Prerequisites)
1. আপনার cPanel-এ **"Setup Node.js App"** অথবা **"Node.js Selector"** অপশন থাকতে হবে (Namecheap, Hostinger, cPanel CloudLinux বা যেকোনো শেয়ার্ড/ভিপিএস হোস্টিংয়ে এটি থাকে)।
2. Node.js ভার্সন: **18.x** অথবা **20.x** (20.x রিকমেন্ডেড)।
3. ডোমেন বা সাবডোমেন (যেমন: `bot.yourdomain.com` অথবা `yourdomain.com`)।

---

## 🛠️ ধাপ ১: cPanel-এ Node.js App তৈরি করুন
1. আপনার **cPanel**-এ লগইন করুন।
2. **Software** সেকশনে গিয়ে **"Setup Node.js App"** অপশনে ক্লিক করুন।
3. ডানপাশে **"Create Application"** বাটনে ক্লিক করুন।
4. নিচের সেটিংসগুলো পূরণ করুন:
   - **Node.js version:** `20.x` (অথবা `18.x`)
   - **Application mode:** `Production`
   - **Application root:** ফোল্ডারের নাম (যেমন: `bot` বা `public_html`)
   - **Application URL:** আপনার ডোমেন/সাবডোমেন সিলেক্ট করুন
   - **Application startup file:** `app.js` (অথবা `dist/server.cjs`)
5. **Create** বাটনে ক্লিক করুন।

---

## 📦 ধাপ ২: প্রজেক্ট ফাইল আপলোড ও এক্সট্র্যাক্ট করুন
1. cPanel **File Manager**-এ যান।
2. ধাপ ১-এ আপনি যে **Application root** ফোল্ডার দিয়েছিলেন (যেমন: `bot` বা `public_html`), সেই ফোল্ডারে প্রবেশ করুন।
3. সম্পূর্ণ প্রজেক্টের ZIP ফাইলটি আপলোড করুন এবং সেখানে **Extract** করুন।
   *(লক্ষ্য রাখবেন যেন `package.json`, `app.js`, `server.ts`, এবং `dist/` ফোল্ডার সরাসরি এই রুটে থাকে)*

---

## ⚙️ ধাপ ৩: Environment Variables (.env) সেট করুন
File Manager-এ প্রজেক্টের রুট ফোল্ডারে `.env` নামের একটি ফাইল তৈরি করুন (যদি না থাকে) এবং নিচের মানগুলো বসান:

```env
NODE_ENV=production
PORT=3000

# 1. Telegram Bot Token
BOT_TOKEN="your_telegram_bot_token"
BOT_USERNAME="Vercel_Free_Hosting_Bot"
TELEGRAM_WEBHOOK_SECRET="your_webhook_secret_here"

# 2. Super Admin ID
SUPER_ADMIN_ID="6919025708"
ADMIN_SECRET_KEY="your_admin_secret_key"

# 3. GitHub & Vercel
GITHUB_TOKEN="your_github_personal_access_token"
GITHUB_USERNAME="vercelfreehostingbot"
VERCEL_TOKEN="your_vercel_token"

# 4. cPanel MySQL Database
DB_HOST="localhost"
DB_USER="lalmoni1_kshakilrana"
DB_NAME="lalmoni1_ai"
DB_PASSWORD="your_mysql_password_here"
DB_PORT="3306"

# 5. Your cPanel Live Domain URL
APP_URL="https://hostingbot.lalmonirhatakmp.site"
```

---

## 🗄️ ধাপ ৩.৫: cPanel MySQL ডাটাবেজ ইমপোর্ট (phpMyAdmin)
Firebase থেকে সম্পূর্ণ ডাটাবেজ ডাউনলোড করে **`cpanel_database_import.sql`** তৈরি করা হয়েছে:
1. আপনার cPanel-এ গিয়ে **phpMyAdmin** ওপেন করুন।
2. বামপাশের মেনু থেকে **`lalmoni1_ai`** ডাটাবেজটি ক্লিক করুন।
3. ওপরের মেনু থেকে **"Import"** ট্যাবে যান।
4. **"Choose File"** এ ক্লিক করে জিপে থাকা বা ড্যাশবোর্ড থেকে ডাউনলোড করা **`cpanel_database_import.sql`** ফাইলটি সিলেক্ট করুন।
5. নিচে গিয়ে **"Import"** / **"Go"** বাটনে ক্লিক করুন।
   - সাথে সাথে ৩৩ জন ইউজার এবং ১৩ টি প্রজেক্টের সমস্ত রেকর্ড ও ওয়েবসাইট লিংক cPanel MySQL-এ আপলোড হয়ে যাবে!

> **⚠️ গুরুত্বপূর্ণ:** `APP_URL`-এ আপনার ডোমেন বা সাবডোমেনের সম্পূর্ণ URL দিবেন (শেষে কোন স্ল্যাশ `/` ছাড়া)। এবং আপনার নতুন GitHub ও Vercel টোকেন অবশ্যই দিবেন।

---

## 💻 ধাপ ৪: প্যাকেজ ইনস্টল ও বিল্ড (Build)
1. cPanel-এর **"Setup Node.js App"** পেজে ফিরে যান এবং আপনার অ্যাপটি এডিট করুন।
2. পেজের ওপর একটি কমান্ড দেখতে পাবেন, যেমন:
   `source /home/username/nodevenv/bot/20/bin/activate && cd /home/username/bot`
3. ক্লিক করে **"Run NPM Install"** বাটনে চাপ দিন (অথবা cPanel Terminal খুলে কমান্ডটি পেস্ট করে `npm install` চালান)।
4. cPanel **Terminal** খুলে বিল্ড কমান্ডটি চালান:
   ```bash
   npm run build
   ```
   *(যদি টার্মিনাল না থাকে, তবে আপনার লোকাল পিসিতে `npm run build` চালিয়ে তৈরি হওয়া `dist` ফোল্ডারটি cPanel-এ আপলোড করে দিন)*

---

## 🚀 ধাপ ৫: অ্যাপ রিস্টার্ট ও টেলিগ্রাম Webhook কানেক্ট করুন
1. cPanel-এ **"Restart Application"** বাটনে ক্লিক করুন।
2. ব্রাউজারে আপনার ডোমেন ওপেন করুন (যেমন: `https://yourdomain.com`)। ড্যাশবোর্ড স্ক্রিন চলে আসবে।
3. ড্যাশবোর্ডে **"১-ক্লিকে টেলিগ্রাম Webhook সক্রিয় করুন"** বক্সে আপনার ডোমেনের Webhook URL দিন:
   `https://yourdomain.com/api/telegram-webhook`
4. **"কানেক্ট Webhook"** বাটনে ক্লিক করুন।
5. Telegram-এ গিয়ে আপনার বোটে `/start` কমান্ড পাঠান। বোট সাথে সাথে কাজ শুরু করবে!

---

## ❓ সাধারণ সমস্যা ও সমাধান (Troubleshooting)

- **সমস্যা: 503 Service Unavailable / 502 Bad Gateway**
  - সমাধান: নিশ্চিত করুন `Application startup file`-এ `app.js` অথবা `dist/server.cjs` দেওয়া আছে। এবং `dist/` ফোল্ডারটির মধ্যে `server.cjs` ফাইলটি বিদ্যমান আছে কি না দেখুন।
- **সমস্যা: Webhook কাজ করছে না**
  - সমাধান: আপনার সাইটে অবশ্যই **SSL (HTTPS)** অ্যাক্টিভ থাকতে হবে (cPanel "Let's Encrypt SSL" বা "AutoSSL" চালু করুন)। Telegram কেবল `https://` লিংক গ্রহণ করে।
- **সমস্যা: GitHub / Vercel Deploy Failed**
  - সমাধান: `.env` ফাইলে আপনার ভ্যালিড `GITHUB_TOKEN` (repo পারমিশনসহ) এবং `VERCEL_TOKEN` বসিয়ে সেভ করে cPanel থেকে অ্যাপ **Restart** দিন।
