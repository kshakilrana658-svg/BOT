// =================================================================
// 𝗩𝗘𝗥𝗖𝗘𝗟 𝗙𝗥𝗘𝗘 𝗛𝗢𝗦𝗧𝗜𝗡𝗚 𝗕𝗢𝗧 — cPanel MySQL / MariaDB Storage
// =================================================================

import mysql from 'mysql2/promise';
import {
  UserRecord,
  ProjectRecord,
  AdminRecord,
  SystemLogRecord,
  UserStateRecord,
  UserWorkflowState,
} from '../types';

export interface MySQLConfig {
  host: string;
  user: string;
  database: string;
  password?: string;
  port: number;
}

let pool: mysql.Pool | null = null;
let isMySQLReady = false;
let lastInitAttempt = 0;
let connectionError = '';

export function getMySQLConfig(): MySQLConfig {
  return {
    host: process.env.DB_HOST || 'lalmonirhatakmp.site',
    user: process.env.DB_USER || 'lalmoni1_kshakilrana',
    database: process.env.DB_NAME || 'lalmoni1_ai',
    password: process.env.DB_PASSWORD || 'Rana@@12##',
    port: Number(process.env.DB_PORT) || 3306,
  };
}

export async function initMySQL(force = false): Promise<boolean> {
  const now = Date.now();
  if (isMySQLReady && pool && !force) return true;
  if (!force && now - lastInitAttempt < 10000 && !isMySQLReady) {
    return false; // throttled retry
  }
  lastInitAttempt = now;

  const baseConfig = getMySQLConfig();
  // Try configured host first, then fallback to remote or localhost if needed
  const candidateHosts = [baseConfig.host];
  if (baseConfig.host === 'localhost') {
    candidateHosts.push('lalmonirhatakmp.site');
  } else if (baseConfig.host === 'lalmonirhatakmp.site') {
    candidateHosts.push('localhost');
  }

  let lastError: any = null;

  for (const host of candidateHosts) {
    try {
      if (pool) {
        try {
          await pool.end();
        } catch (e) {
          // ignore
        }
        pool = null;
      }

      console.log(`[MySQL] Attempting connection to host: ${host}:${baseConfig.port} (database: ${baseConfig.database})...`);

      const testPool = mysql.createPool({
        host,
        user: baseConfig.user,
        password: baseConfig.password,
        database: baseConfig.database,
        port: baseConfig.port,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        connectTimeout: 10000,
      });

      // Test ping
      const connection = await testPool.getConnection();
      connection.release();

      pool = testPool;

      // Auto-create required tables
      await createTablesIfNotExist();

      isMySQLReady = true;
      connectionError = '';
      console.log(`[MySQL] Successfully connected to cPanel MySQL database: ${baseConfig.database} at ${host}`);
      return true;
    } catch (error: any) {
      lastError = error;
      console.warn(`[MySQL] Connection to ${host} failed: ${error?.message || error}`);
    }
  }

  isMySQLReady = false;
  connectionError = lastError?.message || 'Failed to connect to MySQL';
  console.warn(`[MySQL Notice] Running with fallback storage. (${connectionError})`);
  return false;
}

export function isMySQLConnected(): boolean {
  return isMySQLReady;
}

export function getMySQLStatus(): { connected: boolean; error: string; config: { host: string; user: string; database: string } } {
  const cfg = getMySQLConfig();
  return {
    connected: isMySQLReady,
    error: connectionError,
    config: {
      host: cfg.host,
      user: cfg.user,
      database: cfg.database,
    },
  };
}

async function createTablesIfNotExist(): Promise<void> {
  if (!pool) return;

  await pool.query(`
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
  `);

  await pool.query(`
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
  `);

  await pool.query(`
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
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS admins (
      user_id BIGINT PRIMARY KEY,
      role VARCHAR(50),
      username VARCHAR(255) DEFAULT '',
      added_by BIGINT DEFAULT 0,
      created_at BIGINT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_states (
      user_id BIGINT PRIMARY KEY,
      state VARCHAR(100),
      temp_data LONGTEXT,
      updated_at BIGINT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
}

// -------------------------------------------------------------
// USER OPERATIONS
// -------------------------------------------------------------

export async function mysqlGetUser(telegramId: number): Promise<UserRecord | null> {
  if (!pool || !isMySQLReady) return null;
  try {
    const [rows]: any = await pool.query(
      'SELECT * FROM users WHERE telegram_id = ? LIMIT 1',
      [telegramId]
    );
    if (rows && rows.length > 0) {
      const r = rows[0];
      return {
        telegram_id: Number(r.telegram_id),
        username: r.username || '',
        first_name: r.first_name || '',
        last_name: r.last_name || '',
        verified: Boolean(r.verified),
        banned: Boolean(r.banned),
        created_at: Number(r.created_at),
        last_active: Number(r.last_active),
        daily_usage: Number(r.daily_usage),
        daily_usage_date: r.daily_usage_date || '',
        role: r.role || 'user',
      };
    }
  } catch (err: any) {
    console.warn('[MySQL getUser error]:', err?.message);
  }
  return null;
}

export async function mysqlSaveUser(user: UserRecord): Promise<boolean> {
  if (!pool || !isMySQLReady) return false;
  try {
    await pool.query(
      `INSERT INTO users (
        telegram_id, username, first_name, last_name, verified, banned,
        created_at, last_active, daily_usage, daily_usage_date, role
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        username = VALUES(username),
        first_name = VALUES(first_name),
        last_name = VALUES(last_name),
        verified = VALUES(verified),
        banned = VALUES(banned),
        last_active = VALUES(last_active),
        daily_usage = VALUES(daily_usage),
        daily_usage_date = VALUES(daily_usage_date),
        role = VALUES(role)`,
      [
        user.telegram_id,
        user.username || '',
        user.first_name || '',
        user.last_name || '',
        user.verified ? 1 : 0,
        user.banned ? 1 : 0,
        user.created_at,
        user.last_active,
        user.daily_usage || 0,
        user.daily_usage_date || '',
        user.role || 'user',
      ]
    );
    return true;
  } catch (err: any) {
    console.warn('[MySQL saveUser error]:', err?.message);
    return false;
  }
}

export async function mysqlGetAllUsers(): Promise<UserRecord[]> {
  if (!pool || !isMySQLReady) return [];
  try {
    const [rows]: any = await pool.query(
      'SELECT * FROM users ORDER BY last_active DESC'
    );
    return (rows || []).map((r: any) => ({
      telegram_id: Number(r.telegram_id),
      username: r.username || '',
      first_name: r.first_name || '',
      last_name: r.last_name || '',
      verified: Boolean(r.verified),
      banned: Boolean(r.banned),
      created_at: Number(r.created_at),
      last_active: Number(r.last_active),
      daily_usage: Number(r.daily_usage),
      daily_usage_date: r.daily_usage_date || '',
      role: r.role || 'user',
    }));
  } catch (err: any) {
    console.warn('[MySQL getAllUsers error]:', err?.message);
    return [];
  }
}

// -------------------------------------------------------------
// PROJECT OPERATIONS
// -------------------------------------------------------------

export async function mysqlSaveProject(project: ProjectRecord): Promise<boolean> {
  if (!pool || !isMySQLReady) return false;
  try {
    await pool.query(
      `INSERT INTO projects (
        project_id, user_id, project_name, github_repository, github_url,
        vercel_project, vercel_url, deployment_id, framework, status,
        created_at, updated_at, custom_domain
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        project_name = VALUES(project_name),
        github_repository = VALUES(github_repository),
        github_url = VALUES(github_url),
        vercel_project = VALUES(vercel_project),
        vercel_url = VALUES(vercel_url),
        deployment_id = VALUES(deployment_id),
        framework = VALUES(framework),
        status = VALUES(status),
        updated_at = VALUES(updated_at),
        custom_domain = VALUES(custom_domain)`,
      [
        project.project_id,
        project.user_id,
        project.project_name,
        project.github_repository || '',
        project.github_url || '',
        project.vercel_project || '',
        project.vercel_url || '',
        project.deployment_id || '',
        project.framework || '',
        project.status || 'ONLINE',
        project.created_at,
        project.updated_at,
        project.custom_domain || '',
      ]
    );
    return true;
  } catch (err: any) {
    console.warn('[MySQL saveProject error]:', err?.message);
    return false;
  }
}

export async function mysqlGetAllProjects(): Promise<ProjectRecord[]> {
  if (!pool || !isMySQLReady) return [];
  try {
    const [rows]: any = await pool.query(
      'SELECT * FROM projects ORDER BY created_at DESC'
    );
    return (rows || []).map((r: any) => ({
      project_id: r.project_id,
      user_id: Number(r.user_id),
      project_name: r.project_name,
      github_repository: r.github_repository || '',
      github_url: r.github_url || '',
      vercel_project: r.vercel_project || '',
      vercel_url: r.vercel_url || '',
      deployment_id: r.deployment_id || '',
      framework: r.framework || '',
      status: r.status || 'ONLINE',
      created_at: Number(r.created_at),
      updated_at: Number(r.updated_at),
      custom_domain: r.custom_domain || '',
    }));
  } catch (err: any) {
    console.warn('[MySQL getAllProjects error]:', err?.message);
    return [];
  }
}

export async function mysqlGetUserProjects(userId: number): Promise<ProjectRecord[]> {
  if (!pool || !isMySQLReady) return [];
  try {
    const [rows]: any = await pool.query(
      'SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    return (rows || []).map((r: any) => ({
      project_id: r.project_id,
      user_id: Number(r.user_id),
      project_name: r.project_name,
      github_repository: r.github_repository || '',
      github_url: r.github_url || '',
      vercel_project: r.vercel_project || '',
      vercel_url: r.vercel_url || '',
      deployment_id: r.deployment_id || '',
      framework: r.framework || '',
      status: r.status || 'ONLINE',
      created_at: Number(r.created_at),
      updated_at: Number(r.updated_at),
      custom_domain: r.custom_domain || '',
    }));
  } catch (err: any) {
    console.warn('[MySQL getUserProjects error]:', err?.message);
    return [];
  }
}

export async function mysqlDeleteProject(projectId: string): Promise<boolean> {
  if (!pool || !isMySQLReady) return false;
  try {
    await pool.query('DELETE FROM projects WHERE project_id = ?', [projectId]);
    return true;
  } catch (err: any) {
    console.warn('[MySQL deleteProject error]:', err?.message);
    return false;
  }
}

// -------------------------------------------------------------
// USER STATE OPERATIONS
// -------------------------------------------------------------

export async function mysqlGetUserState(userId: number): Promise<UserStateRecord | null> {
  if (!pool || !isMySQLReady) return null;
  try {
    const [rows]: any = await pool.query(
      'SELECT * FROM user_states WHERE user_id = ? LIMIT 1',
      [userId]
    );
    if (rows && rows.length > 0) {
      const r = rows[0];
      let tempData = {};
      try {
        tempData = JSON.parse(r.temp_data || '{}');
      } catch (e) {}
      return {
        user_id: Number(r.user_id),
        state: r.state as UserWorkflowState,
        temp_data: tempData,
        updated_at: Number(r.updated_at),
      };
    }
  } catch (err: any) {
    console.warn('[MySQL getUserState error]:', err?.message);
  }
  return null;
}

export async function mysqlSetUserState(record: UserStateRecord): Promise<boolean> {
  if (!pool || !isMySQLReady) return false;
  try {
    const serialized = JSON.stringify(record.temp_data || {});
    await pool.query(
      `INSERT INTO user_states (user_id, state, temp_data, updated_at)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         state = VALUES(state),
         temp_data = VALUES(temp_data),
         updated_at = VALUES(updated_at)`,
      [record.user_id, record.state, serialized, record.updated_at]
    );
    return true;
  } catch (err: any) {
    console.warn('[MySQL setUserState error]:', err?.message);
    return false;
  }
}

// -------------------------------------------------------------
// SYSTEM LOG OPERATIONS
// -------------------------------------------------------------

export async function mysqlLogAction(log: SystemLogRecord): Promise<boolean> {
  if (!pool || !isMySQLReady) return false;
  try {
    await pool.query(
      `INSERT INTO system_logs (log_id, user_id, action, status, project_id, details, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        log.log_id,
        log.user_id,
        log.action,
        log.status,
        log.project_id || '',
        log.details || '',
        log.timestamp,
      ]
    );
    return true;
  } catch (err: any) {
    console.warn('[MySQL logAction error]:', err?.message);
    return false;
  }
}
