import { useState } from 'react';
import type { EmbedConfig, EmbedField } from '../api';

export interface EmbedBuilderProps {
  embeds: EmbedConfig[];
  onChange: (embeds: EmbedConfig[]) => void;
}

const emptyEmbed = (): EmbedConfig => ({
  title: '',
  description: '',
  color: '#5865F2',
  fields: [],
});

const defaultField = (): EmbedField => ({ name: '', value: '', inline: false });

export function EmbedBuilder({ embeds, onChange }: EmbedBuilderProps) {
  const current = embeds[0] || emptyEmbed();

  const update = (patch: Partial<EmbedConfig>) => {
    onChange([{ ...current, ...patch }]);
  };

  const addField = () => {
    update({ fields: [...(current.fields || []), defaultField()] });
  };

  const updateField = (idx: number, f: Partial<EmbedField>) => {
    const fields = [...(current.fields || [])];
    fields[idx] = { ...fields[idx], ...f };
    update({ fields });
  };

  const removeField = (idx: number) => {
    update({ fields: (current.fields || []).filter((_, i) => i !== idx) });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1">标题</label>
          <input
            type="text"
            value={current.title || ''}
            onChange={(e) => update({ title: e.target.value })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">描述</label>
          <textarea
            value={current.description || ''}
            onChange={(e) => update({ description: e.target.value })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[60px]"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">颜色</label>
          <input
            type="color"
            value={current.color || '#5865F2'}
            onChange={(e) => update({ color: e.target.value })}
            className="w-12 h-8 rounded cursor-pointer"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">缩略图 URL</label>
          <input
            type="text"
            value={current.thumbnail || ''}
            onChange={(e) => update({ thumbnail: e.target.value })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">大图 URL</label>
          <input
            type="text"
            value={current.image || ''}
            onChange={(e) => update({ image: e.target.value })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">页脚</label>
          <input
            type="text"
            value={current.footer || ''}
            onChange={(e) => update({ footer: e.target.value })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-gray-400">Fields</label>
            <button onClick={addField} className="text-xs text-indigo-400 hover:text-indigo-300">+ 添加</button>
          </div>
          {(current.fields || []).map((field, i) => (
            <div key={i} className="flex gap-2 mb-2 items-start">
              <input
                type="text"
                value={field.name}
                onChange={(e) => updateField(i, { name: e.target.value })}
                className="flex-1 px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="名称"
              />
              <input
                type="text"
                value={field.value}
                onChange={(e) => updateField(i, { value: e.target.value })}
                className="flex-1 px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="值"
              />
              <label className="flex items-center gap-1 text-xs text-gray-400 whitespace-nowrap">
                <input type="checkbox" checked={field.inline} onChange={(e) => updateField(i, { inline: e.target.checked })} />
                同行
              </label>
              <button onClick={() => removeField(i)} className="text-red-400 hover:text-red-300 text-xs px-1">x</button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#2b2d31] rounded-lg p-4 border-l-4 h-fit"
        style={{ borderLeftColor: current.color || '#5865F2' }}>
        <div className="text-xs text-gray-500 mb-2">预览</div>
        {current.title && <div className="font-semibold text-sm mb-1">{current.title}</div>}
        {current.description && <div className="text-sm text-gray-300 whitespace-pre-wrap mb-2">{current.description}</div>}
        {(current.fields || []).length > 0 && (
          <div className={`grid ${(current.fields || []).some((f) => f.inline) ? 'grid-cols-2' : 'grid-cols-1'} gap-2 mb-2`}>
            {(current.fields || []).map((f, i) => (
              <div key={i}>
                <div className="text-xs font-semibold">{f.name || '(空)'}</div>
                <div className="text-xs text-gray-400">{f.value || '(空)'}</div>
              </div>
            ))}
          </div>
        )}
        {current.thumbnail && (
          <img src={current.thumbnail} alt="" className="w-16 h-16 rounded object-cover mb-2" />
        )}
        {current.image && (
          <img src={current.image} alt="" className="w-full rounded mb-2" />
        )}
        {current.footer && <div className="text-xs text-gray-500">{current.footer}</div>}
      </div>
    </div>
  );
}
