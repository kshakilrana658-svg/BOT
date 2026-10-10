import React, { useEffect, useState, useMemo } from 'react';
import {
  Users,
  Globe,
  ExternalLink,
  Copy,
  Check,
  Search,
  RefreshCw,
  FolderGit2,
  Calendar,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Lock,
  LogOut,
  Send,
  Trash2,
  RotateCcw,
  UserX,
  UserCheck,
  CheckCircle2,
  XCircle,
  Hash,
  AlertTriangle,
  TrendingUp,
  Activity,
  ArrowUpRight,
  Zap,
  Server,
  Database,
  Layers,
  Radio,
  SlidersHorizontal,
  LayoutGrid,
  ListFilter,
  Cpu,
  ArrowLeft,
  Sparkles,
  Bot,
  MessageSquare,
} from 'lucide-react';

interface ProjectItem {
  project_id: string;
  project_name: string;
  framework: string;
  live_url: string;
  github_url: string;
  status: string;
  created_at: number;
  updated_at?: number;
  custom_domain?: string;
}

interface UserGroup {
  telegram_id: number;
  first_name: string;
  last_name: string;
  display_name: string;
  username: string;
  role: string;
  verified: boolean;
  banned: boolean;
  avatar_url: string;
  last_active: number;
  created_at: number;
  daily_usage: number;
  project_count: number;
  projects: ProjectItem[];
}

interface DashboardStats {
  totalUsers: number;
  totalProjects: number;
  todayDeployments: number;
  activeProjects: number;
  mysqlConnected?: boolean;
}

interface BotInfo {
  name: string;
  username: string;
  id: number;
  avatar_url: string;
  telegram_link: string;
}

export default function App() {
  // Navigation: 'dashboard' or 'admin'
  const [activeRoute, setActiveRoute] = useState<'dashboard' | 'admin'>('dashboard');

  // Bot Information State
  const [botInfo, setBotInfo] = useState<BotInfo>({
    name: '𝗩𝗘𝗥𝗖𝗘𝗟 𝗙𝗥𝗘𝗘 𝗛𝗢𝗦𝗧𝗜𝗡𝗚 𝗕𝗢𝗧',
    username: 'Vercel_Free_Hosting_Bot',
    id: 8551402834,
    avatar_url: '/api/telegram-avatar/8551402834',
    telegram_link: 'https://t.me/Vercel_Free_Hosting_Bot',
  });

  // Stats & Users State
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalProjects: 0,
    todayDeployments: 0,
    activeProjects: 0,
  });
  const [users, setUsers] = useState<UserGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Tabs: 'assets' (Websites Ledger), 'clients' (Users & Identities), 'telemetry' (Infrastructure Health)
  const [activeTab, setActiveTab] = useState<'assets' | 'clients' | 'telemetry'>('assets');
  const [frameworkFilter, setFrameworkFilter] = useState<string>('all');
  const [lastSyncedTime, setLastSyncedTime] = useState<string>('Just now');

  // Admin Auth & State
  const [adminToken, setAdminToken] = useState<string | null>(() => {
    return localStorage.getItem('admin_token') || null;
  });
  const [secretKeyInput, setSecretKeyInput] = useState('');
  const [adminLoginError, setAdminLoginError] = useState('');
  const [adminActionLoading, setAdminActionLoading] = useState<string | null>(null);
  const [broadcastText, setBroadcastText] = useState('');
  const [adminNotification, setAdminNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // MySQL Connection Status State
  const [mysqlInfo, setMysqlInfo] = useState<{
    connected: boolean;
    error?: string | null;
    host?: string;
    database?: string;
    user?: string;
    loading?: boolean;
  }>({
    connected: true,
    host: 'lalmonirhatakmp.site',
    database: 'lalmoni1_ai',
    user: 'lalmoni1_kshakilrana',
    loading: false,
  });

  const handleConnectMySQL = async () => {
    setMysqlInfo((prev) => ({ ...prev, loading: true }));
    try {
      const res = await fetch('/api/mysql/connect', { method: 'POST' });
      const data = await res.json();
      setMysqlInfo({
        connected: Boolean(data.connected),
        error: data.error,
        host: data.config?.host || 'lalmonirhatakmp.site',
        database: data.config?.database || 'lalmoni1_ai',
        user: data.config?.user || 'lalmoni1_kshakilrana',
        loading: false,
      });
      await fetchDashboardData(true);
    } catch (err: any) {
      setMysqlInfo((prev) => ({
        ...prev,
        connected: false,
        error: err?.message || 'Connection failed',
        loading: false,
      }));
    }
  };

  // Avatar error tracking
  const [avatarErrors, setAvatarErrors] = useState<Record<number, boolean>>({});
  const [botAvatarError, setBotAvatarError] = useState(false);

  // Sync route strictly from URL path or hash (/admin or #admin)
  useEffect(() => {
    const handleUrlRoute = () => {
      const path = window.location.pathname;
      const hash = window.location.hash;
      if (path === '/admin' || hash === '#admin') {
        setActiveRoute('admin');
      } else {
        setActiveRoute('dashboard');
      }
    };
    handleUrlRoute();
    window.addEventListener('popstate', handleUrlRoute);
    window.addEventListener('hashchange', handleUrlRoute);
    return () => {
      window.removeEventListener('popstate', handleUrlRoute);
      window.removeEventListener('hashchange', handleUrlRoute);
    };
  }, []);

  const navigateTo = (route: 'dashboard' | 'admin') => {
    setActiveRoute(route);
    if (route === 'admin') {
      window.history.pushState(null, '', '/admin');
    } else {
      window.history.pushState(null, '', '/');
    }
  };

  const fetchDashboardData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch('/api/dashboard');
      if (res.ok) {
        const data = await res.json();
        if (data.bot) setBotInfo(data.bot);
        if (data.stats) {
          setStats(data.stats);
          setMysqlInfo((prev) => ({
            ...prev,
            connected: data.stats.mysqlConnected !== undefined ? Boolean(data.stats.mysqlConnected) : prev.connected,
            database: data.stats.databaseName || prev.database,
            user: data.stats.databaseUser || prev.user,
          }));
        }
        if (data.users) setUsers(data.users);
        const now = new Date();
        setLastSyncedTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    } catch (e) {
      console.error('Failed to load dashboard data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(text);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const formatDate = (timestamp: number) => {
    if (!timestamp) return '—';
    const date = new Date(timestamp);
    return date.toLocaleDateString('bn-BD', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Flatten all projects into an asset ledger list
  const allProjects = useMemo(() => {
    const list: Array<ProjectItem & { owner: UserGroup }> = [];
    users.forEach((u) => {
      u.projects.forEach((p) => {
        list.push({ ...p, owner: u });
      });
    });
    return list.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
  }, [users]);

  // Unique frameworks for filter
  const frameworks = useMemo(() => {
    const set = new Set<string>();
    allProjects.forEach((p) => {
      if (p.framework) set.add(p.framework);
    });
    return Array.from(set);
  }, [allProjects]);

  // Filtered Assets
  const filteredProjects = useMemo(() => {
    return allProjects.filter((p) => {
      if (frameworkFilter !== 'all' && p.framework !== frameworkFilter) return false;
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      const matchName = p.project_name.toLowerCase().includes(q);
      const matchUrl = p.live_url.toLowerCase().includes(q);
      const matchOwnerName = p.owner.display_name.toLowerCase().includes(q);
      const matchOwnerUser = p.owner.username.toLowerCase().includes(q);
      const matchOwnerId = String(p.owner.telegram_id).includes(q);
      return matchName || matchUrl || matchOwnerName || matchOwnerUser || matchOwnerId;
    });
  }, [allProjects, searchQuery, frameworkFilter]);

  // Filtered Clients
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchName = u.display_name.toLowerCase().includes(q);
      const matchUsername = u.username.toLowerCase().includes(q);
      const matchId = String(u.telegram_id).includes(q);
      const matchProj = u.projects.some((p) => p.project_name.toLowerCase().includes(q) || p.live_url.toLowerCase().includes(q));
      return matchName || matchUsername || matchId || matchProj;
    });
  }, [users, searchQuery]);

  // Framework color badge helper
  const getFrameworkColor = (framework: string) => {
    const fw = (framework || '').toLowerCase();
    if (fw.includes('react')) return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-cyan-500/10';
    if (fw.includes('vite')) return 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-purple-500/10';
    if (fw.includes('next')) return 'bg-slate-200/20 text-slate-100 border-slate-300/40 shadow-white/5';
    if (fw.includes('vue')) return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-emerald-500/10';
    if (fw.includes('astro')) return 'bg-orange-500/20 text-orange-300 border-orange-500/40 shadow-orange-500/10';
    return 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-amber-500/10';
  };

  // Admin Login Handler
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secretKeyInput.trim()) return;
    setAdminLoginError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secretKey: secretKeyInput }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem('admin_token', secretKeyInput);
        setAdminToken(secretKeyInput);
        setSecretKeyInput('');
        setAdminNotification({ type: 'success', message: 'এডমিন লগইন সফল হয়েছে!' });
      } else {
        setAdminLoginError(data.error || 'ভুল এডমিন সিক্রেট কী');
      }
    } catch (e) {
      setAdminLoginError('লগইন ব্যর্থ হয়েছে, পুনরায় চেষ্টা করুন।');
    }
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('admin_token');
    setAdminToken(null);
    setAdminNotification(null);
  };

  // Perform Admin Action
  const triggerAdminAction = async (action: string, payload: any) => {
    if (!adminToken) return;
    setAdminActionLoading(action + JSON.stringify(payload));
    setAdminNotification(null);

    try {
      const res = await fetch('/api/admin/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secretKey: adminToken,
          action,
          payload,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAdminNotification({ type: 'success', message: data.message || 'অ্যাকশন সফল হয়েছে' });
        await fetchDashboardData();
      } else {
        setAdminNotification({ type: 'error', message: data.error || 'অ্যাকশন সম্পন্ন করা যায়নি' });
      }
    } catch (err: any) {
      setAdminNotification({ type: 'error', message: err.message || 'সার্ভার সমস্যা' });
    } finally {
      setAdminActionLoading(null);
    }
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastText.trim()) return;
    await triggerAdminAction('broadcast', { message: broadcastText.trim() });
    setBroadcastText('');
  };

  return (
    <div className="min-h-screen bg-[#07090e] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/20 via-[#07090e] to-[#04060a] text-slate-100 flex flex-col antialiased selection:bg-cyan-500/30 selection:text-cyan-200 font-sans">
      {/* Responsive Colorful Global Ticker Tape Bar */}
      <div className="w-full bg-[#0a0e17]/95 border-b border-white/[0.08] text-[10px] sm:text-[11px] font-mono tracking-tight text-slate-400 py-1 sm:py-1.5 px-3 sm:px-4 overflow-x-auto whitespace-nowrap scrollbar-none shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 sm:gap-6">
          <div className="flex items-center gap-4 sm:gap-6">
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold shrink-0">
              <span className="w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full bg-emerald-400 animate-pulse shadow-lg shadow-emerald-400/50"></span>
              BOT ENGINE: LIVE
            </span>
            <span className="text-slate-600">/</span>
            <span className="text-cyan-300 shrink-0">
              SITES: <strong className="text-white font-mono">{stats.totalProjects}</strong>
            </span>
            <span className="text-slate-600">/</span>
            <span className="text-purple-300 shrink-0">
              USERS: <strong className="text-white font-mono">{stats.totalUsers}</strong>
            </span>
            <span className="text-slate-600">/</span>
            <span className="text-amber-300 shrink-0">
              DB: <strong className="text-amber-400">cPanel MySQL (lalmoni1_ai)</strong>
            </span>
            <span className="text-slate-600">/</span>
            <span className="text-emerald-300 shrink-0">
              ROLLBACK GUARD: <strong className="text-emerald-400">AUTO-PURGE</strong>
            </span>
          </div>
          <div className="flex items-center gap-3 text-slate-400 hidden lg:flex font-mono">
            <span className="text-cyan-400">SYNC: {lastSyncedTime}</span>
            <span className="text-slate-700">|</span>
            <span className="text-slate-300">Vercel Edge Global Mesh</span>
          </div>
        </div>
      </div>

      {/* Main Responsive Header (Mobile Optimized) */}
      <header className="sticky top-0 z-40 bg-[#07090e]/95 backdrop-blur-xl border-b border-white/[0.08] shadow-xl">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 sm:h-18 flex items-center justify-between gap-2.5 sm:gap-4">
          {/* Telegram Bot Logo + Bot Name + Bot Username */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            <div className="relative group shrink-0">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500 rounded-full blur opacity-50 group-hover:opacity-80 transition duration-300"></div>
              {!botAvatarError ? (
                <img
                  src={botInfo.avatar_url}
                  alt={botInfo.name}
                  onError={() => setBotAvatarError(true)}
                  className="relative w-9 h-9 sm:w-11 sm:h-11 rounded-full object-cover border-2 border-cyan-400/60 shadow-lg shadow-cyan-500/20"
                />
              ) : (
                <div className="relative w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-600 border-2 border-cyan-400/60 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                  <Bot className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
              )}
              <span className="absolute bottom-0 right-0 w-2.5 sm:w-3 h-2.5 sm:h-3 rounded-full bg-emerald-400 border-2 border-[#07090e] shadow-sm"></span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="text-xs sm:text-lg font-black tracking-tight text-white truncate max-w-[150px] xs:max-w-[220px] sm:max-w-none">
                  {botInfo.name}
                </h1>
                <span className="text-[9px] sm:text-[10px] font-mono px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-semibold shadow-sm shrink-0">
                  FREE
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <a
                  href={botInfo.telegram_link}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] sm:text-xs font-mono text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1 font-semibold truncate transition"
                >
                  <span>@{botInfo.username}</span>
                  <ExternalLink className="w-2.5 sm:w-3 h-2.5 sm:h-3 text-cyan-400/80 shrink-0" />
                </a>
              </div>
            </div>
          </div>

          {/* Right Header Action Buttons: Telegram Direct Launch & Sync */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <a
              href={botInfo.telegram_link}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-medium text-xs shadow-md shadow-sky-500/20 transition active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">টেলিগ্রাম বটে যান</span>
              <span className="sm:hidden text-[11px]">বট</span>
            </a>

            <button
              onClick={() => fetchDashboardData(true)}
              disabled={refreshing}
              className="p-1.5 sm:p-2.5 rounded-xl bg-[#0e1422] border border-white/[0.1] hover:border-cyan-500/40 text-slate-300 hover:text-white transition active:scale-95 shadow-sm"
              title="রিলোড করুন"
            >
              <RefreshCw className={`w-3.5 sm:w-4 h-3.5 sm:h-4 ${refreshing ? 'animate-spin text-cyan-400' : 'text-slate-400'}`} />
            </button>
          </div>
        </div>
      </header>

      {/* System Notification Toast */}
      {adminNotification && (
        <div className="max-w-7xl mx-auto w-full px-3 sm:px-4 pt-3 sm:pt-4">
          <div
            className={`p-3 sm:p-3.5 rounded-xl border flex items-center justify-between text-xs font-mono shadow-xl ${
              adminNotification.type === 'success'
                ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-200'
                : 'bg-rose-950/70 border-rose-500/50 text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {adminNotification.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{adminNotification.message}</span>
            </div>
            <button
              onClick={() => setAdminNotification(null)}
              className="text-slate-400 hover:text-white ml-2 text-xs"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ROUTE 1: COLORFUL RESPONSIVE PUBLIC DASHBOARD                             */}
      {/* ========================================================================= */}
      {activeRoute === 'dashboard' && (
        <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-8">
          {/* Hero Colorful Showcase Card (Responsive Mobile Layout) */}
          <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900/90 via-indigo-950/40 to-slate-900/90 border border-white/[0.1] p-4 sm:p-7 shadow-xl">
            <div className="absolute top-0 right-1/4 w-48 sm:w-72 h-48 sm:h-72 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-1/3 w-48 sm:w-72 h-48 sm:h-72 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative z-10 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 sm:gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-[10px] sm:text-xs font-mono font-medium shadow-sm">
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  <span>লাইভ ক্লাউড হোস্ট ও ডেপ্লয়মেন্ট ডাটাবেজ</span>
                </div>
                <h2 className="text-xl sm:text-3xl font-black text-white tracking-tight leading-snug">
                  <span className="bg-gradient-to-r from-emerald-400 via-cyan-300 to-blue-400 bg-clip-text text-transparent">
                    {botInfo.name}
                  </span>{' '}
                  ড্যাশবোর্ড
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                  টেলিগ্রামের মাধ্যমে সরাসরি আপনার যে কোনো ওয়েবসাইট (React, Vite, Next.js, HTML) এক ক্লিকে সম্পূর্ণ ফ্রিতে লাইভ করুন। পূর্বের ফায়ারবেস থেকে সমস্ত ইউজার একাউন্ট ও লাইভ প্রজেক্ট সফলভাবে এই নতুন প্যানেলে সিঙ্ক করা হয়েছে।
                </p>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-1 text-[10px] sm:text-xs font-mono">
                  <span className="flex items-center gap-1.5 text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>১৩ টি সক্রিয় ওয়েবসাইট</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-cyan-400 bg-cyan-950/40 border border-cyan-500/30 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg">
                    <Users className="w-3 h-3 text-cyan-400" />
                    <span>৩৩ জন ইউজার</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-purple-400 bg-purple-950/40 border border-purple-500/30 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg">
                    <Database className="w-3 h-3 text-purple-400" />
                    <span>cPanel MySQL সিঙ্কড</span>
                  </span>
                </div>
              </div>

              {/* Bot Profile Card Showcase */}
              <div className="bg-[#0d121f]/90 border border-cyan-500/30 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-lg flex flex-row md:flex-col items-center justify-between md:justify-center text-left md:text-center gap-3 shrink-0">
                <div className="flex items-center md:flex-col gap-3 md:gap-2">
                  <div className="relative shrink-0">
                    <img
                      src={botInfo.avatar_url}
                      alt={botInfo.name}
                      className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-cyan-400 shadow-md shadow-cyan-500/30"
                    />
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#0d121f]"></span>
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-white truncate max-w-[130px] sm:max-w-none">{botInfo.name}</div>
                    <div className="text-[11px] sm:text-xs font-mono text-cyan-400 font-semibold">@{botInfo.username}</div>
                  </div>
                </div>

                <a
                  href={botInfo.telegram_link}
                  target="_blank"
                  rel="noreferrer"
                  className="py-1.5 px-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-[11px] sm:text-xs font-semibold shadow-md shrink-0 transition"
                >
                  মেসেজ পাঠান
                </a>
              </div>
            </div>
          </section>

          {/* COLORFUL GLOWING METRIC CARDS (Mobile 2x2 Grid, Desktop 4 Columns) */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            {/* Card 1: Emerald Neon Glow (Total Projects) */}
            <div className="bg-gradient-to-br from-emerald-950/40 via-slate-900/80 to-[#0b0e17] border border-emerald-500/30 hover:border-emerald-400/60 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 relative overflow-hidden transition-all duration-300 shadow-md group">
              <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                <span className="text-[10px] sm:text-[11px] font-mono tracking-wider uppercase text-emerald-400 font-semibold truncate">
                  লাইভ ওয়েবসাইট
                </span>
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                  <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2 my-0.5 sm:my-1">
                <span className="text-2xl sm:text-4xl font-black font-mono text-white tracking-tight">
                  {stats.totalProjects}
                </span>
                <span className="text-[10px] sm:text-xs font-mono text-emerald-400 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  সচল
                </span>
              </div>
              <div className="mt-2 sm:mt-3 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-300 font-mono pt-2 sm:pt-3 border-t border-emerald-500/20">
                <span className="truncate">Vercel Edge</span>
                <span className="text-emerald-400 font-bold shrink-0">13 Sites</span>
              </div>
            </div>

            {/* Card 2: Cyan & Sky Blue Glow (Telegram Users) */}
            <div className="bg-gradient-to-br from-cyan-950/40 via-slate-900/80 to-[#0b0e17] border border-cyan-500/30 hover:border-cyan-400/60 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 relative overflow-hidden transition-all duration-300 shadow-md group">
              <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                <span className="text-[10px] sm:text-[11px] font-mono tracking-wider uppercase text-cyan-400 font-semibold truncate">
                  টেলিগ্রাম ইউজার
                </span>
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
                  <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2 my-0.5 sm:my-1">
                <span className="text-2xl sm:text-4xl font-black font-mono text-white tracking-tight">
                  {stats.totalUsers}
                </span>
                <span className="text-[10px] sm:text-xs font-mono text-cyan-400 font-bold truncate">
                  একাউন্ট
                </span>
              </div>
              <div className="mt-2 sm:mt-3 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-300 font-mono pt-2 sm:pt-3 border-t border-cyan-500/20">
                <span className="truncate">নির্মাতা</span>
                <span className="text-cyan-400 font-bold shrink-0">{users.filter((u) => u.project_count > 0).length} জন সক্রিয়</span>
              </div>
            </div>

            {/* Card 3: Radiant Amber & Gold Glow (Deployments) */}
            <div className="bg-gradient-to-br from-amber-950/40 via-slate-900/80 to-[#0b0e17] border border-amber-500/30 hover:border-amber-400/60 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 relative overflow-hidden transition-all duration-300 shadow-md group">
              <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                <span className="text-[10px] sm:text-[11px] font-mono tracking-wider uppercase text-amber-400 font-semibold truncate">
                  আজকের বিল্ড
                </span>
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                  <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2 my-0.5 sm:my-1">
                <span className="text-2xl sm:text-4xl font-black font-mono text-white tracking-tight">
                  {stats.todayDeployments}
                </span>
                <span className="text-[10px] sm:text-xs font-mono text-amber-400 font-bold">
                  আজকে
                </span>
              </div>
              <div className="mt-2 sm:mt-3 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-300 font-mono pt-2 sm:pt-3 border-t border-amber-500/20">
                <span className="truncate">চার্জ</span>
                <span className="text-emerald-400 font-bold font-mono shrink-0">$0.00 ফ্রি</span>
              </div>
            </div>

            {/* Card 4: Vivid Purple & Fuchsia Glow (System SLA) */}
            <div className="bg-gradient-to-br from-purple-950/40 via-slate-900/80 to-[#0b0e17] border border-purple-500/30 hover:border-purple-400/60 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 relative overflow-hidden transition-all duration-300 shadow-md group">
              <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                <span className="text-[10px] sm:text-[11px] font-mono tracking-wider uppercase text-purple-400 font-semibold truncate">
                  আপটাইম ও রোলব্যাক
                </span>
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shrink-0">
                  <Server className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2 my-0.5 sm:my-1">
                <span className="text-2xl sm:text-4xl font-black font-mono text-white tracking-tight">
                  ৯৯.৯%
                </span>
                <span className="text-[10px] sm:text-xs font-mono text-purple-400 font-bold">
                  সক্রিয়
                </span>
              </div>
              <div className="mt-2 sm:mt-3 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-300 font-mono pt-2 sm:pt-3 border-t border-purple-500/20">
                <span className="truncate">রোলব্যাক</span>
                <span className="text-emerald-400 font-bold shrink-0">অটো ডিলিট</span>
              </div>
            </div>
          </section>

          {/* Interactive Navigation Segmented Bar (Mobile-Friendly) */}
          <div className="space-y-3 border-b border-white/[0.08] pb-3 sm:pb-4">
            {/* Colorful Segmented Tabs (Grid on mobile, flex on desktop) */}
            <div className="grid grid-cols-3 sm:flex items-center gap-1 sm:gap-1.5 p-1 sm:p-1.5 bg-[#0d121e] border border-white/[0.08] rounded-xl shadow-inner">
              <button
                onClick={() => setActiveTab('assets')}
                className={`flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-lg text-xs font-mono font-bold transition ${
                  activeTab === 'assets'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">সাইট ({allProjects.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('clients')}
                className={`flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-lg text-xs font-mono font-bold transition ${
                  activeTab === 'clients'
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">ইউজার ({users.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('telemetry')}
                className={`flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-lg text-xs font-mono font-bold transition ${
                  activeTab === 'telemetry'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Radio className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">সার্ভার</span>
              </button>
            </div>

            {/* Search & Framework Filter */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ইউজার আইডি, নাম, বা সাইটের নাম..."
                  className="w-full bg-[#0d121e] border border-cyan-500/30 focus:border-cyan-400 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-400 font-sans transition shadow-inner"
                />
              </div>

              {activeTab === 'assets' && frameworks.length > 0 && (
                <select
                  value={frameworkFilter}
                  onChange={(e) => setFrameworkFilter(e.target.value)}
                  className="bg-[#0d121e] border border-white/[0.1] rounded-xl px-2.5 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-400 shrink-0"
                >
                  <option value="all">সকল</option>
                  {frameworks.map((fw) => (
                    <option key={fw} value={fw}>
                      {fw}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* TAB 1: ASSET LEDGER (MOBILE CARD FEED + DESKTOP TABLE) */}
          {activeTab === 'assets' && (
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between text-[11px] sm:text-xs font-mono text-slate-400 px-1">
                <span>মোট প্রাপ্ত ওয়েবসাইট: <strong className="text-emerald-400">{filteredProjects.length} টি</strong></span>
                <span className="text-cyan-400">লাইভ লিঙ্ক সক্রিয়</span>
              </div>

              {/* MOBILE CARD VIEW (Shown on < 768px screens for flawless mobile UX) */}
              <div className="block md:hidden space-y-3">
                {filteredProjects.length === 0 ? (
                  <div className="bg-[#0b0e17] border border-white/[0.08] rounded-xl p-8 text-center text-slate-500 text-xs font-mono">
                    কোনো ওয়েবসাইট খুঁজে পাওয়া যায়নি।
                  </div>
                ) : (
                  filteredProjects.map((p) => {
                    const avatarErr = avatarErrors[p.owner.telegram_id];
                    const avatarSrc = !avatarErr ? p.owner.avatar_url : null;
                    const fwStyle = getFrameworkColor(p.framework);

                    return (
                      <div
                        key={p.project_id}
                        className="bg-gradient-to-br from-[#0e1422] to-[#0a0d17] border border-white/[0.08] hover:border-emerald-500/40 rounded-xl p-3.5 space-y-3 shadow-md"
                      >
                        {/* Top: Project Name + Framework Badge */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
                              <h3 className="font-bold text-white text-sm truncate">
                                {p.project_name}
                              </h3>
                            </div>
                            <a
                              href={p.live_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-cyan-400 hover:underline font-mono truncate block mt-0.5"
                            >
                              {p.live_url.replace(/^https?:\/\//, '')}
                            </a>
                          </div>

                          <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border shrink-0 ${fwStyle}`}>
                            {p.framework || 'Static'}
                          </span>
                        </div>

                        {/* Middle: User Identity */}
                        <div className="flex items-center justify-between text-xs bg-[#07090e]/70 rounded-lg p-2 border border-white/[0.04]">
                          <div className="flex items-center gap-2 min-w-0">
                            {avatarSrc ? (
                              <img
                                src={avatarSrc}
                                alt={p.owner.display_name}
                                onError={() => setAvatarErrors((prev) => ({ ...prev, [p.owner.telegram_id]: true }))}
                                className="w-6 h-6 rounded-full object-cover border border-cyan-400/50 shrink-0"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-slate-800 text-[10px] flex items-center justify-center font-bold text-white shrink-0">
                                {p.owner.display_name.charAt(0) || 'U'}
                              </div>
                            )}
                            <div className="truncate">
                              <span className="font-semibold text-white truncate text-xs block">{p.owner.display_name}</span>
                              <span className="text-[10px] text-slate-400 font-mono block">
                                {p.owner.username ? `@${p.owner.username}` : `ID: #${p.owner.telegram_id}`}
                              </span>
                            </div>
                          </div>

                          <span className="text-[10px] text-slate-400 font-mono shrink-0">
                            {formatDate(p.created_at)}
                          </span>
                        </div>

                        {/* Bottom Actions: Copy & Visit buttons */}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            onClick={() => copyToClipboard(p.live_url)}
                            className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 text-xs font-semibold transition active:scale-95"
                          >
                            {copiedUrl === p.live_url ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-emerald-400">কপি হয়েছে</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>কপি লিঙ্ক</span>
                              </>
                            )}
                          </button>

                          <a
                            href={p.live_url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-center gap-1 py-1.5 px-3 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 transition active:scale-95"
                          >
                            <span>ভিজিট</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* DESKTOP TABLE VIEW (Shown on >= 768px screens) */}
              <div className="hidden md:block bg-[#0b0e17] border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-sans border-collapse">
                    <thead>
                      <tr className="border-b border-white/[0.08] bg-[#0e1422] text-slate-300 text-[11px] font-mono uppercase tracking-wider">
                        <th className="py-3.5 px-4 font-semibold">ওয়েবসাইট ও লিঙ্ক</th>
                        <th className="py-3.5 px-4 font-semibold">টেলিগ্রাম ইউজার প্রোফাইল</th>
                        <th className="py-3.5 px-4 font-semibold">ফ্রেমওয়ার্ক</th>
                        <th className="py-3.5 px-4 font-semibold">তৈরির তারিখ</th>
                        <th className="py-3.5 px-4 font-semibold text-right">অ্যাকশন</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.05]">
                      {filteredProjects.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-slate-500 font-mono">
                            কোনো ওয়েবসাইট খুঁজে পাওয়া যায়নি।
                          </td>
                        </tr>
                      ) : (
                        filteredProjects.map((p) => {
                          const avatarErr = avatarErrors[p.owner.telegram_id];
                          const avatarSrc = !avatarErr ? p.owner.avatar_url : null;
                          const fwStyle = getFrameworkColor(p.framework);

                          return (
                            <tr key={p.project_id} className="hover:bg-white/[0.03] transition-colors group">
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-3.5">
                                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 via-teal-500/20 to-slate-900 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-sm">
                                    <Globe className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-white text-sm group-hover:text-emerald-300 transition-colors">
                                        {p.project_name}
                                      </span>
                                      <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block shadow-sm shadow-emerald-400"></span>
                                    </div>
                                    <a
                                      href={p.live_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-xs text-cyan-400 hover:text-cyan-300 hover:underline transition-colors truncate max-w-xs block font-mono mt-0.5"
                                    >
                                      {p.live_url.replace(/^https?:\/\//, '')}
                                    </a>
                                  </div>
                                </div>
                              </td>

                              <td className="py-4 px-4">
                                <div className="flex items-center gap-3">
                                  {avatarSrc ? (
                                    <img
                                      src={avatarSrc}
                                      alt={p.owner.display_name}
                                      onError={() =>
                                        setAvatarErrors((prev) => ({ ...prev, [p.owner.telegram_id]: true }))
                                      }
                                      className="w-8 h-8 rounded-full object-cover border-2 border-cyan-400/60 shadow-md shrink-0"
                                    />
                                  ) : (
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-600 border border-cyan-400/50 flex items-center justify-center text-xs font-bold text-white shrink-0">
                                      {p.owner.display_name.charAt(0) || 'U'}
                                    </div>
                                  )}
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-white font-semibold text-xs">
                                        {p.owner.display_name}
                                      </span>
                                      {p.owner.verified && (
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                      )}
                                    </div>
                                    <div className="text-[11px] text-cyan-300/80 font-mono">
                                      {p.owner.username ? `@${p.owner.username}` : `ID: #${p.owner.telegram_id}`}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              <td className="py-4 px-4">
                                <span className={`text-xs font-mono font-semibold px-2.5 py-1 rounded-lg border shadow-sm ${fwStyle}`}>
                                  {p.framework || 'Vercel Static'}
                                </span>
                              </td>

                              <td className="py-4 px-4 text-slate-300 text-xs font-mono">
                                {formatDate(p.created_at)}
                              </td>

                              <td className="py-4 px-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => copyToClipboard(p.live_url)}
                                    className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white transition active:scale-95"
                                    title="লিঙ্ক কপি করুন"
                                  >
                                    {copiedUrl === p.live_url ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>

                                  <a
                                    href={p.live_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/25 transition active:scale-95"
                                  >
                                    <span>ভিজিট</span>
                                    <ArrowUpRight className="w-3.5 h-3.5" />
                                  </a>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CLIENT DIRECTORY (RESPONSIVE USER CARDS) */}
          {activeTab === 'clients' && (
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between text-[11px] sm:text-xs font-mono text-slate-400 px-1">
                <span>মোট ইউজার: <strong className="text-cyan-400">{filteredUsers.length} জন</strong></span>
                <span className="text-emerald-400">প্রোফাইল ও ইউজারনেম সিঙ্কড</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {filteredUsers.map((u) => {
                  const avatarErr = avatarErrors[u.telegram_id];
                  const avatarSrc = !avatarErr ? u.avatar_url : null;

                  return (
                    <div
                      key={u.telegram_id}
                      className="bg-gradient-to-br from-[#0e1422] to-[#0a0d17] border border-white/[0.08] hover:border-cyan-500/50 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 transition-all shadow-lg flex flex-col justify-between space-y-3 sm:space-y-4 group"
                    >
                      {/* Identity Card Header */}
                      <div className="flex items-start gap-3">
                        <div className="relative shrink-0">
                          {avatarSrc ? (
                            <img
                              src={avatarSrc}
                              alt={u.display_name}
                              onError={() => setAvatarErrors((prev) => ({ ...prev, [u.telegram_id]: true }))}
                              className="w-11 h-11 sm:w-13 sm:h-13 rounded-full object-cover border-2 border-cyan-400 shadow-md shadow-cyan-500/20"
                            />
                          ) : (
                            <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 border-2 border-cyan-400/50 flex items-center justify-center text-sm sm:text-base font-black text-white shadow-lg">
                              {u.display_name.charAt(0) || 'U'}
                            </div>
                          )}
                          <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0e1422]"></span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-cyan-300 transition-colors">
                              {u.display_name}
                            </h4>
                            {u.verified && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                          </div>
                          <div className="text-[11px] sm:text-xs font-mono text-cyan-400 font-medium truncate">
                            {u.username ? `@${u.username}` : 'No username'}
                          </div>
                          <div className="text-[10px] sm:text-[11px] font-mono text-slate-400 mt-0.5">
                            Telegram ID: <span className="text-slate-200 font-bold">#{u.telegram_id}</span>
                          </div>
                        </div>
                      </div>

                      {/* Portfolio Count Banner */}
                      <div className="bg-gradient-to-r from-cyan-950/40 via-slate-900 to-blue-950/40 rounded-xl p-2.5 sm:p-3 border border-cyan-500/20 text-xs font-mono flex items-center justify-between shadow-inner">
                        <span className="text-slate-300 font-medium text-[11px] sm:text-xs">হোস্টেড ওয়েবসাইট:</span>
                        <span className="text-emerald-400 font-black text-xs sm:text-sm px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30">
                          {u.project_count} টি প্রজেক্ট
                        </span>
                      </div>

                      {/* User's projects list preview */}
                      {u.projects.length > 0 ? (
                        <div className="space-y-1.5 sm:space-y-2">
                          {u.projects.slice(0, 3).map((p) => (
                            <a
                              key={p.project_id}
                              href={p.live_url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center justify-between text-xs p-2 rounded-xl bg-white/[0.03] hover:bg-emerald-500/10 border border-white/[0.05] hover:border-emerald-500/30 text-slate-200 hover:text-emerald-300 transition group/link"
                            >
                              <div className="flex items-center gap-1.5 sm:gap-2 truncate">
                                <Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <span className="truncate max-w-[150px] sm:max-w-[180px] font-semibold text-[11px] sm:text-xs">{p.project_name}</span>
                              </div>
                              <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover/link:text-emerald-400 shrink-0" />
                            </a>
                          ))}
                          {u.projects.length > 3 && (
                            <div className="text-[10px] sm:text-[11px] font-mono text-slate-400 text-right">
                              +{u.projects.length - 3} টি আরও প্রজেক্ট
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs font-mono text-slate-500 text-center py-2 bg-white/[0.02] rounded-xl border border-dashed border-white/[0.05]">
                          কোনো প্রজেক্ট নেই
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: INFRASTRUCTURE & MULTI-CLOUD TELEMETRY */}
          {activeTab === 'telemetry' && (
            <div className="space-y-4 sm:space-y-6">
              <div className="bg-[#0b0e17] border border-white/[0.08] rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl">
                <h3 className="text-xs sm:text-sm font-mono uppercase tracking-wider text-cyan-400 font-bold mb-3 sm:mb-4 flex items-center gap-2">
                  <Server className="w-4 h-4" />
                  <span>ক্লাউড সার্ভার ও ডাটাবেজ ইন্টিগ্রেশন স্ট্যাটাস</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                  {/* Vercel Edge */}
                  <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-gradient-to-br from-indigo-950/30 to-[#0e1422] border border-indigo-500/30 shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs sm:text-sm font-bold text-white">Vercel Edge Platform</span>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-slate-400 mb-2.5">
                      গ্লোবাল সার্ভারলেস নেটওয়ার্ক ও ফ্রি হোস্টিং ক্লাস্টার
                    </p>
                    <div className="text-[11px] sm:text-xs font-mono text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-500/30 p-2 rounded-lg">
                      STATUS: ONLINE (100% HEALTHY)
                    </div>
                  </div>

                  {/* GitHub API */}
                  <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-gradient-to-br from-cyan-950/30 to-[#0e1422] border border-cyan-500/30 shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs sm:text-sm font-bold text-white">GitHub REST API v3</span>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-slate-400 mb-2.5">
                      অটোমেটেড গিট রিপোজিটরি তৈরি ও ফাইল পুশ ইঞ্জিন
                    </p>
                    <div className="text-[11px] sm:text-xs font-mono text-cyan-400 font-bold bg-cyan-950/40 border border-cyan-500/30 p-2 rounded-lg">
                      STATUS: CONNECTED & SYNCED
                    </div>
                  </div>

                  {/* cPanel MySQL */}
                  <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-950/30 to-[#0e1422] border border-amber-500/30 shadow-lg flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                          <Database className="w-4 h-4 text-amber-400" />
                          <span>cPanel MySQL Database</span>
                        </span>
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            mysqlInfo.connected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                          }`}
                        ></span>
                      </div>
                      <p className="text-[11px] sm:text-xs text-slate-400 mb-1">
                        সার্ভার: <strong className="text-amber-200 font-mono">{mysqlInfo.host || 'lalmonirhatakmp.site'}</strong>
                      </p>
                      <p className="text-[11px] sm:text-xs text-slate-400 mb-2.5">
                        ডাটাবেজ: <strong className="text-amber-300 font-mono">{mysqlInfo.database || 'lalmoni1_ai'}</strong> ({mysqlInfo.user || 'lalmoni1_kshakilrana'})
                      </p>
                      <div className="text-[11px] sm:text-xs font-mono text-amber-400 font-bold bg-amber-950/40 border border-amber-500/30 p-2 rounded-lg mb-3">
                        {mysqlInfo.connected
                          ? `STATUS: CONNECTED (${stats.totalUsers} ইউজার + ${stats.totalProjects} প্রজেক্ট)`
                          : `STATUS: DISCONNECTED ${mysqlInfo.error ? `(${mysqlInfo.error})` : ''}`}
                      </div>
                    </div>
                    <button
                      onClick={handleConnectMySQL}
                      disabled={mysqlInfo.loading}
                      className="w-full py-1.5 px-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-xs font-mono font-semibold transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${mysqlInfo.loading ? 'animate-spin' : ''}`} />
                      <span>{mysqlInfo.loading ? 'কানেক্ট হচ্ছে...' : 'MySQL কানেক্ট / রিফ্রেশ'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      )}

      {/* ========================================================================= */}
      {/* ROUTE 2: RESPONSIVE ADMIN ROUTE (/admin or #admin)                         */}
      {/* ========================================================================= */}
      {activeRoute === 'admin' && (
        <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-6">
          {/* Admin Header with Exit Link */}
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3 sm:pb-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => navigateTo('dashboard')}
                className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-[#0e1422] border border-white/[0.08] text-xs font-mono text-slate-300 hover:text-white transition shadow-sm"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">মেইন ড্যাশবোর্ডে ফিরুন</span>
                <span className="sm:hidden">ড্যাশবোর্ড</span>
              </button>
              <div className="h-4 w-px bg-white/10 hidden sm:block"></div>
              <h2 className="text-xs sm:text-sm font-mono font-bold text-white tracking-wide uppercase truncate max-w-[150px] sm:max-w-none">
                এডমিন ভল্ট কন্ট্রোল
              </h2>
            </div>

            {adminToken && (
              <button
                onClick={handleAdminLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 hover:bg-rose-950/70 text-xs font-mono transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>লগআউট</span>
              </button>
            )}
          </div>

          {/* Admin Unauthenticated Screen */}
          {!adminToken ? (
            <div className="max-w-md mx-auto my-6 sm:my-12 bg-[#0b0e17] border border-purple-500/30 rounded-2xl p-5 sm:p-8 shadow-2xl">
              <div className="text-center mb-5 sm:mb-6">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-purple-950/60 border border-purple-500/40 text-purple-400 mx-auto flex items-center justify-center mb-3 shadow-inner">
                  <Lock className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <h3 className="text-base sm:text-lg font-mono font-bold text-white uppercase">
                  মাস্টার কী অথেন্টিকেশন
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-400 mt-1 font-mono">
                  এই রুটটি শুধুমাত্র এডমিনের জন্য সংরক্ষিত। আপনার সিক্রেট কী প্রদান করুন।
                </p>
              </div>

              {adminLoginError && (
                <div className="p-3 mb-4 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs font-mono flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{adminLoginError}</span>
                </div>
              )}

              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1.5">
                    মাস্টার সিক্রেট পাসওয়ার্ড
                  </label>
                  <input
                    type="password"
                    value={secretKeyInput}
                    onChange={(e) => setSecretKeyInput(e.target.value)}
                    placeholder="Enter secret key..."
                    className="w-full bg-[#07090e] border border-white/[0.1] focus:border-purple-500/60 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white placeholder-slate-600 focus:outline-none transition shadow-inner"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-mono text-xs font-bold tracking-wider transition active:scale-[0.99] shadow-lg shadow-purple-600/25"
                >
                  লগইন করুন ও কন্ট্রোল খুলুন
                </button>
              </form>
            </div>
          ) : (
            /* Admin Authenticated Dashboard */
            <div className="space-y-5 sm:space-y-8">
              {/* Broadcast Console */}
              <div className="bg-[#0b0e17] border border-emerald-500/30 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Send className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-xs font-mono font-bold uppercase text-white">
                      সমস্ত ইউজারের কাছে টেলিগ্রাম ব্রডকাস্ট
                    </h3>
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-mono text-cyan-400 font-semibold">
                    টার্গেট: {users.length} জন
                  </span>
                </div>
                <form onSubmit={handleBroadcast} className="space-y-3">
                  <textarea
                    value={broadcastText}
                    onChange={(e) => setBroadcastText(e.target.value)}
                    rows={3}
                    placeholder="৩৩ জন ইউজারের টেলিগ্রামে যা পাঠাতে চান তা লিখুন..."
                    className="w-full bg-[#07090e] border border-white/[0.08] focus:border-emerald-500/50 rounded-xl p-3 text-xs font-sans text-slate-200 placeholder-slate-600 focus:outline-none transition"
                  />
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                    <span className="text-[10px] sm:text-[11px] font-mono text-slate-500">
                      রেট-লিমিটেড ও স্বয়ংক্রিয়ভাবে ব্লকড অ্যাকাউন্ট এড়িয়ে চলবে।
                    </span>
                    <button
                      type="submit"
                      disabled={!broadcastText.trim() || adminActionLoading !== null}
                      className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white text-xs font-mono font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{adminActionLoading ? 'পাঠানো হচ্ছে...' : 'মেসেজ পাঠিয়ে দিন'}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* User Governance Ledger */}
              <div className="bg-[#0b0e17] border border-white/[0.08] rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-mono font-bold uppercase text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-cyan-400" />
                    <span>ইউজার নিয়ন্ত্রণ ও পারমিশন</span>
                  </h3>
                  <span className="text-xs font-mono text-slate-400">{users.length} জন</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono border-collapse min-w-[500px]">
                    <thead>
                      <tr className="border-b border-white/[0.06] text-slate-400 text-[11px]">
                        <th className="py-2.5 px-3">প্রোফাইল</th>
                        <th className="py-2.5 px-3">টেলিগ্রাম আইডি</th>
                        <th className="py-2.5 px-3">স্ট্যাটাস</th>
                        <th className="py-2.5 px-3">প্রজেক্ট</th>
                        <th className="py-2.5 px-3 text-right">অ্যাকশন</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {users.map((u) => (
                        <tr key={u.telegram_id} className="hover:bg-white/[0.02]">
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              {u.avatar_url && !avatarErrors[u.telegram_id] ? (
                                <img
                                  src={u.avatar_url}
                                  alt={u.display_name}
                                  onError={() => setAvatarErrors((p) => ({ ...p, [u.telegram_id]: true }))}
                                  className="w-7 h-7 rounded-full object-cover border border-cyan-400/40 shrink-0"
                                />
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-[10px] shrink-0">
                                  {u.display_name.charAt(0)}
                                </div>
                              )}
                              <span className="font-semibold text-white truncate max-w-[120px]">{u.display_name}</span>
                              {u.username && <span className="text-cyan-400 text-[10px] hidden sm:inline">@{u.username}</span>}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-slate-400">#{u.telegram_id}</td>
                          <td className="py-3 px-3">
                            {u.banned ? (
                              <span className="text-rose-400 text-[10px] font-bold">ব্যানড</span>
                            ) : u.verified ? (
                              <span className="text-emerald-400 text-[10px] font-bold">ভেরিফাইড</span>
                            ) : (
                              <span className="text-slate-400 text-[10px]">সক্রিয়</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-slate-300 font-bold">{u.project_count}</td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {/* Toggle Ban */}
                              <button
                                onClick={() =>
                                  triggerAdminAction('ban_user', {
                                    targetId: u.telegram_id,
                                    banned: !u.banned,
                                  })
                                }
                                className={`px-2 py-1 rounded text-[10px] font-bold border transition ${
                                  u.banned
                                    ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                                    : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                                }`}
                              >
                                {u.banned ? 'UNBAN' : 'BAN'}
                              </button>

                              {/* Toggle Verify */}
                              <button
                                onClick={() =>
                                  triggerAdminAction('verify_user', {
                                    targetId: u.telegram_id,
                                    verified: !u.verified,
                                  })
                                }
                                className="px-2 py-1 rounded text-[10px] font-bold bg-slate-800 border border-white/10 text-slate-300 hover:text-white transition"
                              >
                                {u.verified ? 'UNVERIFY' : 'VERIFY'}
                              </button>

                              {/* Reset Limit */}
                              <button
                                onClick={() =>
                                  triggerAdminAction('reset_limit', { targetId: u.telegram_id })
                                }
                                className="px-2 py-1 rounded text-[10px] font-bold bg-blue-950/40 border border-blue-500/30 text-blue-300 transition"
                              >
                                RESET
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Project Management Ledger */}
              <div className="bg-[#0b0e17] border border-white/[0.08] rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-mono font-bold uppercase text-white flex items-center gap-2">
                    <FolderGit2 className="w-4 h-4 text-emerald-400" />
                    <span>প্রজেক্ট ম্যানেজমেন্ট</span>
                  </h3>
                  <span className="text-xs font-mono text-slate-400">{allProjects.length} টি প্রজেক্ট</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono border-collapse min-w-[500px]">
                    <thead>
                      <tr className="border-b border-white/[0.06] text-slate-400 text-[11px]">
                        <th className="py-2.5 px-3">প্রজেক্ট নাম</th>
                        <th className="py-2.5 px-3">মালিক</th>
                        <th className="py-2.5 px-3">ইউআরএল</th>
                        <th className="py-2.5 px-3 text-right">ডিলিট</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {allProjects.map((p) => (
                        <tr key={p.project_id} className="hover:bg-white/[0.02]">
                          <td className="py-3 px-3 font-bold text-white truncate max-w-[120px]">{p.project_name}</td>
                          <td className="py-3 px-3 text-slate-400 truncate max-w-[120px]">{p.owner.display_name}</td>
                          <td className="py-3 px-3">
                            <a
                              href={p.live_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-cyan-400 hover:underline truncate max-w-[150px] block"
                            >
                              {p.live_url}
                            </a>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => {
                                if (window.confirm(`আপনি কি সত্যিই "${p.project_name}" মুছে ফেলতে চান?`)) {
                                  triggerAdminAction('delete_project', { projectId: p.project_id });
                                }
                              }}
                              className="px-2.5 py-1 rounded bg-rose-950/50 border border-rose-500/40 text-rose-300 hover:bg-rose-900/60 font-bold transition text-[11px]"
                            >
                              DELETE
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      )}

      {/* Responsive Colorful Footer */}
      <footer className="border-t border-white/[0.08] py-4 sm:py-6 px-4 text-center text-[10px] sm:text-xs font-mono text-slate-400 mt-auto bg-[#07090e]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="font-bold text-white">{botInfo.name}</span>
            <span className="text-cyan-400">(@{botInfo.username})</span>
          </div>
          <span className="text-slate-500">
            Powered by Vercel Edge Serverless · GitHub v3 · cPanel MySQL (lalmoni1_ai)
          </span>
          <span className="text-emerald-400 font-semibold">
            Auto-Rollback Guard Active
          </span>
        </div>
      </footer>
    </div>
  );
}
