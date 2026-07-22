import { useState } from 'react';
import type { EventConfig } from '../api';

const EVENT_TYPES = [
  { key: 'memberJoin', label: '成员加入' },
  { key: 'messageCreate', label: '消息关键词' },
  { key: 'memberLeave', label: '成员离开' },
] as const;

interface EventConfigEditorProps {
  events: EventConfig[];
  onSave: (events: EventConfig[]) => void;
}

export function EventConfigEditor({ events, onSave }: EventConfigEditorProps) {
  const [local, setLocal] = useState<EventConfig[]>(() => {
    const existing = [...events];
    for (const et of EVENT_TYPES) {
      if (!existing.find((e) => e.type === et.key)) {
        existing.push({ type: et.key, enabled: false, config: {} });
      }
    }
    return existing;
  });

  const getEvent = (type: string) => local.find((e) => e.type === type)!;

  const updateEvent = (type: string, patch: Partial<EventConfig>) => {
    setLocal(local.map((e) => (e.type === type ? { ...e, ...patch } : e)));
  };

  const updateConfig = (type: string, config: Record<string, unknown>) => {
    updateEvent(type, { config });
  };

  const handleSave = () => {
    onSave(local);
  };

  const renderMemberJoin = () => {
    const event = getEvent('memberJoin');
    const config = event.config as { channelId?: string; message?: string };

    return (
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1">目标频道 ID</label>
          <input
            type="text"
            value={config.channelId || ''}
            onChange={(e) => updateConfig('memberJoin', { ...config, channelId: e.target.value })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="频道 ID (启用开发者模式后右键频道复制)"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">欢迎消息 (用 {'{user}'} 代表新成员)</label>
          <textarea
            value={config.message || ''}
            onChange={(e) => updateConfig('memberJoin', { ...config, message: e.target.value })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[80px]"
            placeholder="欢迎 {user} 加入我们的社区！"
          />
        </div>
      </div>
    );
  };

  const renderMemberLeave = () => {
    const event = getEvent('memberLeave');
    const config = event.config as { channelId?: string; message?: string };

    return (
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1">目标频道 ID</label>
          <input
            type="text"
            value={config.channelId || ''}
            onChange={(e) => updateConfig('memberLeave', { ...config, channelId: e.target.value })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="频道 ID"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">告别消息 (用 {'{user}'} 代表离开的成员)</label>
          <textarea
            value={config.message || ''}
            onChange={(e) => updateConfig('memberLeave', { ...config, message: e.target.value })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[80px]"
            placeholder="{user} 离开了社区..."
          />
        </div>
      </div>
    );
  };

  const renderMessageCreate = () => {
    const event = getEvent('messageCreate');
    const config = event.config as { keywords?: { pattern: string; reply: string }[] };
    const keywords = config.keywords || [];

    const addKeyword = () => {
      updateConfig('messageCreate', { keywords: [...keywords, { pattern: '', reply: '' }] });
    };

    const updateKeyword = (idx: number, patch: Partial<{ pattern: string; reply: string }>) => {
      const updated = [...keywords];
      updated[idx] = { ...updated[idx], ...patch };
      updateConfig('messageCreate', { keywords: updated });
    };

    const removeKeyword = (idx: number) => {
      updateConfig('messageCreate', { keywords: keywords.filter((_, i) => i !== idx) });
    };

    return (
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-400">关键词规则</span>
          <button onClick={addKeyword} className="text-xs text-indigo-400 hover:text-indigo-300">+ 添加规则</button>
        </div>
        {keywords.map((kw, i) => (
          <div key={i} className="flex gap-2 items-start">
            <input
              type="text"
              value={kw.pattern}
              onChange={(e) => updateKeyword(i, { pattern: e.target.value })}
              className="flex-1 px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="匹配关键词"
            />
            <input
              type="text"
              value={kw.reply}
              onChange={(e) => updateKeyword(i, { reply: e.target.value })}
              className="flex-[2] px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="回复内容"
            />
            <button onClick={() => removeKeyword(i)} className="text-red-400 hover:text-red-300 text-xs px-1">x</button>
          </div>
        ))}
      </div>
    );
  };

  const renderConfig = (type: string) => {
    switch (type) {
      case 'memberJoin': return renderMemberJoin();
      case 'messageCreate': return renderMessageCreate();
      case 'memberLeave': return renderMemberLeave();
      default: return null;
    }
  };

  return (
    <div>
      {EVENT_TYPES.map(({ key, label }) => {
        const event = getEvent(key);
        return (
          <div key={key} className="bg-gray-800 border border-gray-700 rounded-xl p-5 mb-4">
            <div className="flex items-center justify-between mb-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={event.enabled}
                  onChange={(e) => updateEvent(key, { enabled: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="font-medium text-sm">{label}</span>
              </label>
            </div>
            {event.enabled && renderConfig(key)}
          </div>
        );
      })}
      <button
        onClick={handleSave}
        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm transition-colors"
      >
        保存事件配置
      </button>
    </div>
  );
}
