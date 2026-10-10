// =================================================================
// 𝗩𝗘𝗥𝗖𝗘𝗟 𝗙𝗥𝗘𝗘 𝗛𝗢𝗦𝗧𝗜𝗡𝗚 𝗕𝗢𝗧 — DATABASE ADAPTER (MySQL / cPanel Primary)
// =================================================================

import fs from 'fs';
import path from 'path';
import { CONFIG, getTodayDateString } from './config';
import {
  initMySQL,
  isMySQLConnected,
  getMySQLStatus,
  mysqlGetUser,
  mysqlSaveUser,
  mysqlGetAllUsers,
  mysqlSaveProject,
  mysqlGetAllProjects,
  mysqlGetUserProjects,
  mysqlDeleteProject,
  mysqlGetUserState,
  mysqlSetUserState,
  mysqlLogAction,
} from './mysql';
import {
  UserRecord,
  ProjectRecord,
  AdminRecord,
  SystemLogRecord,
  UserStateRecord,
  UserWorkflowState,
} from '../types';

// Attempt initial MySQL connection immediately
initMySQL().catch(() => {});

// Fast L1 In-Memory Cache for ultra-low latency bot responses (<2ms)
const l1Cache = {
  users: new Map<number, UserRecord>(),
  projects: new Map<string, ProjectRecord>(),
  admins: new Map<number, AdminRecord>(),
  logs: [] as SystemLogRecord[],
  states: new Map<number, UserStateRecord>(),
  adminsLoaded: false,
};

// Function to load exported Firebase backup directly into cache
export function loadFirebaseBackupIntoCache(): { users: number; projects: number; admins: number } {
  try {
    const candidatePaths = [
      path.resolve(process.cwd(), 'firebase_backup.json'),
      path.resolve(process.cwd(), 'dist', 'firebase_backup.json'),
      typeof __dirname !== 'undefined' ? path.resolve(__dirname, '..', '..', 'firebase_backup.json') : '',
      typeof __dirname !== 'undefined' ? path.resolve(__dirname, 'firebase_backup.json') : '',
    ].filter(Boolean);

    let backupJson = '';
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        backupJson = fs.readFileSync(p, 'utf-8');
        break;
      }
    }

    if (backupJson) {
      const data = JSON.parse(backupJson);

      if (Array.isArray(data.users)) {
        for (const u of data.users) {
          const tid = Number(u.telegram_id || u.id);
          if (tid) {
            l1Cache.users.set(tid, {
              telegram_id: tid,
              username: u.username || '',
              first_name: u.first_name || '',
              last_name: u.last_name || '',
              verified: !!u.verified,
              banned: !!u.banned,
              created_at: Number(u.created_at) || Date.now(),
              last_active: Number(u.last_active) || Date.now(),
              daily_usage: Number(u.daily_usage) || 0,
              daily_usage_date: u.daily_usage_date || '',
              role: u.role || 'user',
            });
          }
        }
      }

      if (Array.isArray(data.projects)) {
        for (const p of data.projects) {
          const pid = p.project_id || p.id;
          if (pid) {
            l1Cache.projects.set(pid, {
              project_id: pid,
              user_id: Number(p.user_id) || 0,
              project_name: p.project_name || p.name || 'Website',
              github_repository: p.github_repository || p.repo || '',
              github_url: p.github_url || '',
              vercel_project: p.vercel_project || '',
              vercel_url: p.vercel_url || p.url || '',
              deployment_id: p.deployment_id || '',
              framework: p.framework || 'Static HTML / Web',
              status: p.status || 'ONLINE',
              created_at: Number(p.created_at) || Date.now(),
              updated_at: Number(p.updated_at) || Date.now(),
              custom_domain: p.custom_domain || '',
            });
          }
        }
      }

      if (Array.isArray(data.admins)) {
        for (const a of data.admins) {
          const uid = Number(a.user_id || a.id);
          if (uid) {
            l1Cache.admins.set(uid, {
              user_id: uid,
              role: a.role || 'admin',
              username: a.username || '',
              added_by: Number(a.added_by) || 0,
              created_at: Number(a.created_at) || Date.now(),
            });
          }
        }
      }

      console.log(`[Database Migration] Successfully loaded ${l1Cache.users.size} users and ${l1Cache.projects.size} projects from Firebase backup`);
    }
  } catch (err: any) {
    console.warn('[Database Migration] Notice while loading backup:', err?.message);
  }

  return {
    users: l1Cache.users.size,
    projects: l1Cache.projects.size,
    admins: l1Cache.admins.size,
  };
}

// Initial load from migrated backup
loadFirebaseBackupIntoCache();

// Seed Super Admin in storage if not already there
const superAdminRecord: UserRecord = l1Cache.users.get(CONFIG.SUPER_ADMIN_ID) || {
  telegram_id: CONFIG.SUPER_ADMIN_ID,
  username: 'kshakilrana',
  first_name: 'Shakil',
  last_name: 'Rana',
  verified: true,
  banned: false,
  created_at: Date.now() - 86400000 * 2,
  last_active: Date.now(),
  daily_usage: 1,
  daily_usage_date: getTodayDateString(),
  role: 'super_admin',
};
l1Cache.users.set(CONFIG.SUPER_ADMIN_ID, superAdminRecord);

l1Cache.admins.set(CONFIG.SUPER_ADMIN_ID, {
  user_id: CONFIG.SUPER_ADMIN_ID,
  role: 'super_admin',
  created_at: Date.now(),
});

// Sync initial seed and load all records from MySQL into memory cache
setImmediate(async () => {
  try {
    await initMySQL();
    if (isMySQLConnected()) {
      const dbUsers = await mysqlGetAllUsers().catch(() => []);
      for (const u of dbUsers) {
        l1Cache.users.set(u.telegram_id, u);
      }
      const dbProjects = await mysqlGetAllProjects().catch(() => []);
      for (const p of dbProjects) {
        l1Cache.projects.set(p.project_id, p);
      }
      console.log(`[MySQL Database] Successfully loaded ${l1Cache.users.size} users and ${l1Cache.projects.size} projects from cPanel MySQL tables!`);
    }
  } catch (e) {
    // Non-fatal
  }
});

// Helper for clean object clone
export function cleanFirestoreData<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;
  const clean: any = Array.isArray(obj) ? [] : {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
        clean[key] = cleanFirestoreData(value);
      } else {
        clean[key] = value;
      }
    }
  }
  return clean;
}

// ----------------- USER MANAGEMENT -----------------

export async function getOrCreateUser(
  telegramId: number,
  userData: {
    username?: string;
    first_name?: string;
    last_name?: string;
  }
): Promise<UserRecord> {
  const today = getTodayDateString();
  const cachedUser = l1Cache.users.get(telegramId);

  if (cachedUser) {
    let dailyUsage = cachedUser.daily_usage || 0;
    if (cachedUser.daily_usage_date !== today) {
      dailyUsage = 0;
    }

    cachedUser.username = userData.username || cachedUser.username || '';
    cachedUser.first_name = userData.first_name || cachedUser.first_name || '';
    cachedUser.last_name = userData.last_name || cachedUser.last_name || '';
    cachedUser.last_active = Date.now();
    cachedUser.daily_usage = dailyUsage;
    cachedUser.daily_usage_date = today;

    if (isMySQLConnected()) {
      setImmediate(() => {
        mysqlSaveUser(cachedUser).catch(() => {});
      });
    }
    return cachedUser;
  }

  // Check MySQL
  if (isMySQLConnected()) {
    const dbUser = await mysqlGetUser(telegramId);
    if (dbUser) {
      let dailyUsage = dbUser.daily_usage || 0;
      if (dbUser.daily_usage_date !== today) {
        dailyUsage = 0;
      }
      dbUser.username = userData.username || dbUser.username || '';
      dbUser.first_name = userData.first_name || dbUser.first_name || '';
      dbUser.last_name = userData.last_name || dbUser.last_name || '';
      dbUser.last_active = Date.now();
      dbUser.daily_usage = dailyUsage;
      dbUser.daily_usage_date = today;

      l1Cache.users.set(telegramId, dbUser);
      setImmediate(() => {
        mysqlSaveUser(dbUser).catch(() => {});
      });
      return dbUser;
    }
  }

  // New user
  const isSuperAdmin = telegramId === CONFIG.SUPER_ADMIN_ID;
  const newUser: UserRecord = {
    telegram_id: telegramId,
    username: userData.username || '',
    first_name: userData.first_name || '',
    last_name: userData.last_name || '',
    verified: isSuperAdmin,
    banned: false,
    created_at: Date.now(),
    last_active: Date.now(),
    daily_usage: 0,
    daily_usage_date: today,
    role: isSuperAdmin ? 'super_admin' : 'user',
  };

  l1Cache.users.set(telegramId, newUser);
  if (isMySQLConnected()) {
    setImmediate(() => {
      mysqlSaveUser(newUser).catch(() => {});
    });
  }

  return newUser;
}

export async function getUser(telegramId: number): Promise<UserRecord | null> {
  const cached = l1Cache.users.get(telegramId);
  if (cached) return cached;

  if (isMySQLConnected()) {
    const dbUser = await mysqlGetUser(telegramId);
    if (dbUser) {
      l1Cache.users.set(telegramId, dbUser);
      return dbUser;
    }
  }
  return null;
}

export async function updateUserUsage(telegramId: number): Promise<void> {
  const user = await getUser(telegramId);
  if (!user) return;

  const today = getTodayDateString();
  if (user.daily_usage_date !== today) {
    user.daily_usage = 1;
    user.daily_usage_date = today;
  } else {
    user.daily_usage = (user.daily_usage || 0) + 1;
  }
  user.last_active = Date.now();

  l1Cache.users.set(telegramId, user);
  if (isMySQLConnected()) {
    setImmediate(() => {
      mysqlSaveUser(user).catch(() => {});
    });
  }
}

export async function incrementUserUsage(telegramId: number): Promise<void> {
  await updateUserUsage(telegramId);
}

export async function resetUserDailyLimit(telegramId: number): Promise<boolean> {
  const user = await getUser(telegramId);
  if (!user) return false;
  user.daily_usage = 0;
  user.daily_usage_date = getTodayDateString();
  l1Cache.users.set(telegramId, user);
  if (isMySQLConnected()) {
    setImmediate(() => {
      mysqlSaveUser(user).catch(() => {});
    });
  }
  return true;
}

export async function setUserVerified(telegramId: number, verified: boolean): Promise<boolean> {
  const user = l1Cache.users.get(telegramId);
  if (user) {
    user.verified = verified;
    if (isMySQLConnected()) {
      setImmediate(() => {
        mysqlSaveUser(user).catch(() => {});
      });
    }
  }
  return true;
}

export async function setUserBanStatus(telegramId: number, banned: boolean): Promise<boolean> {
  const user = l1Cache.users.get(telegramId);
  if (user) {
    user.banned = banned;
    if (isMySQLConnected()) {
      setImmediate(() => {
        mysqlSaveUser(user).catch(() => {});
      });
    }
  }
  return true;
}

// ----------------- USER WORKFLOW STATE -----------------

export async function getUserState(telegramId: number): Promise<UserStateRecord> {
  const state = l1Cache.states.get(telegramId);
  if (state) return state;

  if (isMySQLConnected()) {
    const dbState = await mysqlGetUserState(telegramId);
    if (dbState) {
      l1Cache.states.set(telegramId, dbState);
      return dbState;
    }
  }

  return {
    user_id: telegramId,
    state: 'IDLE',
    updated_at: Date.now(),
  };
}

export async function setUserState(
  telegramId: number,
  state: UserWorkflowState,
  tempData?: any
): Promise<void> {
  const stateRecord: UserStateRecord = {
    user_id: telegramId,
    state,
    temp_data: tempData ? cleanFirestoreData(tempData) : {},
    updated_at: Date.now(),
  };

  l1Cache.states.set(telegramId, stateRecord);
  if (isMySQLConnected()) {
    setImmediate(() => {
      mysqlSetUserState(stateRecord).catch(() => {});
    });
  }
}

export async function clearUserState(telegramId: number): Promise<void> {
  await setUserState(telegramId, 'IDLE', {});
}

// ----------------- PROJECT MANAGEMENT -----------------

export async function saveProject(project: ProjectRecord): Promise<void> {
  l1Cache.projects.set(project.project_id, project);

  if (isMySQLConnected()) {
    setImmediate(() => {
      mysqlSaveProject(project).catch((err) => console.warn('[MySQL SaveProject Err]:', err?.message));
    });
  }
}

export async function getProject(projectId: string): Promise<ProjectRecord | null> {
  const cached = l1Cache.projects.get(projectId);
  if (cached) return cached;

  if (isMySQLConnected()) {
    const all = await mysqlGetAllProjects();
    const found = all.find((p) => p.project_id === projectId);
    if (found) {
      l1Cache.projects.set(projectId, found);
      return found;
    }
  }
  return null;
}

export async function getUserProjects(userId: number): Promise<ProjectRecord[]> {
  if (isMySQLConnected()) {
    try {
      const dbProjects = await mysqlGetUserProjects(userId);
      if (dbProjects && dbProjects.length > 0) {
        dbProjects.forEach((p) => l1Cache.projects.set(p.project_id, p));
        return dbProjects;
      }
    } catch (e) {}
  }

  return Array.from(l1Cache.projects.values())
    .filter((p) => p.user_id === userId)
    .sort((a, b) => b.created_at - a.created_at);
}

export async function getAllProjects(): Promise<ProjectRecord[]> {
  if (isMySQLConnected()) {
    try {
      const dbProjects = await mysqlGetAllProjects();
      if (dbProjects && dbProjects.length > 0) {
        dbProjects.forEach((p) => l1Cache.projects.set(p.project_id, p));
        return dbProjects;
      }
    } catch (e) {}
  }

  return Array.from(l1Cache.projects.values()).sort((a, b) => b.created_at - a.created_at);
}

export async function checkProjectNameExists(projectName: string, userId: number): Promise<boolean> {
  const existsInCache = Array.from(l1Cache.projects.values()).some(
    (p) => p.user_id === userId && p.project_name.toLowerCase() === projectName.toLowerCase()
  );
  if (existsInCache) return true;

  if (isMySQLConnected()) {
    const list = await mysqlGetUserProjects(userId);
    return list.some((p) => p.project_name.toLowerCase() === projectName.toLowerCase());
  }
  return false;
}

export async function deleteProjectRecord(projectId: string): Promise<void> {
  l1Cache.projects.delete(projectId);

  if (isMySQLConnected()) {
    setImmediate(() => {
      mysqlDeleteProject(projectId).catch(() => {});
    });
  }
}

// ----------------- ADMINS & ROLES -----------------

export async function isAdmin(telegramId: number): Promise<boolean> {
  if (telegramId === CONFIG.SUPER_ADMIN_ID) return true;
  return l1Cache.admins.has(telegramId);
}

export async function isSuperAdmin(telegramId: number): Promise<boolean> {
  return telegramId === CONFIG.SUPER_ADMIN_ID;
}

export async function addAdmin(
  targetId: number,
  addedBy: number,
  username?: string
): Promise<boolean> {
  const record: AdminRecord = {
    user_id: targetId,
    role: 'admin',
    username: username || '',
    added_by: addedBy,
    created_at: Date.now(),
  };
  l1Cache.admins.set(targetId, record);
  return true;
}

export async function removeAdmin(targetId: number): Promise<boolean> {
  if (targetId === CONFIG.SUPER_ADMIN_ID) return false;
  l1Cache.admins.delete(targetId);
  return true;
}

export async function getAllAdmins(): Promise<AdminRecord[]> {
  return Array.from(l1Cache.admins.values());
}

// ----------------- SYSTEM LOGS & STATS -----------------

export async function logSystemAction(
  userId: number,
  action: string,
  status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'INFO',
  projectId?: string,
  details?: string
): Promise<void> {
  const log: SystemLogRecord = {
    log_id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    user_id: userId,
    action,
    status,
    project_id: projectId || '',
    details: details || '',
    timestamp: Date.now(),
  };

  l1Cache.logs.unshift(log);
  if (l1Cache.logs.length > 200) l1Cache.logs.pop();

  if (isMySQLConnected()) {
    setImmediate(() => {
      mysqlLogAction(log).catch(() => {});
    });
  }
}

export async function getSystemStats(): Promise<{
  totalUsers: number;
  totalProjects: number;
  activeProjects: number;
  todayDeployments: number;
  bannedUsers: number;
  mysqlConnected: boolean;
  firebaseConnected: boolean;
}> {
  const today = getTodayDateString();

  if (isMySQLConnected()) {
    try {
      const [users, projects] = await Promise.all([
        mysqlGetAllUsers(),
        mysqlGetAllProjects(),
      ]);

      const todayDeployments = users.reduce((acc, u) => {
        return acc + (u.daily_usage_date === today ? u.daily_usage || 0 : 0);
      }, 0);

      const activeProjects = projects.filter((p) => p.status === 'ONLINE').length;
      const bannedUsers = users.filter((u) => u.banned).length;

      return {
        totalUsers: users.length,
        totalProjects: projects.length,
        activeProjects,
        todayDeployments,
        bannedUsers,
        mysqlConnected: true,
        firebaseConnected: true,
      };
    } catch (e) {
      // Fallback
    }
  }

  const users = Array.from(l1Cache.users.values());
  const projects = Array.from(l1Cache.projects.values());
  const todayDeployments = users.reduce((acc, u) => {
    return acc + (u.daily_usage_date === today ? u.daily_usage || 0 : 0);
  }, 0);

  return {
    totalUsers: users.length,
    totalProjects: projects.length,
    activeProjects: projects.filter((p) => p.status === 'ONLINE').length,
    todayDeployments,
    bannedUsers: users.filter((u) => u.banned).length,
    mysqlConnected: isMySQLConnected(),
    firebaseConnected: isMySQLConnected(),
  };
}

export async function getAllUsers(): Promise<UserRecord[]> {
  if (isMySQLConnected()) {
    try {
      const users = await mysqlGetAllUsers();
      if (users && users.length > 0) {
        users.forEach((u) => l1Cache.users.set(u.telegram_id, u));
        return users;
      }
    } catch (e) {}
  }
  return Array.from(l1Cache.users.values()).sort((a, b) => b.last_active - a.last_active);
}

export async function getRecentLogs(limit = 20): Promise<SystemLogRecord[]> {
  return l1Cache.logs.slice(0, limit);
}
