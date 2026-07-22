import { useState } from 'react';
import type { CommandOption, ReplyConfig } from '../api';

interface DebugPanelProps {
  options: CommandOption[];
  reply: ReplyConfig;
}

function replacePlaceholders(text: string, values: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (_, key) => values[key] || `{${key}}`);
}

function DiscordEmbedPreview({ embeds }: { embeds: ReplyConfig['embeds'] }) {
  if (!embeds || embeds.length === 0) return null;
  return (
    <div className="space-y-3">
      {embeds.map((embed, i) => (
        <div key={i} className="bg-[#2b2d31] border-l-4 rounded overflow-hidden" style={{ borderLeftColor: embed.color || '#5865F2' }}>
          <div className="p-3">
            {embed.title && (
              <a className="text-[#00a8fc] font-semibold text-sm block mb-1" href={embed.image}>{embed.title}</a>
            )}
            {embed.description && <p className="text-gray-200 text-sm whitespace-pre-wrap">{embed.description}</p>}
            {embed.fields && embed.fields.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                {embed.fields.map((f, j) => (
                  <div key={j} className={f.inline ? '' : 'col-span-2'}>
                    <div className="text-xs font-semibold text-gray-100">{f.name}</div>
                    <div className="text-xs text-gray-300">{f.value}</div>
                  </div>
                ))}
              </div>
            )}
            {embed.thumbnail && (
              <img src={embed.thumbnail} alt="" className="w-20 h-20 rounded mt-2 object-cover" />
            )}
            {embed.image && (
              <img src={embed.image} alt="" className="w-full rounded mt-2 max-h-60 object-cover" />
            )}
            {embed.footer && <p className="text-xs text-gray-500 mt-2">{embed.footer}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

export function DebugPanel({ options, reply }: DebugPanelProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [simulated, setSimulated] = useState(false);

  const handleSimulate = () => {
    setSimulated(true);
  };

  const processedReply: ReplyConfig = simulated
    ? reply.type === 'text'
      ? { type: 'text', content: replacePlaceholders(reply.content || '', values) }
      : {
          type: 'embed',
          embeds: reply.embeds?.map((e) => ({
            ...e,
            title: replacePlaceholders(e.title || '', values),
            description: replacePlaceholders(e.description || '', values),
            footer: e.footer ? replacePlaceholders(e.footer, values) : undefined,
            fields: e.fields?.map((f) => ({
              ...f,
              name: replacePlaceholders(f.name, values),
              value: replacePlaceholders(f.value, values),
            })),
          })),
        }
    : reply;

  return (
    <div className="bg-[#1e1f22] border border-gray-600 rounded-lg p-4 mt-2">
      <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
        <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
        模拟执行
      </h4>

      {options.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          {options.map((opt) => (
            <div key={opt.name}>
              <label className="block text-xs text-gray-400 mb-1">
                {opt.name} {opt.required && <span className="text-red-400">*</span>}
                <span className="text-gray-500 ml-1">({opt.type})</span>
              </label>
              <input
                type={opt.type === 'INTEGER' ? 'number' : 'text'}
                value={values[opt.name] || ''}
                onChange={(e) => setValues({ ...values, [opt.name]: e.target.value })}
                className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder={`输入 ${opt.description || opt.name}`}
              />
            </div>
          ))}
        </div>
      )}

      <button
        onClick={handleSimulate}
        className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 rounded text-xs font-medium transition-colors mb-4"
      >
        执行模拟
      </button>

      {simulated && (
        <div>
          <h5 className="text-xs font-medium text-gray-400 mb-2 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
            Discord 预览
          </h5>
          <div className="flex items-start gap-3 p-3 bg-[#313338] rounded-lg">
            <div className="w-10 h-10 rounded-full bg-[#5865F2] flex items-center justify-center flex-shrink-0 mt-1">
              <span className="text-white text-xs font-bold">Bot</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-[#58a1d9]">Bot</span>
                <span className="text-xs text-gray-500">今天 {new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              {processedReply.type === 'text' ? (
                <p className="text-sm text-gray-200 whitespace-pre-wrap">{processedReply.content}</p>
              ) : (
                <DiscordEmbedPreview embeds={processedReply.embeds} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
