import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { api } from '../api';

interface AppInfo {
  id: string;
  name: string;
  icon: string | null;
  description: string;
  botPublic: boolean;
  botRequireCodeGrant: boolean;
  inviteUrl: string;
}

const STORAGE_KEY = 'discord_imported_apps';

function loadSavedApps(): AppInfo[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveApps(apps: AppInfo[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(apps));
}

export function DiscordApps() {
  const { user, guilds, isAuthenticated, login, loading: authLoading, oauthConfigured } = useAuth();
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [app, setApp] = useState<AppInfo | null>(null);
  const [error, setError] = useState('');
  const [apps, setApps] = useState<AppInfo[]>(loadSavedApps);
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    saveApps(apps);
  }, [apps]);

  const handleLogin = async () => {
    setLoginLoading(true);
    const result = await login();
    if (result.error) {
      setError(result.error);
    }
    setLoginLoading(false);
  };

  const fetchApp = async () => {
    if (!token.trim()) {
      setError('请输入 Bot Token');
      return;
    }
    setLoading(true);
    setError('');
    setApp(null);
    try {
      const res = await api.post('/auth/fetch-app', { token: token.trim() });
      const fetchedApp = res.data.app as AppInfo;
      setApp(fetchedApp);
      setApps((prev) => {
        const exists = prev.find((a) => a.id === fetchedApp.id);
        if (exists) return prev;
        return [...prev, fetchedApp];
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '未知错误';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const removeApp = (id: string) => {
    setApps((prev) => prev.filter((a) => a.id !== id));
  };

  const getIconUrl = (app: AppInfo) => {
    if (!app.icon) return null;
    return `https://cdn.discordapp.com/app-icons/${app.id}/${app.icon}.png`;
  };

  const getAvatarUrl = (u: { id: string; avatar: string | null }) => {
    if (!u.avatar) return null;
    return `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=64`;
  };

  const getGuildIcon = (g: { id: string; icon: string | null }) => {
    if (!g.icon) return null;
    return `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=64`;
  };

  if (authLoading) {
    return (
      <div className="max-w-4xl mx-auto text-center text-gray-400 py-20">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        加载中...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Discord 应用</h1>

      {/* ====== OAuth2 登录区域 ====== */}
      {!isAuthenticated ? (
        <div className="bg-gradient-to-r from-[#5865F2]/20 to-[#4752c4]/10 border border-[#5865F2]/30 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#5865F2]/30 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-[#5865F2]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-white">登录 Discord 账号</h2>
              <p className="text-sm text-gray-400 mt-1">
                授权登录后可以查看你的 Discord 服务器列表，方便管理 Bot。
              </p>
            </div>
            {oauthConfigured ? (
              <button
                onClick={handleLogin}
                disabled={loginLoading}
                className="px-6 py-2.5 bg-[#5865F2] hover:bg-[#4752c4] disabled:opacity-50 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 flex-shrink-0"
              >
                {loginLoading ? '跳转中...' : '用 Discord 登录'}
              </button>
            ) : (
              <div className="text-sm text-yellow-400 flex-shrink-0">
                OAuth2 未配置
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* ====== 用户信息 ====== */}
          <div className="bg-gray-800 rounded-lg p-5 mb-6 border border-gray-700">
            <div className="flex items-center gap-4">
              {getAvatarUrl(user!) && (
                <img src={getAvatarUrl(user!)!} alt="" className="w-12 h-12 rounded-full" />
              )}
              <div>
                <h2 className="text-lg font-semibold text-white">{user!.username}</h2>
                <p className="text-sm text-green-400">已通过 Discord 授权登录</p>
              </div>
            </div>
          </div>

          {/* ====== 服务器列表 ====== */}
          {guilds.length > 0 && (
            <div className="bg-gray-800 rounded-lg p-5 mb-6 border border-gray-700">
              <h2 className="text-lg font-semibold text-gray-200 mb-4">
                你的服务器 ({guilds.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {guilds.slice(0, 12).map((g) => (
                  <div key={g.id} className="flex items-center gap-3 bg-gray-900 rounded-lg p-3">
                    {getGuildIcon(g) ? (
                      <img src={getGuildIcon(g)!} alt="" className="w-10 h-10 rounded-full bg-gray-700" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-gray-500 text-sm font-bold">
                        {g.name.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{g.name}</p>
                      <p className="text-xs text-gray-500">{g.owner ? '所有者' : '成员'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ====== 错误提示 ====== */}
      {error && (
        <div className="bg-red-900/30 border border-red-700/40 rounded-lg p-3 mb-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* ====== Bot Token 输入 ====== */}
      <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
        <h2 className="text-lg font-semibold text-gray-200 mb-2">通过 Bot Token 导入应用</h2>
        <p className="text-sm text-gray-400 mb-4">
          从{' '}
          <a
            href="https://discord.com/developers/applications"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 underline"
          >
            Discord Developer Portal
          </a>
          {' '}获取 Bot Token 并粘贴到下方，即可查看和管理你的应用。
        </p>

        <div className="flex gap-2">
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchApp()}
            placeholder="粘贴 Bot Token..."
            className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={fetchApp}
            disabled={loading}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
          >
            {loading ? '获取中...' : '获取应用'}
          </button>
        </div>
      </div>

      {/* ====== 当前获取的应用详情 ====== */}
      {app && (
        <div className="bg-gray-800 rounded-lg p-6 mb-4 border border-green-700/50">
          <div className="flex items-center gap-4 mb-4">
            {getIconUrl(app) && (
              <img src={getIconUrl(app)!} alt="" className="w-16 h-16 rounded-full bg-gray-700" />
            )}
            <div>
              <h3 className="text-xl font-bold text-white">{app.name}</h3>
              <p className="text-sm text-gray-400">ID: {app.id}</p>
            </div>
          </div>

          {app.description && (
            <p className="text-sm text-gray-300 mb-4">{app.description}</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 text-sm">
            <div className="bg-gray-900 rounded p-3">
              <span className="text-gray-500">Public Bot</span>
              <span className={`ml-2 ${app.botPublic ? 'text-green-400' : 'text-red-400'}`}>
                {app.botPublic ? '开启' : '关闭'}
              </span>
              {!app.botPublic && (
                <p className="text-yellow-400 text-xs mt-1">如果不是应用所有者，需要开启 Public Bot 才能邀请</p>
              )}
            </div>
            <div className="bg-gray-900 rounded p-3">
              <span className="text-gray-500">Requires Code Grant</span>
              <span className={`ml-2 ${app.botRequireCodeGrant ? 'text-yellow-400' : 'text-green-400'}`}>
                {app.botRequireCodeGrant ? '开启' : '关闭'}
              </span>
              {app.botRequireCodeGrant && (
                <p className="text-yellow-400 text-xs mt-1">建议在 Developer Portal 中关闭此选项</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href={app.inviteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition-colors"
            >
              邀请 Bot 到服务器
            </a>
            <a
              href={`https://discord.com/developers/applications/${app.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
            >
              在 Developer Portal 中打开
            </a>
            <button
              onClick={() => navigate(`/?token=${encodeURIComponent(token.trim())}`)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm transition-colors"
            >
              在仪表盘中创建 Bot
            </button>
          </div>
        </div>
      )}

      {/* ====== 已导入的应用列表 ====== */}
      {apps.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-gray-200 mb-4">已导入的应用 ({apps.length})</h2>
          <div className="space-y-3">
            {apps.map((a) => (
              <div key={a.id} className="flex items-center gap-3 bg-gray-900 rounded-lg p-3">
                {getIconUrl(a) ? (
                  <img src={getIconUrl(a)!} alt="" className="w-10 h-10 rounded-full bg-gray-700" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-indigo-600/30 flex items-center justify-center text-indigo-400 text-sm font-bold">
                    {a.name.charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{a.name}</p>
                  <p className="text-xs text-gray-500">{a.id}</p>
                </div>
                <div className="flex gap-2">
                  <a
                    href={a.inviteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-xs transition-colors"
                  >
                    邀请
                  </a>
                  <button
                    onClick={() => removeApp(a.id)}
                    className="px-3 py-1 bg-red-600/30 hover:bg-red-600/50 rounded text-xs text-red-400 transition-colors"
                  >
                    移除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}