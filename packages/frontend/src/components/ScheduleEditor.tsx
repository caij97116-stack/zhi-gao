import { useState, useEffect } from 'react';
import { schedulesApi, type Schedule } from '../api';

interface ScheduleEditorProps {
  botId: string;
  commands: { name: string; description: string }[];
}

const CRON_PRESETS: { label: string; value: string }[] = [
  { label: '每 5 分钟', value: '*/5 * * * *' },
  { label: '每 15 分钟', value: '*/15 * * * *' },
  { label: '每小时', value: '0 * * * *' },
  { label: '每天 9:00', value: '0 9 * * *' },
  { label: '每天 12:00', value: '0 12 * * *' },
  { label: '每天 18:00', value: '0 18 * * *' },
  { label: '每周一 9:00', value: '0 9 * * 1' },
  { label: '每月 1 号 9:00', value: '0 9 1 * *' },
];

export function ScheduleEditor({ botId, commands }: ScheduleEditorProps) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [commandName, setCommandName] = useState('');
  const [cronExpression, setCronExpression] = useState('0 9 * * *');
  const [channelId, setChannelId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadSchedules = async () => {
    try {
      const data = await schedulesApi.list(botId);
      setSchedules(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchedules();
  }, [botId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!commandName || !channelId) {
      setError('请选择命令并填写频道 ID');
      return;
    }
    try {
      await schedulesApi.create(botId, { commandName, cronExpression, channelId });
      setShowForm(false);
      setCommandName('');
      setChannelId('');
      setCronExpression('0 9 * * *');
      loadSchedules();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '创建失败');
    }
  };

  const handleToggle = async (s: Schedule) => {
    await schedulesApi.update(botId, s.id, { enabled: !s.enabled });
    loadSchedules();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('删除这个定时任务？')) return;
    await schedulesApi.delete(botId, id);
    loadSchedules();
  };

  if (loading) return <div className="text-gray-400 text-sm">加载中...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm transition-colors"
        >
          添加定时任务
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 mb-4">
          <h3 className="text-sm font-medium text-gray-300 mb-4">新建定时任务</h3>
          {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
          <form onSubmit={handleCreate}>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">命令</label>
                <select
                  value={commandName}
                  onChange={(e) => setCommandName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">选择命令...</option>
                  {commands.map((cmd) => (
                    <option key={cmd.name} value={cmd.name}>/{cmd.name} - {cmd.description}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">目标频道 ID</label>
                <input
                  type="text"
                  value={channelId}
                  onChange={(e) => setChannelId(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="频道 ID"
                />
                <p className="text-xs text-gray-500 mt-1">Discord 设置 → 高级 → 开发者模式 → 右键频道复制 ID</p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-gray-300 mb-1">Cron 表达式</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={cronExpression}
                  onChange={(e) => setCronExpression(e.target.value)}
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="0 9 * * *"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {CRON_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setCronExpression(preset.value)}
                    className={`px-2 py-1 rounded text-xs transition-colors ${
                      cronExpression === preset.value
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-sm">取消</button>
              <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm">创建</button>
            </div>
          </form>
        </div>
      )}

      {schedules.length === 0 ? (
        <div className="text-center text-gray-500 py-10">
          <p>暂无定时任务</p>
          <p className="text-xs mt-1">定时任务可以让 Bot 在指定时间自动发送命令回复</p>
        </div>
      ) : (
        <div className="space-y-2">
          {schedules.map((s) => (
            <div key={s.id} className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex items-center gap-4">
              <button
                onClick={() => handleToggle(s)}
                className={`w-10 h-6 rounded-full relative transition-colors ${
                  s.enabled ? 'bg-green-500' : 'bg-gray-600'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                    s.enabled ? 'left-5' : 'left-1'
                  }`}
                />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <code className="text-indigo-400 font-mono text-sm">/{s.commandName}</code>
                  <span className="text-xs text-gray-500 font-mono">{s.cronExpression}</span>
                </div>
                <div className="flex gap-4 mt-1 text-xs text-gray-500">
                  <span>频道: {s.channelId}</span>
                  {s.lastRun && (
                    <span>上次执行: {new Date(s.lastRun).toLocaleString('zh-CN')}</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleDelete(s.id)}
                className="px-2 py-1 text-xs bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded transition-colors"
              >
                删除
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
