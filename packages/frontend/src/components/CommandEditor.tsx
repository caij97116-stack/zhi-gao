import { useState } from 'react';
import type { Command, CommandOption, ReplyConfig } from '../api';
import { EmbedBuilder, type EmbedBuilderProps } from './EmbedBuilder';
import { DebugPanel } from './DebugPanel';

interface CommandEditorProps {
  commands: Command[];
  onCreate: (cmd: Partial<Command>) => void;
  onUpdate: (cmdId: string, cmd: Partial<Command>) => void;
  onDelete: (cmdId: string) => void;
  embedBuilder: React.ComponentType<EmbedBuilderProps>;
}

const OPTION_TYPES = ['STRING', 'INTEGER', 'BOOLEAN', 'USER', 'CHANNEL', 'ROLE'] as const;

const defaultOption = (): CommandOption => ({
  name: '',
  description: '',
  type: 'STRING',
  required: false,
});

const emptyReply = (): ReplyConfig => ({ type: 'text', content: '' });

function CommandForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Command;
  onSave: (cmd: Partial<Command>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [options, setOptions] = useState<CommandOption[]>(initial?.options || []);
  const [reply, setReply] = useState<ReplyConfig>(initial?.reply || emptyReply());

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim().toLowerCase().replace(/\s+/g, '-'), description, options, reply });
  };

  const addOption = () => setOptions([...options, defaultOption()]);
  const updateOption = (idx: number, field: keyof CommandOption, value: unknown) => {
    const updated = [...options];
    updated[idx] = { ...updated[idx], [field]: value };
    setOptions(updated);
  };
  const removeOption = (idx: number) => setOptions(options.filter((_, i) => i !== idx));

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 mb-4">
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm text-gray-300 mb-1">命令名称</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="ping"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-1">描述</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="命令描述"
          />
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm text-gray-300">参数</label>
          <button onClick={addOption} className="text-xs text-indigo-400 hover:text-indigo-300">
            + 添加参数
          </button>
        </div>
        {options.map((opt, i) => (
          <div key={i} className="flex gap-2 mb-2 items-start">
            <input
              type="text"
              value={opt.name}
              onChange={(e) => updateOption(i, 'name', e.target.value)}
              className="flex-1 px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="参数名"
            />
            <input
              type="text"
              value={opt.description}
              onChange={(e) => updateOption(i, 'description', e.target.value)}
              className="flex-1 px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="描述"
            />
            <select
              value={opt.type}
              onChange={(e) => updateOption(i, 'type', e.target.value)}
              className="px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-xs focus:outline-none"
            >
              {OPTION_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <label className="flex items-center gap-1 text-xs text-gray-400 whitespace-nowrap">
              <input
                type="checkbox"
                checked={opt.required}
                onChange={(e) => updateOption(i, 'required', e.target.checked)}
              />
              必填
            </label>
            <button onClick={() => removeOption(i)} className="text-red-400 hover:text-red-300 text-xs px-1">
              x
            </button>
          </div>
        ))}
      </div>

      <div className="mb-4">
        <label className="block text-sm text-gray-300 mb-2">回复类型</label>
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setReply({ type: 'text', content: reply.content || '' })}
            className={`px-3 py-1.5 rounded text-xs ${reply.type === 'text' ? 'bg-indigo-600' : 'bg-gray-700'}`}
          >
            文本
          </button>
          <button
            onClick={() => setReply({ type: 'embed', embeds: reply.embeds || [] })}
            className={`px-3 py-1.5 rounded text-xs ${reply.type === 'embed' ? 'bg-indigo-600' : 'bg-gray-700'}`}
          >
            Embed
          </button>
        </div>

        {reply.type === 'text' ? (
          <textarea
            value={reply.content || ''}
            onChange={(e) => setReply({ ...reply, content: e.target.value })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[80px]"
            placeholder="回复内容..."
          />
        ) : (
          <EmbedBuilder
            embeds={reply.embeds || []}
            onChange={(embeds) => setReply({ ...reply, embeds })}
          />
        )}
      </div>

      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-sm">取消</button>
        <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm">保存</button>
      </div>
    </div>
  );
}

export function CommandEditor({ commands, onCreate, onUpdate, onDelete }: CommandEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [debuggingId, setDebuggingId] = useState<string | null>(null);

  const editingCmd = editingId ? commands.find((c) => c.id === editingId) : undefined;

  return (
    <div>
      {!creating && !editingId && (
        <button
          onClick={() => setCreating(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm mb-4 transition-colors"
        >
          添加命令
        </button>
      )}

      {creating && (
        <CommandForm
          onSave={(cmd) => { onCreate(cmd); setCreating(false); }}
          onCancel={() => setCreating(false)}
        />
      )}

      {editingId && editingCmd && (
        <CommandForm
          initial={editingCmd}
          onSave={(cmd) => { onUpdate(editingId, cmd); setEditingId(null); }}
          onCancel={() => setEditingId(null)}
        />
      )}

      <div className="space-y-2">
        {commands.map((cmd) => (
          <div key={cmd.id}>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <code className="text-indigo-400 font-mono text-sm">/{cmd.name}</code>
                <p className="text-xs text-gray-400 truncate">{cmd.description || '无描述'}</p>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setDebuggingId(debuggingId === cmd.id ? null : cmd.id)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    debuggingId === cmd.id ? 'bg-yellow-600 text-white' : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  调试
                </button>
                <button onClick={() => setEditingId(cmd.id)} className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors">
                  编辑
                </button>
                <button onClick={() => onDelete(cmd.id)} className="px-2 py-1 text-xs bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded transition-colors">
                  删除
                </button>
              </div>
            </div>
            {debuggingId === cmd.id && (
              <DebugPanel options={cmd.options} reply={cmd.reply} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
