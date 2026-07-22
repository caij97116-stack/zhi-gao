import { useEffect, useState, useRef } from 'react';

export interface LogEntry {
  botId: string;
  timestamp: string;
  type: 'info' | 'command' | 'event' | 'error' | 'start' | 'stop' | 'connected';
  message: string;
  commandName?: string;
  eventType?: string;
}

const TYPE_COLORS: Record<string, string> = {
  info: 'text-blue-400',
  command: 'text-purple-400',
  event: 'text-green-400',
  error: 'text-red-400',
  start: 'text-emerald-400',
  stop: 'text-yellow-400',
  connected: 'text-gray-400',
};

const TYPE_LABELS: Record<string, string> = {
  info: '信息',
  command: '命令',
  event: '事件',
  error: '错误',
  start: '启动',
  stop: '停止',
  connected: '连接',
};

interface LogViewerProps {
  botId: string;
  autoScroll?: boolean;
}

export function LogViewer({ botId, autoScroll = true }: LogViewerProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const es = new EventSource(`/api/bots/${botId}/logs`);

    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);

    es.onmessage = (event) => {
      try {
        const entry = JSON.parse(event.data) as LogEntry;
        if (entry.type !== 'connected') {
          setLogs((prev) => [...prev.slice(-99), entry]);
        }
      } catch {
        // skip malformed
      }
    };

    return () => {
      es.close();
    };
  }, [botId]);

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="bg-[#1e1f22] border border-gray-700 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-[#2b2d31] border-b border-gray-700">
        <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2Z" />
          </svg>
          运行日志
        </h3>
        <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} title={connected ? '已连接' : '断开'} />
      </div>
      <div className="h-64 overflow-y-auto p-3 font-mono text-xs space-y-1">
        {logs.length === 0 ? (
          <div className="text-gray-500 text-center py-8">等待日志...</div>
        ) : (
          logs.map((log, i) => (
            <div key={i} className="flex gap-2 hover:bg-[#2b2d31]/50 rounded px-1 py-0.5">
              <span className="text-gray-500 flex-shrink-0">{formatTime(log.timestamp)}</span>
              <span className={`flex-shrink-0 font-medium w-10 ${TYPE_COLORS[log.type] || 'text-gray-400'}`}>
                [{TYPE_LABELS[log.type] || log.type}]
              </span>
              <span className="text-gray-300">{log.message}</span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
