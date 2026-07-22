import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { serverApi, type GuildInfo } from '../api';

const CHANNEL_TYPE: Record<number, string> = {
  0: '文字', 2: '语音', 4: '分类', 5: '公告', 13: '舞台', 15: '论坛',
};
const CHANNEL_ICON: Record<number, string> = {
  0: '#', 2: '\u266B', 4: '\u25BC', 5: '\uD83D\uDCE2', 13: '\uD83C\uDFA4', 15: '\uD83D\uDCDA',
};

export function ServerInfo() {
  const { botId } = useParams<{ botId: string }>();
  const navigate = useNavigate();
  const [guilds, setGuilds] = useState<GuildInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<Record<string, 'overview' | 'members' | 'roles' | 'channels'>>({});

  useEffect(() => {
    if (!botId) return;
    serverApi.info(botId).then((data) => {
      setGuilds(data.guilds);
      const tabs: Record<string, 'overview' | 'members' | 'roles' | 'channels'> = {};
      data.guilds.forEach((g) => { tabs[g.id] = 'overview'; });
      setActiveTab(tabs);
    })
      .catch((err) => setError(err instanceof Error ? err.message : '获取失败'))
      .finally(() => setLoading(false));
  }, [botId]);

  if (loading) return <div className="text-center text-gray-400 py-12">加载中...</div>;

  return (
    <div>
      <button onClick={() => navigate('/')} className="text-gray-400 hover:text-white text-sm mb-4 block">&larr; 返回</button>
      <h1 className="text-2xl font-bold mb-6">社区信息</h1>
      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
      {guilds.length === 0 && !error && (
        <div className="text-center text-gray-500 py-8">Bot 尚未加入任何服务器。</div>
      )}

      {guilds.map((guild) => {
        const tab = activeTab[guild.id] || 'overview';
        return (
          <div key={guild.id} className="space-y-6">
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
              <div className="flex items-center gap-4">
                {guild.icon && <img src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=64`} className="w-14 h-14 rounded-full" />}
                <div className="flex-1">
                  <h2 className="text-xl font-bold">{guild.name}</h2>
                  {guild.description && <p className="text-sm text-gray-400 mt-0.5">{guild.description}</p>}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {guild.features.slice(0, 6).map((f) => (
                      <span key={f} className="px-2 py-0.5 text-xs bg-indigo-900/30 text-indigo-400 border border-indigo-800/50 rounded">{f}</span>
                    ))}
                    {guild.features.length > 6 && (
                      <span className="px-2 py-0.5 text-xs text-gray-500">+{guild.features.length - 6} 更多</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mt-4 pt-4 border-t border-gray-700">
                <StatBox label="成员" value={guild.memberCount.toLocaleString()} />
                <StatBox label="在线" value={guild.approximatePresenceCount.toLocaleString()} color="text-green-400" />
                <StatBox label="频道" value={guild.channels.length} />
                <StatBox label="角色" value={guild.roles.length} />
                <StatBox label="表情" value={guild.emojiCount} />
                <StatBox label="贴纸" value={guild.stickerCount} />
                <StatBox label="加成" value={guild.boostCount} sub={guild.boostTierName} />
                <StatBox label="验证" value={guild.verificationLevelName} />
              </div>
            </div>

            <div className="flex gap-1 bg-gray-800 border border-gray-700 rounded-xl p-1">
              {(['overview', 'members', 'roles', 'channels'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveTab((prev) => ({ ...prev, [guild.id]: t }))}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    tab === t ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  {{ overview: '概览', members: '成员', roles: '角色', channels: '频道' }[t]}
                </button>
              ))}
            </div>

            {tab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
                  <h3 className="text-sm font-medium text-gray-300 mb-3">服务器详情</h3>
                  <div className="space-y-2 text-sm">
                    <Row label="服务器 ID" value={guild.id} mono />
                    <Row label="创建时间" value={new Date(guild.createdAt).toLocaleString('zh-CN')} />
                    <Row label="所有者 ID" value={guild.ownerId} mono />
                    <Row label="首选语言" value={guild.preferredLocale} />
                    <Row label="验证级别" value={guild.verificationLevelName} />
                    <Row label="NSFW 级别" value={guild.nsfwLevelName} />
                    <Row label="加成级别" value={`${guild.boostTierName} (${guild.boostCount} 次)`} />
                    {guild.vanityUrlCode && <Row label="自定义 URL" value={guild.vanityUrlCode} />}
                  </div>
                </div>
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
                  <h3 className="text-sm font-medium text-gray-300 mb-3">服务器特性 ({guild.features.length})</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {guild.features.length === 0 && <span className="text-sm text-gray-500">无特殊特性</span>}
                    {guild.features.map((f) => (
                      <span key={f} className="px-2 py-1 text-xs bg-gray-700/50 text-gray-300 rounded">{f}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {tab === 'members' && (
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
                <h3 className="text-sm font-medium text-gray-300 mb-3">成员列表 ({guild.members?.length || 0})</h3>
                <div className="space-y-1 max-h-[32rem] overflow-y-auto">
                  {guild.members?.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 py-2 px-2 hover:bg-gray-700/30 rounded-lg">
                      {m.avatar ? (
                        <img src={`https://cdn.discordapp.com/avatars/${m.id}/${m.avatar}.png?size=40`} className="w-9 h-9 rounded-full" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gray-600 flex items-center justify-center text-xs text-gray-400 font-bold">{m.displayName?.[0] || '?'}</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-200 truncate">{m.displayName}</div>
                        <div className="text-xs text-gray-500">{m.username}{m.username !== m.displayName ? '' : ''}</div>
                      </div>
                      <div className="flex gap-1">
                        {m.roles?.filter((r) => r.color !== '#000000').slice(0, 3).map((r) => (
                          <span key={r.id} className="px-1.5 py-0.5 rounded text-xs whitespace-nowrap" style={{ backgroundColor: r.color + '30', color: r.color, border: '1px solid ' + r.color + '40' }}>{r.name}</span>
                        ))}
                      </div>
                      {m.joinedAt && (
                        <span className="text-xs text-gray-600 hidden md:inline">{new Date(m.joinedAt).toLocaleDateString('zh-CN')}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'roles' && (
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
                <h3 className="text-sm font-medium text-gray-300 mb-3">角色列表 ({guild.roles?.length || 0})</h3>
                <div className="space-y-1">
                  {guild.roles?.map((r) => (
                    <div key={r.id} className="flex items-center gap-3 py-2 px-2 hover:bg-gray-700/30 rounded-lg">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: r.color || '#747f8d' }} />
                      <span className="text-sm text-gray-200 flex-1 truncate">{r.name}</span>
                      <span className="text-xs text-gray-500">{r.memberCount} 人</span>
                      {r.hoist && <span className="text-xs bg-purple-900/40 text-purple-400 px-1.5 py-0.5 rounded">单独显示</span>}
                      {r.managed && <span className="text-xs bg-blue-900/40 text-blue-400 px-1.5 py-0.5 rounded">托管</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'channels' && (
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
                <h3 className="text-sm font-medium text-gray-300 mb-3">频道列表 ({guild.channels?.length || 0})</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1.5">
                  {guild.channels?.map((c) => (
                    <div key={c.id} className="flex items-center gap-2 text-sm bg-gray-700/20 px-3 py-2 rounded-lg">
                      <span className="text-gray-500 w-5 text-center">{CHANNEL_ICON[c.type] || '?'}</span>
                      <span className="text-gray-300 truncate">{c.name}</span>
                      <span className="text-xs text-gray-600 ml-auto">{CHANNEL_TYPE[c.type] || '未知'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function StatBox({ label, value, sub, color = 'text-gray-300' }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="text-center">
      <div className={`text-lg font-semibold ${color}`}>{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
      {sub && <div className="text-xs text-gray-600">{sub}</div>}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className={`text-gray-300 ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
    </div>
  );
}
