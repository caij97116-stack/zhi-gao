import { useState } from 'react';
import { useAuth } from '../AuthContext';

interface BotFormProps {
  onSubmit: (data: { name: string; token: string; avatar?: string; guildId?: string }) => void;
  onCancel: () => void;
  initial?: { name: string; token?: string; avatar?: string };
  templateName?: string;
  loading?: boolean;
}

export function BotForm({ onSubmit, onCancel, initial, templateName, loading }: BotFormProps) {
  const { guilds, isAuthenticated } = useAuth();
  const [name, setName] = useState(initial?.name || '');
  const [token, setToken] = useState('');
  const [avatar, setAvatar] = useState(initial?.avatar || '');
  const [guildId, setGuildId] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('请输入 Bot 名称');
      return;
    }
    if (!initial && !token.trim()) {
      setError('请输入 Bot Token');
      return;
    }
    try {
      await onSubmit({ name: name.trim(), token: token.trim(), avatar: avatar.trim() || undefined, guildId: guildId || undefined });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '创建失败';
      setError(msg);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="text-lg font-semibold mb-4">
        {initial ? '编辑 Bot' : '创建 Bot'}
        {templateName && <span className="text-sm font-normal text-indigo-400 ml-2">模板: {templateName}</span>}
      </h2>
      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

      {!initial && isAuthenticated && guilds.length > 0 && (
        <div className="mb-3 p-3 bg-indigo-900/30 border border-indigo-700/50 rounded-lg">
          <label className="block text-sm font-medium text-gray-300 mb-1">目标服务器</label>
          <select
            value={guildId}
            onChange={(e) => setGuildId(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">暂不选择</option>
            {guilds.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} {g.owner ? '(拥有者)' : ''}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">选择后将自动生成邀请链接</p>
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">名称</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="我的 Bot"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">头像 URL (可选)</label>
          <input
            type="text"
            value={avatar}
            onChange={(e) => setAvatar(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="https://..."
          />
        </div>
        {!initial && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Bot Token
              <a
                href="https://discord.com/developers/applications"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-indigo-400 hover:underline ml-2"
              >
                (在 Discord Developer Portal 创建应用)
              </a>
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="粘贴 Bot Token"
            />
            <p className="text-xs text-gray-500 mt-1">
              Developer Portal → New Application → Bot → Reset Token → Copy
            </p>
          </div>
        )}
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-sm transition-colors"
        >
          取消
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
        >
          {loading ? '创建中...' : initial ? '保存' : '创建'}
        </button>
      </div>
    </form>
  );
}
