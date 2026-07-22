import { useState, useEffect, useRef, useCallback } from 'react';
import { botControlApi, type AppInfo } from '../api';

interface SettingsTabProps {
  botId: string;
}

const PERM_CATEGORIES = [
  {
    name: '通用服务器权限',
    perms: [
      { name: 'ADMINISTRATOR', label: '管理员', bit: 1n << 3n },
      { name: 'VIEW_CHANNEL', label: '查看频道', bit: 1n << 10n },
      { name: 'MANAGE_CHANNELS', label: '管理频道', bit: 1n << 4n },
      { name: 'MANAGE_ROLES', label: '管理角色', bit: 1n << 28n },
      { name: 'MANAGE_GUILD', label: '管理服务器', bit: 1n << 5n },
      { name: 'MANAGE_GUILD_EXPRESSIONS', label: '管理表情/贴纸', bit: 1n << 30n },
      { name: 'CREATE_GUILD_EXPRESSIONS', label: '创建表情/贴纸', bit: 1n << 43n },
      { name: 'VIEW_AUDIT_LOG', label: '查看审核日志', bit: 1n << 7n },
      { name: 'VIEW_GUILD_INSIGHTS', label: '查看社区分析', bit: 1n << 19n },
      { name: 'VIEW_CREATOR_MONETIZATION_ANALYTICS', label: '创作者收入分析', bit: 1n << 41n },
      { name: 'MANAGE_WEBHOOKS', label: '管理 Webhooks', bit: 1n << 29n },
    ],
  },
  {
    name: '成员管理',
    perms: [
      { name: 'CREATE_INSTANT_INVITE', label: '创建邀请', bit: 1n << 0n },
      { name: 'CHANGE_NICKNAME', label: '修改昵称', bit: 1n << 26n },
      { name: 'MANAGE_NICKNAMES', label: '管理昵称', bit: 1n << 27n },
      { name: 'KICK_MEMBERS', label: '踢出成员', bit: 1n << 1n },
      { name: 'BAN_MEMBERS', label: '封禁成员', bit: 1n << 2n },
      { name: 'MODERATE_MEMBERS', label: '超时成员', bit: 1n << 40n },
    ],
  },
  {
    name: '文字频道',
    perms: [
      { name: 'SEND_MESSAGES', label: '发送消息', bit: 1n << 11n },
      { name: 'SEND_MESSAGES_IN_THREADS', label: '在帖子中发消息', bit: 1n << 38n },
      { name: 'CREATE_PUBLIC_THREADS', label: '创建公开帖', bit: 1n << 35n },
      { name: 'CREATE_PRIVATE_THREADS', label: '创建私有帖', bit: 1n << 36n },
      { name: 'EMBED_LINKS', label: '嵌入链接', bit: 1n << 14n },
      { name: 'ATTACH_FILES', label: '附加文件', bit: 1n << 15n },
      { name: 'ADD_REACTIONS', label: '添加反应', bit: 1n << 6n },
      { name: 'USE_EXTERNAL_EMOJIS', label: '使用外部表情', bit: 1n << 18n },
      { name: 'USE_EXTERNAL_STICKERS', label: '使用外部贴纸', bit: 1n << 37n },
      { name: 'MENTION_EVERYONE', label: '@全体成员', bit: 1n << 17n },
      { name: 'MANAGE_MESSAGES', label: '管理消息', bit: 1n << 13n },
      { name: 'MANAGE_THREADS', label: '管理帖子', bit: 1n << 34n },
      { name: 'READ_MESSAGE_HISTORY', label: '读取历史消息', bit: 1n << 16n },
      { name: 'SEND_TTS_MESSAGES', label: '发送 TTS 消息', bit: 1n << 12n },
      { name: 'USE_APPLICATION_COMMANDS', label: '使用应用命令', bit: 1n << 31n },
      { name: 'SEND_POLLS', label: '发起投票', bit: 1n << 47n },
      { name: 'USE_EXTERNAL_APPS', label: '使用外部应用', bit: 1n << 48n },
    ],
  },
  {
    name: '语音频道',
    perms: [
      { name: 'CONNECT', label: '连接', bit: 1n << 20n },
      { name: 'SPEAK', label: '说话', bit: 1n << 21n },
      { name: 'STREAM', label: '直播', bit: 1n << 9n },
      { name: 'USE_SOUNDBOARD', label: '使用音效板', bit: 1n << 42n },
      { name: 'USE_EXTERNAL_SOUNDS', label: '外部音效', bit: 1n << 45n },
      { name: 'SEND_VOICE_MESSAGES', label: '发送语音消息', bit: 1n << 46n },
      { name: 'USE_VAD', label: '语音检测', bit: 1n << 25n },
      { name: 'PRIORITY_SPEAKER', label: '优先发言', bit: 1n << 8n },
      { name: 'MUTE_MEMBERS', label: '静音成员', bit: 1n << 22n },
      { name: 'DEAFEN_MEMBERS', label: '耳机屏蔽成员', bit: 1n << 23n },
      { name: 'MOVE_MEMBERS', label: '移动成员', bit: 1n << 24n },
      { name: 'REQUEST_TO_SPEAK', label: '请求发言', bit: 1n << 32n },
    ],
  },
  {
    name: '活动、事件',
    perms: [
      { name: 'MANAGE_EVENTS', label: '管理活动', bit: 1n << 33n },
      { name: 'CREATE_EVENTS', label: '创建活动', bit: 1n << 44n },
      { name: 'USE_EMBEDDED_ACTIVITIES', label: '使用嵌入式活动', bit: 1n << 39n },
    ],
  },
];

const MOD_PRESET = 1n << 10n  // VIEW_CHANNEL
  | 1n << 11n  // SEND_MESSAGES
  | 1n << 38n  // SEND_MESSAGES_IN_THREADS
  | 1n << 35n  // CREATE_PUBLIC_THREADS
  | 1n << 36n  // CREATE_PRIVATE_THREADS
  | 1n << 14n  // EMBED_LINKS
  | 1n << 15n  // ATTACH_FILES
  | 1n << 6n   // ADD_REACTIONS
  | 1n << 18n  // USE_EXTERNAL_EMOJIS
  | 1n << 37n  // USE_EXTERNAL_STICKERS
  | 1n << 16n  // READ_MESSAGE_HISTORY
  | 1n << 17n  // MENTION_EVERYONE
  | 1n << 31n  // USE_APPLICATION_COMMANDS
  | 1n << 1n   // KICK_MEMBERS
  | 1n << 2n   // BAN_MEMBERS
  | 1n << 40n  // MODERATE_MEMBERS
  | 1n << 13n  // MANAGE_MESSAGES
  | 1n << 4n   // MANAGE_CHANNELS
  | 1n << 28n  // MANAGE_ROLES
  | 1n << 27n  // MANAGE_NICKNAMES
  | 1n << 7n   // VIEW_AUDIT_LOG
  | 1n << 34n  // MANAGE_THREADS
  | 1n << 0n   // CREATE_INSTANT_INVITE
  | 1n << 47n  // SEND_POLLS
  | 1n << 29n; // MANAGE_WEBHOOKS
  const [info, setInfo] = useState<AppInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [profileMsg, setProfileMsg] = useState('');
  const [profileError, setProfileError] = useState('');
  const [perms, setPerms] = useState<bigint>(0n);
  const [permsLoaded, setPermsLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [presenceType, setPresenceType] = useState('PLAYING');
  const [presenceName, setPresenceName] = useState('');
  const [presenceStatus, setPresenceStatus] = useState('online');
  const [presenceMsg, setPresenceMsg] = useState('');
  const [presenceError, setPresenceError] = useState('');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const loadInfo = async () => {
    setLoading(true);
    setProfileMsg('');
    setProfileError('');
    try {
      const data = await botControlApi.info(botId);
      setInfo(data);
      setUsername(data.name);
    } catch {
      // info unavailable
    }
    try {
      const saved = await botControlApi.getPermissions(botId);
      setPerms(BigInt(saved.permissions));
    } catch {
      // no saved permissions
    }
    setPermsLoaded(true);
    setLoading(false);
  };

  useEffect(() => {
    loadInfo();
  }, [botId]);

  const savePermissions = useCallback(async (p: bigint) => {
    setSaveStatus('saving');
    try {
      await botControlApi.savePermissions(botId, p.toString());
      setSaveStatus('saved');
    } catch {
      setSaveStatus('error');
    }
  }, [botId]);

  const togglePerm = (bit: bigint) => {
    const newPerms = (perms & bit) === bit ? perms & ~bit : perms | bit;
    setPerms(newPerms);
    clearTimeout(saveTimerRef.current);
    setSaveStatus('saving');
    saveTimerRef.current = setTimeout(() => savePermissions(newPerms), 600);
  };

  const getInviteUrl = () => {
    if (!info?.clientId) return '';
    return `https://discord.com/oauth2/authorize?client_id=${info.clientId}&permissions=${perms.toString()}&scope=bot%20applications.commands`;
  };

  const handleUpdateProfile = async () => {
    setProfileMsg(''); setProfileError('');
    try {
      await botControlApi.updateProfile(botId, { username: username || undefined, avatar: avatarUrl || undefined });
      setProfileMsg('资料已更新');
    } catch (err: unknown) { setProfileError(err instanceof Error ? err.message : '更新失败'); }
  };

  const handleUpdatePresence = async () => {
    setPresenceMsg(''); setPresenceError('');
    try {
      await botControlApi.updatePresence(botId, { status: presenceStatus, type: presenceType, name: presenceName || undefined });
      setPresenceMsg('状态已更新');
    } catch (err: unknown) { setPresenceError(err instanceof Error ? err.message : '更新失败'); }
  };

  if (loading || !permsLoaded) return <div className="text-gray-400 text-sm">加载中...</div>;

  const statusColor = { idle: 'text-gray-500', saving: 'text-yellow-400', saved: 'text-green-400', error: 'text-red-400' }[saveStatus];
  const statusText = { idle: '', saving: '保存中...', saved: '已保存', error: '保存失败' }[saveStatus];

  return (
    <div className="space-y-6">
      {info && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
          <h3 className="text-sm font-medium text-gray-300 mb-3">应用信息</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div><span className="text-gray-500">Client ID</span><div className="text-gray-300 font-mono text-xs">{info.clientId}</div></div>
            <div><span className="text-gray-500">所有者</span><div className="text-gray-300">{info.owner}</div></div>
            <div><span className="text-gray-500">服务器数</span><div className="text-gray-300">{info.approximateGuildCount}</div></div>
            <div><span className="text-gray-500">公开 Bot</span><div className={info.botPublic ? 'text-green-400' : 'text-gray-500'}>{info.botPublic ? '是' : '否'}</div></div>
          </div>
        </div>
      )}

      {info && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Privileged Gateway Intents</h3>
          <p className="text-xs text-gray-500 mb-3">
            特权意图需在 Discord Developer Portal 手动开启，此处仅显示当前状态。
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex items-center gap-3 bg-gray-750 border border-gray-700 rounded-lg p-3">
              <div className={`w-3 h-3 rounded-full ${info.intents.messageContent ? 'bg-green-500' : 'bg-gray-600'}`} />
              <div>
                <div className="text-sm text-gray-200">Message Content</div>
                <div className="text-xs text-gray-500">读取消息内容</div>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-gray-750 border border-gray-700 rounded-lg p-3">
              <div className={`w-3 h-3 rounded-full ${info.intents.serverMembers ? 'bg-green-500' : 'bg-gray-600'}`} />
              <div>
                <div className="text-sm text-gray-200">Server Members</div>
                <div className="text-xs text-gray-500">获取服务器成员</div>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-gray-750 border border-gray-700 rounded-lg p-3">
              <div className={`w-3 h-3 rounded-full ${info.intents.presence ? 'bg-green-500' : 'bg-gray-600'}`} />
              <div>
                <div className="text-sm text-gray-200">Presence</div>
                <div className="text-xs text-gray-500">用户在线状态</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
        <h3 className="text-sm font-medium text-gray-300 mb-3">在线状态与动态</h3>
        <p className="text-xs text-gray-500 mb-4">Bot 启动后生效。</p>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">在线状态</label>
            <select value={presenceStatus} onChange={(e) => setPresenceStatus(e.target.value)} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="online">在线 (绿色)</option>
              <option value="idle">空闲 (黄色)</option>
              <option value="dnd">勿扰 (红色)</option>
              <option value="invisible">隐身 (灰色)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">动态类型</label>
            <select value={presenceType} onChange={(e) => setPresenceType(e.target.value)} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="PLAYING">正在玩</option>
              <option value="STREAMING">正在直播</option>
              <option value="LISTENING">正在听</option>
              <option value="WATCHING">正在看</option>
              <option value="COMPETING">正在比赛</option>
            </select>
          </div>
        </div>
        <div className="mb-4">
          <input type="text" value={presenceName} onChange={(e) => setPresenceName(e.target.value)} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="例如：保卫服务器安全" />
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleUpdatePresence} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm transition-colors">更新状态</button>
          {presenceMsg && <span className="text-green-400 text-sm">{presenceMsg}</span>}
          {presenceError && <span className="text-red-400 text-sm">{presenceError}</span>}
        </div>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
        <h3 className="text-sm font-medium text-gray-300 mb-3">修改 Bot 资料</h3>
        <p className="text-xs text-gray-500 mb-4">Bot 需在线。头像请提供图片直链 URL。</p>
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Bot 用户名</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">头像 URL</label>
            <input type="text" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="https://..." />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleUpdateProfile} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm transition-colors">保存资料</button>
          {profileMsg && <span className="text-green-400 text-sm">{profileMsg}</span>}
          {profileError && <span className="text-red-400 text-sm">{profileError}</span>}
        </div>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-medium text-gray-300">权限配置 & 邀请生成</h3>
            <p className="text-xs text-gray-500">勾选权限后自动保存，用于生成邀请链接</p>
          </div>
          <div className="flex items-center gap-3">
            {saveStatus !== 'idle' && <span className={`text-xs ${statusColor}`}>{statusText}</span>}
            <button onClick={() => { setPerms(1n << 3n); savePermissions(1n << 3n); }} className="px-3 py-1 text-xs bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded transition-colors">全选管理员</button>
            <button onClick={() => { setPerms(MOD_PRESET); savePermissions(MOD_PRESET); }} className="px-3 py-1 text-xs bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded transition-colors">审核推荐</button>
            <button onClick={() => { setPerms(0n); savePermissions(0n); }} className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors">清空</button>
          </div>
        </div>
        <div className="space-y-4">
          {PERM_CATEGORIES.map((cat) => (
            <div key={cat.name}>
              <h4 className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">{cat.name} ({cat.perms.length})</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5">
                {cat.perms.map((p) => (
                  <label key={p.name} className="flex items-center gap-2 cursor-pointer hover:bg-gray-700/30 rounded px-2 py-1.5 transition-colors text-sm">
                    <input type="checkbox" checked={(perms & p.bit) === p.bit} onChange={() => togglePerm(p.bit)} className="rounded accent-indigo-500" />
                    <span className="text-gray-300">{p.label}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        {info?.clientId && (
          <div className="mt-5 pt-4 border-t border-gray-700">
            <div className="flex gap-2">
              <code className="flex-1 bg-gray-900 px-3 py-2 rounded text-xs text-indigo-400 break-all font-mono">{getInviteUrl()}</code>
              <button onClick={() => navigator.clipboard.writeText(getInviteUrl())} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-xs transition-colors flex-shrink-0">复制链接</button>
              <button onClick={() => window.open(getInviteUrl(), '_blank')} className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-xs transition-colors flex-shrink-0">打开邀请</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
