-- =================================================================
-- cPanel MySQL Database Dump & Import (Migrated from Firebase)
-- Target Database: lalmoni1_ai
-- Generated on: 2026-10-02T07:52:28.396Z
-- =================================================================

USE `lalmoni1_ai`;

-- Table: users
CREATE TABLE IF NOT EXISTS users (
  telegram_id BIGINT PRIMARY KEY,
  username VARCHAR(255) DEFAULT '',
  first_name VARCHAR(255) DEFAULT '',
  last_name VARCHAR(255) DEFAULT '',
  verified TINYINT(1) DEFAULT 0,
  banned TINYINT(1) DEFAULT 0,
  created_at BIGINT,
  last_active BIGINT,
  daily_usage INT DEFAULT 0,
  daily_usage_date VARCHAR(50) DEFAULT '',
  role VARCHAR(50) DEFAULT 'user'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: projects
CREATE TABLE IF NOT EXISTS projects (
  project_id VARCHAR(255) PRIMARY KEY,
  user_id BIGINT,
  project_name VARCHAR(255),
  github_repository VARCHAR(255) DEFAULT '',
  github_url TEXT,
  vercel_project VARCHAR(255) DEFAULT '',
  vercel_url TEXT,
  deployment_id VARCHAR(255) DEFAULT '',
  framework VARCHAR(100) DEFAULT '',
  status VARCHAR(50) DEFAULT 'ONLINE',
  created_at BIGINT,
  updated_at BIGINT,
  custom_domain VARCHAR(255) DEFAULT '',
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: admins
CREATE TABLE IF NOT EXISTS admins (
  user_id BIGINT PRIMARY KEY,
  role VARCHAR(50),
  username VARCHAR(255) DEFAULT '',
  added_by BIGINT DEFAULT 0,
  created_at BIGINT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: system_logs
CREATE TABLE IF NOT EXISTS system_logs (
  log_id VARCHAR(255) PRIMARY KEY,
  user_id BIGINT,
  action VARCHAR(255),
  status VARCHAR(50),
  project_id VARCHAR(255) DEFAULT '',
  details TEXT,
  timestamp BIGINT,
  INDEX idx_user_log (user_id),
  INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inserting Migrated Users (33)
REPLACE INTO users (telegram_id, username, first_name, last_name, verified, banned, created_at, last_active, daily_usage, daily_usage_date, role)
VALUES (1087968824, 'GroupAnonymousBot', 'Group', '', 0, 0, 1787748318532, 1787748318532, 0, '2026-08-26', 'user');
REPLACE INTO users (telegram_id, username, first_name, last_name, verified, banned, created_at, last_active, daily_usage, daily_usage_date, role)
VALUES (6082163011, 'OrjunGroup', 'ORJUN', 'GROUP', 1, 0, 1788169305737, 1788990230962, 4, '2026-09-09', 'user');
REPLACE INTO users (telegram_id, username, first_name, last_name, verified, banned, created_at, last_active, daily_usage, daily_usage_date, role)
VALUES (6429065320, 'rakibulhasan_tbr', 'Md Rakib', 'Hasan', 0, 0, 1789573409121, 1789573409121, 0, '2026-09-16', 'user');
REPLACE INTO users (telegram_id, username, first_name, last_name, verified, banned, created_at, last_active, daily_usage, daily_usage_date, role)
VALUES (6582564791, 'Blp0o', '🫪', '', 1, 0, 1789307505892, 1789307505892, 0, '2026-09-13', 'user');
REPLACE INTO users (telegram_id, username, first_name, last_name, verified, banned, created_at, last_active, daily_usage, daily_usage_date, role)
VALUES (6743390968, 'orviXxxx', '𝐗𝐂', '', 0, 0, 1787767706103, 1787994938512, 0, '2026-08-29', 'user');
REPLACE INTO users (telegram_id, username, first_name, last_name, verified, banned, created_at, last_active, daily_usage, daily_usage_date, role)
VALUES (6919025708, 'DarkPrince_Dev', 'ᴅᴀʀᴋ', '¯\\_(ツ)_/¯ ᴘʀɪɴᴄᴇ', 1, 0, 1787748104637, 1790437942603, 1, '2026-09-26', 'super_admin');
REPLACE INTO users (telegram_id, username, first_name, last_name, verified, banned, created_at, last_active, daily_usage, daily_usage_date, role)
VALUES (7237038934, 'Victoriababe9', 'Eha bee', '', 1, 0, 1788169421469, 1788169421469, 0, '2026-08-31', 'user');
REPLACE INTO users (telegram_id, username, first_name, last_name, verified, banned, created_at, last_active, daily_usage, daily_usage_date, role)
VALUES (7292911538, 'solcatlord', 'Genius alar', '', 1, 0, 1788169193867, 1788169194192, 0, '2026-08-31', 'user');
REPLACE INTO users (telegram_id, username, first_name, last_name, verified, banned, created_at, last_active, daily_usage, daily_usage_date, role)
VALUES (7339139339, 'solcatmoon1', 'Oracle', '', 1, 0, 1788169243732, 1788169243732, 0, '2026-08-31', 'user');
REPLACE INTO users (telegram_id, username, first_name, last_name, verified, banned, created_at, last_active, daily_usage, daily_usage_date, role)
VALUES (7355274596, '', '✗ ᴋᴏʙɪʀᴀᴊ ⚔︎', '', 1, 0, 1787767759475, 1787994988197, 0, '2026-08-29', 'user');
REPLACE INTO users (telegram_id, username, first_name, last_name, verified, banned, created_at, last_active, daily_usage, daily_usage_date, role)
VALUES (7549246394, 'devsatanic', '⏤͟͟͞𝙇𝙪𝙢𝙞𝙣𝙚𝙧𝙚 • 𝑪𝒓𝒂𝒛𝒚𝑹𝒊𝒄𝒉', '', 0, 0, 1789148014901, 1789148014901, 0, '2026-09-11', 'user');
REPLACE INTO users (telegram_id, username, first_name, last_name, verified, banned, created_at, last_active, daily_usage, daily_usage_date, role)
VALUES (7561727601, 'NSsajid', '☸Ɇ戀₦₴࿐', '', 1, 0, 1787751384803, 1788270755462, 0, '2026-09-01', 'user');
REPLACE INTO users (telegram_id, username, first_name, last_name, verified, banned, created_at, last_active, daily_usage, daily_usage_date, role)
VALUES (7650251578, 'Tanisha_Trader340', 'Tanisha', 'Trader', 1, 0, 1787749133342, 1790814315736, 1, '2026-10-01', 'user');
REPLACE INTO users (telegram_id, username, first_name, last_name, verified, banned, created_at, last_active, daily_usage, daily_usage_date, role)
VALUES (7692956482, '', 'ʙᷨᴀⷶʟᷞʟᷞᴀⷶsᷤ', '', 1, 0, 1790102639188, 1790104974280, 4, '2026-09-22', 'user');
REPLACE INTO users (telegram_id, username, first_name, last_name, verified, banned, created_at, last_active, daily_usage, daily_usage_date, role)
VALUES (7845937082, 'anakbaiksehat', 'Замышляю', '', 0, 0, 1788173912920, 1788173938952, 0, '2026-08-31', 'user');
REPLACE INTO users (telegram_id, username, first_name, last_name, verified, banned, created_at, last_active, daily_usage, daily_usage_date, role)
VALUES (7893705117, 'Pxamt', 'є', '', 0, 0, 1788174523959, 1788174523959, 0, '2026-08-31', 'user');
REPLACE INTO users (telegram_id, username, first_name, last_name, verified, banned, created_at, last_active, daily_usage, daily_usage_date, role)
VALUES (8180331131, 'xcqvans', '— ͟͞͞𝗚𝗢𝗩𝗡 || 𝗩𝗔𝗡𝗦𝗦', '𝐕𝐐𝐗 𓃬', 0, 0, 1788859313580, 1788859313580, 0, '2026-09-08', 'user');
REPLACE INTO users (telegram_id, username, first_name, last_name, verified, banned, created_at, last_active, daily_usage, daily_usage_date, role)
VALUES (8251186537, 'TheRealAdminX', '💔 SORRY💔', 'BROTHER', 1, 0, 1787767359988, 1787908572319, 2, '2026-08-28', 'user');
REPLACE INTO users (telegram_id, username, first_name, last_name, verified, banned, created_at, last_active, daily_usage, daily_usage_date, role)
VALUES (8452897239, 'abdullah_al_hasib_313', '𝐀𝐛𝐝𝐮𝐥𝐥𝐚𝐡 𝐀𝐥 𝐇𝐚𝐬𝐢𝐛 ‌🇸🇦 𓄂 𝟑𝟏𝟑 𓆃', '', 1, 0, 1788366008616, 1788366008616, 0, '2026-09-02', 'user');
REPLACE INTO users (telegram_id, username, first_name, last_name, verified, banned, created_at, last_active, daily_usage, daily_usage_date, role)
VALUES (8505419724, 'ScpThe', 'ScpThe', '', 1, 0, 1790066098621, 1790600138235, 2, '2026-09-28', 'user');
REPLACE INTO users (telegram_id, username, first_name, last_name, verified, banned, created_at, last_active, daily_usage, daily_usage_date, role)
VALUES (8509791040, 'inkrkn', '⌁ 𝓘𝓷𝓴𝓸𝓻𝓪', '', 1, 0, 1789483495850, 1789483495850, 0, '2026-09-15', 'user');
REPLACE INTO users (telegram_id, username, first_name, last_name, verified, banned, created_at, last_active, daily_usage, daily_usage_date, role)
VALUES (8581890404, 'TheOnePieceIsfake', 'Time to Change', '', 0, 0, 1790831610695, 1790831610695, 0, '2026-10-01', 'user');
REPLACE INTO users (telegram_id, username, first_name, last_name, verified, banned, created_at, last_active, daily_usage, daily_usage_date, role)
VALUES (8592899900, 'zyraara10', '— ͟͞͞𝐕𝐐𝐗 || 𝑍𝑌𝑅𝐴𝐴𝑅𝐴𝜗𝜚.', '#ᏝᎶᏁᏒ', 1, 0, 1788919834133, 1789120823092, 2, '2026-09-11', 'user');
REPLACE INTO users (telegram_id, username, first_name, last_name, verified, banned, created_at, last_active, daily_usage, daily_usage_date, role)
VALUES (8629839507, '', 'Hisoka', '', 1, 0, 1790510672339, 1790510672339, 0, '2026-09-27', 'user');
REPLACE INTO users (telegram_id, username, first_name, last_name, verified, banned, created_at, last_active, daily_usage, daily_usage_date, role)
VALUES (8660925576, '', 'Iuihtf', 'Bnxtnl', 0, 0, 1788174001763, 1788174001763, 0, '2026-08-31', 'user');
REPLACE INTO users (telegram_id, username, first_name, last_name, verified, banned, created_at, last_active, daily_usage, daily_usage_date, role)
VALUES (8788803156, 'G_q777', '𓄂𓀛𓆃', '', 1, 0, 1788337053252, 1788337053279, 0, '2026-09-02', 'user');
REPLACE INTO users (telegram_id, username, first_name, last_name, verified, banned, created_at, last_active, daily_usage, daily_usage_date, role)
VALUES (8803955776, 'Karinayzzysy7z', 'Karina', '', 1, 0, 1788296908234, 1788296917248, 0, '2026-09-01', 'user');
REPLACE INTO users (telegram_id, username, first_name, last_name, verified, banned, created_at, last_active, daily_usage, daily_usage_date, role)
VALUES (8870075572, 'zeayenarka', 'Zeayan Arka', '', 1, 0, 1790817995391, 1790846271680, 4, '2026-10-01', 'user');
REPLACE INTO users (telegram_id, username, first_name, last_name, verified, banned, created_at, last_active, daily_usage, daily_usage_date, role)
VALUES (8901572747, '', 'Rasheduzzaman', 'Aziz', 0, 0, 1788362668894, 1788362668894, 0, '2026-09-02', 'user');
REPLACE INTO users (telegram_id, username, first_name, last_name, verified, banned, created_at, last_active, daily_usage, daily_usage_date, role)
VALUES (8908546304, 'Code_Ran_de', 'Akg', '', 1, 0, 1788169473198, 1788169473198, 0, '2026-08-31', 'user');
REPLACE INTO users (telegram_id, username, first_name, last_name, verified, banned, created_at, last_active, daily_usage, daily_usage_date, role)
VALUES (8943960118, 'Gwhhaha7', 'Pana lelei', '', 1, 0, 1790109641471, 1790124605060, 1, '2026-09-23', 'user');
REPLACE INTO users (telegram_id, username, first_name, last_name, verified, banned, created_at, last_active, daily_usage, daily_usage_date, role)
VALUES (8978126908, '', 'Rashed', 'Islam', 0, 0, 1788449328639, 1788449328639, 0, '2026-09-03', 'user');
REPLACE INTO users (telegram_id, username, first_name, last_name, verified, banned, created_at, last_active, daily_usage, daily_usage_date, role)
VALUES (8991148411, 'dipcb001', '❤️‍🔥♡ᗪ𝙄𝓟 ♡❤️‍🔥', '', 1, 0, 1787749580634, 1787749789472, 1, '2026-08-26', 'user');

-- Inserting Migrated Projects (13)
REPLACE INTO projects (project_id, user_id, project_name, github_repository, github_url, vercel_project, vercel_url, deployment_id, framework, status, created_at, updated_at, custom_domain)
VALUES ('proj_1787749787573_namsogen', 8991148411, 'namsogen', 'vercelfreehostingbot/namsogen', 'https://github.com/vercelfreehostingbot/namsogen', 'namsogen', 'https://namsogen-seven.vercel.app', 'dpl_2Xeen5PB8HMqSyBr3QLHAaLDsCic', 'Static HTML / Web', 'ONLINE', 1787749787573, 1787749787573, '');
REPLACE INTO projects (project_id, user_id, project_name, github_repository, github_url, vercel_project, vercel_url, deployment_id, framework, status, created_at, updated_at, custom_domain)
VALUES ('proj_1787872046261_application-from', 8251186537, 'application-from', 'vercelfreehostingbot/application-from', 'https://github.com/vercelfreehostingbot/application-from', 'application-from', 'https://application-from.vercel.app', 'dpl_9TEJcJC6Qr7bMRRBmVEAiBcbzizK', 'Node.js Web App', 'ONLINE', 1787872046261, 1787872046261, '');
REPLACE INTO projects (project_id, user_id, project_name, github_repository, github_url, vercel_project, vercel_url, deployment_id, framework, status, created_at, updated_at, custom_domain)
VALUES ('proj_1787904905404_login-page-login', 8251186537, 'login-page-login', 'vercelfreehostingbot/login-page-login', 'https://github.com/vercelfreehostingbot/login-page-login', 'login-page-login', 'https://login-page-login.vercel.app', 'dpl_CDnqMoeunrEru2Dq3VEv1mTpmTFG', 'Static HTML / Web', 'ONLINE', 1787904905404, 1787908936657, '');
REPLACE INTO projects (project_id, user_id, project_name, github_repository, github_url, vercel_project, vercel_url, deployment_id, framework, status, created_at, updated_at, custom_domain)
VALUES ('proj_1788016733748_gvxg', 6919025708, 'gvxg', 'vercelfreehostingbot/gvxg', 'https://github.com/vercelfreehostingbot/gvxg', 'gvxg', 'https://gvxg.vercel.app', 'dpl_BUtijGNgKFMRkDKHNSnoLigFmjzv', 'Python (FastAPI / Flask / WSGI)', 'ONLINE', 1788016733748, 1788075420965, '');
REPLACE INTO projects (project_id, user_id, project_name, github_repository, github_url, vercel_project, vercel_url, deployment_id, framework, status, created_at, updated_at, custom_domain)
VALUES ('proj_1788069411330_gani-da-bot', 6919025708, 'gani-da-bot', 'vercelfreehostingbot/gani-da-bot', 'https://github.com/vercelfreehostingbot/gani-da-bot', 'gani-da-bot', 'https://gani-da-bot-free-hosting1.vercel.app', 'dpl_Hxn2nuSUFGkNWwA8kS7MUb2DvATA', 'Python (FastAPI / Flask / WSGI)', 'ONLINE', 1788069411330, 1788070169168, '');
REPLACE INTO projects (project_id, user_id, project_name, github_repository, github_url, vercel_project, vercel_url, deployment_id, framework, status, created_at, updated_at, custom_domain)
VALUES ('proj_1788178462846_teli-gx', 6919025708, 'teli-gx', 'vercelfreehostingbot/teli-gx', 'https://github.com/vercelfreehostingbot/teli-gx', 'teli-gx', 'https://teli-gx.vercel.app', 'dpl_6Vg74tbpHS3xVZJpj5gvxToU5ZH9', 'Next.js (React)', 'ONLINE', 1788178462846, 1788178681563, '');
REPLACE INTO projects (project_id, user_id, project_name, github_repository, github_url, vercel_project, vercel_url, deployment_id, framework, status, created_at, updated_at, custom_domain)
VALUES ('proj_1790067382823_my-scpthe-botio', 8505419724, 'my-scpthe-botio', 'vercelfreehostingbot/my-scpthe-botio', 'https://github.com/vercelfreehostingbot/my-scpthe-botio', 'my-scpthe-botio', 'https://my-scpthe-botio.vercel.app', 'dpl_FF8c2n5gBgatcscNjY4i5K3T1DzP', 'Node.js Serverless / API', 'ONLINE', 1790067382823, 1790067382823, '');
REPLACE INTO projects (project_id, user_id, project_name, github_repository, github_url, vercel_project, vercel_url, deployment_id, framework, status, created_at, updated_at, custom_domain)
VALUES ('proj_1790104973980_kamamad', 7692956482, 'kamamad', 'vercelfreehostingbot/kamamad', 'https://github.com/vercelfreehostingbot/kamamad', 'kamamad', 'https://kamamad.vercel.app', 'dpl_4Wv2LkhHwbXDE9M7L9FB28yDKNEH', 'Node.js Serverless / API', 'ONLINE', 1790104973980, 1790104973980, '');
REPLACE INTO projects (project_id, user_id, project_name, github_repository, github_url, vercel_project, vercel_url, deployment_id, framework, status, created_at, updated_at, custom_domain)
VALUES ('proj_1790437941604_maya-ai', 6919025708, 'maya-ai', 'vercelfreehostingbot/maya-ai', 'https://github.com/vercelfreehostingbot/maya-ai', 'maya-ai', 'https://maya-ai-teal.vercel.app', 'dpl_HG3a92KDwCPK8DeLteZ96iQGGJt2', 'Universal Web App', 'ONLINE', 1790437941604, 1790437941604, '');
REPLACE INTO projects (project_id, user_id, project_name, github_repository, github_url, vercel_project, vercel_url, deployment_id, framework, status, created_at, updated_at, custom_domain)
VALUES ('proj_1790598420636_abhwysys66', 8505419724, 'abhwysys66', 'vercelfreehostingbot/abhwysys66', 'https://github.com/vercelfreehostingbot/abhwysys66', 'abhwysys66', 'https://abhwysys66.vercel.app', 'dpl_BLMyec56L7cogidhSjKQy4Pvn7HM', 'Universal Web App', 'ONLINE', 1790598420636, 1790598420636, '');
REPLACE INTO projects (project_id, user_id, project_name, github_repository, github_url, vercel_project, vercel_url, deployment_id, framework, status, created_at, updated_at, custom_domain)
VALUES ('proj_1790600137487_nevscp', 8505419724, 'nevscp', 'vercelfreehostingbot/nevscp', 'https://github.com/vercelfreehostingbot/nevscp', 'nevscp', 'https://nevscp.vercel.app', 'dpl_GA6MCR2P26CsQQNaBrx2VwTXPm5o', 'Python (FastAPI / Flask / WSGI)', 'ONLINE', 1790600137487, 1790600137487, '');
REPLACE INTO projects (project_id, user_id, project_name, github_repository, github_url, vercel_project, vercel_url, deployment_id, framework, status, created_at, updated_at, custom_domain)
VALUES ('proj_1790811067919_ai-asis', 7650251578, 'ai-asis', 'vercelfreehostingbot/ai-asis', 'https://github.com/vercelfreehostingbot/ai-asis', 'ai-asis', 'https://ai-asis-rose.vercel.app', 'dpl_Hgpbjp7ShzqXWe4gyU9d6FvdBjDR', 'Static HTML / Web', 'ONLINE', 1790811067919, 1790811067919, '');
REPLACE INTO projects (project_id, user_id, project_name, github_repository, github_url, vercel_project, vercel_url, deployment_id, framework, status, created_at, updated_at, custom_domain)
VALUES ('proj_1790814315137_jhghgyufug', 7650251578, 'jhghgyufug', 'vercelfreehostingbot/jhghgyufug', 'https://github.com/vercelfreehostingbot/jhghgyufug', 'jhghgyufug', 'https://jhghgyufug.vercel.app', 'dpl_5ncpUnuLTN5JYzoCzo6xNoU52HBk', 'Python (FastAPI / Flask / WSGI)', 'ONLINE', 1790814315137, 1790815315256, '');

-- Inserting Migrated Admins (2)
REPLACE INTO admins (user_id, role, username, added_by, created_at)
VALUES (7561727601, 'admin', '', 6919025708, 1787827436829);
REPLACE INTO admins (user_id, role, username, added_by, created_at)
VALUES (8251186537, 'admin', '', 6919025708, 1787989846343);

