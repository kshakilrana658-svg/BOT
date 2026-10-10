// =================================================================
// cPanel / Phusion Passenger Node.js Startup File (ESM)
// =================================================================
import fs from 'fs';
import path from 'path';

process.env.NODE_ENV = process.env.NODE_ENV || 'production';

const serverFile = path.resolve(process.cwd(), 'dist', 'server.cjs');

if (!fs.existsSync(serverFile)) {
  console.warn('\n⚠️ [cPanel Notice] dist/server.cjs not found yet.');
  console.warn('👉 Run "npm run build" in cPanel Terminal to compile the application.\n');

  import('http').then(({ createServer }) => {
    const port = process.env.PORT || 3000;
    const server = createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head><title>Node.js App Initializing</title></head>
        <body style="margin: 0; background: #090d16; font-family: -apple-system, BlinkMacSystemFont, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; color: #f1f5f9;">
          <div style="max-width: 540px; margin: 20px; padding: 32px; background: #0f172a; border: 1px solid #1e293b; border-radius: 16px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); text-align: center;">
            <div style="font-size: 36px; margin-bottom: 12px;">🚀</div>
            <h2 style="margin: 0 0 10px 0; color: #38bdf8; font-size: 20px;">cPanel Node.js সার্ভার চালু হয়েছে</h2>
            <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
              সার্ভার সক্রিয় আছে, তবে অ্যাপ্লিকেশনটির বিল্ড ফাইল এখনো তৈরি করা হয়নি।
            </p>
            <div style="background: #020617; border: 1px solid #334155; padding: 14px; border-radius: 10px; font-family: monospace; font-size: 13px; color: #34d399; margin-bottom: 20px; text-align: left;">
              $ npm run build
            </div>
            <p style="color: #cbd5e1; font-size: 12px; margin: 0;">
              cPanel <b>Terminal</b>-এ গিয়ে <code>npm run build</code> চালান, অথবা লোকাল থেকে <code>dist</code> ফোল্ডার আপলোড করে cPanel-এ <b>Restart</b> বাটনে ক্লিক করুন।
            </p>
          </div>
        </body>
        </html>
      `);
    });
    server.listen(port, () => {
      console.log(`[cPanel Fallback] Notice server listening on port ${port}`);
    });
  });
} else {
  import('./dist/server.cjs').catch((err) => {
    console.error('[cPanel Startup Error] Failed to boot server:', err);
  });
}
