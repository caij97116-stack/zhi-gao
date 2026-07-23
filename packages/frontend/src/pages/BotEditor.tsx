import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { botsApi, commandsApi, eventsApi, botControlApi, type BotDetail, type Command, type EventConfig } from '../api';
import { CommandEditor } from '../components/CommandEditor';
import { EmbedBuilder } from '../components/EmbedBuilder';
import { EventConfigEditor } from '../components/EventConfigEditor';
import { LogViewer } from '../components/LogViewer';
import { ScheduleEditor } from '../components/ScheduleEditor';
import { SettingsTab } from '../components/SettingsTab';

type Tab = 'commands' | 'events' | 'schedules' | 'settings';

interface GuildInfo {
  id: string;
  name: string;
  icon: string | null;
  memberCount: number;
}

export function BotEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [bot, setBot] = useState<BotDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('commands');
  const [guilds, setGuilds] = useState<GuildInfo[]>([]);
  const [guildsLoading, setGuildsLoading] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);

  const loadBot = async () => {
    if (!id) return;
    try {
      const data = await botsApi.get(id);
      setBot(data);
    } catch {
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const loadGuilds = async () => {
    if (!id) return;
    setGuildsLoading(true);
    try {
      const data = await botControlApi.getGuilds(id);
      setGuilds(data.guilds);
    } catch {
      // ignore
    } finally {
      setGuildsLoading(false);
    }
  };

  useEffect(() => {
    loadBot();
  }, [id]);

  useEffect(() => {
    if (bot && bot.status === 'online') {
      loadGuilds();
    }
  }, [bot?.status]);

  const getInviteUrl = () => {
    if (!bot?.clientId) return '';
    const base = `https://discord.com/oauth2/authorize?client_id=${bot.clientId}&permissions=8&scope=bot%20applications.commands`;
    return bot.guildId ? `${base}&guild_id=${bot.guildId}` : base;
  };

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(getInviteUrl());
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2000);
  };

  const handleCommandCreate = async (cmd: Partial<Command>) => {
    if (!id) return;
    await commandsApi.create(id, cmd);
    loadBot();
  };

  const handleCommandUpdate = async (cmdId: string, cmd: Partial<Command>) => {
    if (!id) return;
    await commandsApi.update(id, cmdId, cmd);
    loadBot();
  };

  const handleCommandDelete = async (cmdId: string) => {
    if (!id) return;
    await commandsApi.delete(id, cmdId);
    loadBot();
  };

  const handleEventsSave = async (events: EventConfig[]) => {
    if (!id) return;
    await eventsApi.save(id, events);
    loadBot();
  };

  const handleStart = async () => {
    if (!id) return;
    await botsApi.start(id);
    loadBot();
  };

  const handleStop = async () => {
    if (!id) return;
    await botsApi.stop(id);
    loadBot();
  };

  const handleRestart = async () => {
    if (!id) return;
    await botsApi.restart(id);
    loadBot();
  };

  if (loading) return <div className="text-center text-gray-400 py-12">加载中...</div>;
  if (!bot) return null;

  const statusLabel: Record<string, string> = { online: '在线', offline: '离线', starting: '启动中', error: '错误' };
  const statusColor: Record<string, string> = { online: 'text-green-400', offline: 'text-gray-400', starting: 'text-yellow-400', error: 'text-red-400' };

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/')} className="text-gray-400 hover:text-white text-sm">
          &larr; 返回
        </button>
        <h1 className="text-xl font-bold">{bot.name}</h1>
        <span className={`text-sm ${statusColor[bot.status]}`}>{statusLabel[bot.status]}</span>
        <div className="flex-1" />
        <div className="flex gap-2">
          {bot.status === 'offline' || bot.status === 'error' ? (
            <button onClick={handleStart} className="px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded-lg text-sm transition-colors">
              启动
            </button>
          ) : (
            <>
              <button onClick={handleStop} className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-sm transition-colors">
                停止
              </button>
              <button onClick={handleRestart} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition-colors">
                重启
              </button>
            </>
          )}
        </div>
      </div>

      {bot.clientId && (
        <div className="bg-gray-800 rounded-lg p-4 mb-4 border border-gray-700">
          <p className="text-sm font-medium text-gray-200 mb-3">将 Bot 加入你的服务器</p>

          <div className="flex flex-wrap gap-2 mb-3">
            <a
              href={getInviteUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors"
            >
              打开邀请链接
            </a>
            <button
              onClick={handleCopyInvite}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
            >
              {inviteCopied ? '已复制' : '复制邀请链接'}
            </button>
            <button
              onClick={loadGuilds}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
            >
              刷新服务器列表
            </button>
          </div>

          <details className="text-xs text-gray-400">
            <summary className="cursor-pointer hover:text-gray-300">邀请链接详情</summary>
            <code className="block mt-2 break-all bg-gray-900 px-2 py-1 rounded text-indigo-400">{getInviteUrl()}</code>
            <p className="mt-1">Client ID: {bot.clientId}</p>
          </details>

          {guilds.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-700">
              <p className="text-xs text-gray-400 mb-2">Bot 当前所在的服务器：</p>
              {guilds.map((g) => (
                <div key={g.id} className="flex items-center gap-2 text-sm text-gray-300 py-1">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  {g.name} <span className="text-xs text-gray-500">({g.memberCount} 成员)</span>
                </div>
              ))}
            </div>
          )}

          {guildsLoading && <p className="text-xs text-gray-500 mt-2">加载中...</p>}

          {bot.status === 'online' && guilds.length === 0 && !guildsLoading && (
            <div className="mt-3 pt-3 border-t border-gray-700">
              <p className="text-xs text-yellow-400">
                Bot 尚未加入任何服务器。请点击上方按钮打开邀请链接，在 Discord 授权页面选择你的服务器并授权。
              </p>
              <p className="text-xs text-gray-500 mt-1">
                如果授权页面看不到你的服务器，说明你需要在该服务器中有「管理服务器」权限。
              </p>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-1 mb-4 border-b border-gray-700">
        <button
          onClick={() => setTab('commands')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'commands' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          斜杠命令
        </button>
        <button
          onClick={() => setTab('events')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'events' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          事件配置
        </button>
        <button
          onClick={() => setTab('schedules')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'schedules' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          定时任务
        </button>
        <button
          onClick={() => setTab('settings')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'settings' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          Bot 设置
        </button>
      </div>

      {tab === 'commands' && (
        <CommandEditor
          commands={bot.commands}
          onCreate={handleCommandCreate}
          onUpdate={handleCommandUpdate}
          onDelete={handleCommandDelete}
          embedBuilder={EmbedBuilder}
        />
      )}

      {tab === 'events' && (
        <EventConfigEditor events={bot.events} onSave={handleEventsSave} />
      )}

      {tab === 'schedules' && (
        <ScheduleEditor botId={id!} commands={bot.commands} />
      )}

      {tab === 'settings' && (
        <SettingsTab botId={id!} />
      )}

      {id && <div className="mt-6"><LogViewer botId={id} /></div>}
    </div>
  );
}
