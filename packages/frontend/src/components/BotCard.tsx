import type { Bot } from '../api';

interface BotCardProps {
  bot: Bot;
  onEdit: () => void;
  onDelete: () => void;
  onStart: () => void;
  onStop: () => void;
  onServerInfo: () => void;
}

const statusColors: Record<string, string> = {
  online: 'bg-green-500',
  offline: 'bg-gray-500',
  starting: 'bg-yellow-500',
  error: 'bg-red-500',
};

const statusLabels: Record<string, string> = {
  online: '在线',
  offline: '离线',
  starting: '启动中',
  error: '错误',
};

export function BotCard({ bot, onEdit, onDelete, onStart, onStop, onServerInfo }: BotCardProps) {
  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-gray-600 transition-colors">
      <div className="flex items-center gap-3 mb-3">
        <div className="relative">
          <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-lg font-bold">
            {bot.avatar ? (
              <img src={bot.avatar} alt={bot.name} className="w-12 h-12 rounded-full object-cover" />
            ) : (
              bot.name.charAt(0).toUpperCase()
            )}
          </div>
          <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-gray-800 ${statusColors[bot.status]}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{bot.name}</h3>
          <p className="text-xs text-gray-400">{statusLabels[bot.status]}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={onEdit}
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-xs font-medium transition-colors"
        >
          编辑
        </button>
        {bot.status === 'offline' || bot.status === 'error' ? (
          <button
            onClick={onStart}
            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded-lg text-xs font-medium transition-colors"
          >
            启动
          </button>
        ) : (
          <button
            onClick={onStop}
            className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-xs font-medium transition-colors"
          >
            停止
          </button>
        )}
        <button
          onClick={onServerInfo}
          className="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 rounded-lg text-xs font-medium transition-colors"
        >
          社区
        </button>
        <button
          onClick={onDelete}
          className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg text-xs font-medium transition-colors"
        >
          删除
        </button>
      </div>
    </div>
  );
}
