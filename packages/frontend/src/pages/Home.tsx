import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { botsApi, templatesApi, type Bot, type Template } from '../api';
import { BotCard } from '../components/BotCard';
import { BotForm } from '../components/BotForm';
import { useAuth } from '../AuthContext';

import type { ReactElement } from 'react';

const TEMPLATE_ICONS: Record<string, ReactElement> = {
  hand: <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.633 10.25c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 0 1 2.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 0 0 .322-1.672V2.75a.75.75 0 0 1 .75-.75A2.25 2.25 0 0 1 16.5 4.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282m0 0h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 0 1-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 0 0-1.423-.23H5.904m10.598-9.75H14.25M5.904 18.5c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 0 1-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 9.953 4.167 9.5 5 9.5h1.053c.472 0 .745.556.5.96a8.958 8.958 0 0 0 1.302 8.486c.21.291.017.685-.35.685z" /></svg>,
  chat: <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" /></svg>,
  'bar-chart': <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" /></svg>,
  shield: <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" /></svg>,
};

export function Home() {
  const { isAuthenticated, login, loading: authLoading, oauthConfigured } = useAuth();
  const [bots, setBots] = useState<Bot[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const navigate = useNavigate();

  const loadBots = async () => {
    try {
      const data = await botsApi.list();
      setBots(data);
    } catch (err) {
      console.error('加载 Bot 列表失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const data = await templatesApi.list();
      setTemplates(data);
    } catch (err) {
      console.error('加载模板列表失败:', err);
    }
  };

  useEffect(() => {
    loadBots();
    loadTemplates();
  }, []);

  const handleLogin = async () => {
    setLoginLoading(true);
    setLoginError('');
    const result = await login();
    if (result.error) {
      setLoginError(result.error);
    }
    setLoginLoading(false);
  };

  const handleCreate = async (data: { name: string; token: string; avatar?: string; guildId?: string }) => {
    setCreateError('');
    setCreateLoading(true);
    try {
      await botsApi.create({ ...data, templateId: selectedTemplate || undefined });
      setShowForm(false);
      setSelectedTemplate(null);
      loadBots();
    } catch (err: unknown) {
      let msg = '创建失败，请检查网络连接';
      if (axios.isAxiosError(err) && err.response) {
        const respData = err.response.data as Record<string, unknown> | undefined;
        if (respData?.error) {
          msg = String(respData.error);
        } else if (respData?.message) {
          msg = String(respData.message);
        } else {
          msg = `请求失败 (HTTP ${err.response.status})`;
        }
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setCreateError(msg);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除这个 Bot？')) return;
    await botsApi.delete(id);
    loadBots();
  };

  const handleStart = async (id: string) => {
    await botsApi.start(id);
    loadBots();
  };

  const handleStop = async (id: string) => {
    await botsApi.stop(id);
    loadBots();
  };

  if (loading || authLoading) {
    return <div className="text-center text-gray-400 py-12">加载中...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">我的 Bot</h1>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors"
        >
          创建 Bot
        </button>
      </div>

      {!isAuthenticated && oauthConfigured && (
        <div className="bg-gradient-to-r from-indigo-900/30 to-indigo-800/20 border border-indigo-700/40 rounded-xl p-4 mb-6 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-[#5865F2]/20 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-[#5865F2]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-300">
              登录 Discord 后可直接选择服务器并管理 Bot 权限。
            </p>
          </div>
          <button
            onClick={handleLogin}
            disabled={loginLoading}
            className="px-4 py-2 bg-[#5865F2] hover:bg-[#4752c4] disabled:opacity-50 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 flex-shrink-0"
          >
            {loginLoading ? '跳转中...' : '用 Discord 登录'}
          </button>
        </div>
      )}

      {loginError && (
        <div className="bg-red-900/30 border border-red-700/40 rounded-lg p-3 mb-4 text-sm text-red-400">
          {loginError}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-lg mx-4 my-8">
            {!selectedTemplate ? (
              <>
                <h2 className="text-lg font-semibold mb-4">选择模板</h2>
                <div className="grid grid-cols-1 gap-3 mb-4">
                  {templates.map((tpl) => (
                    <button
                      key={tpl.id}
                      onClick={() => setSelectedTemplate(tpl.id)}
                      className="flex items-start gap-4 p-4 bg-gray-750 border border-gray-700 rounded-xl hover:border-indigo-500 hover:bg-gray-700 transition-all text-left"
                    >
                      <div className="text-indigo-400 mt-1 flex-shrink-0">
                        {TEMPLATE_ICONS[tpl.icon] || TEMPLATE_ICONS.hand}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-100">{tpl.name}</div>
                        <div className="text-sm text-gray-400 mt-0.5">{tpl.description}</div>
                        <div className="flex gap-3 mt-2 text-xs text-gray-500">
                          <span>{tpl.commandCount} 个命令</span>
                          <span>{tpl.eventCount} 个事件</span>
                        </div>
                      </div>
                    </button>
                  ))}
                  <button
                    onClick={() => setSelectedTemplate('empty')}
                    className="flex items-center gap-4 p-4 border border-dashed border-gray-600 rounded-xl hover:border-gray-400 transition-all text-left"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-medium text-gray-300">空白模板</div>
                      <div className="text-sm text-gray-500">从零开始创建，完全自定义</div>
                    </div>
                  </button>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-sm transition-colors"
                  >
                    取消
                  </button>
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={() => setSelectedTemplate(null)}
                  className="text-sm text-gray-400 hover:text-white mb-3 flex items-center gap-1 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 19.5 8.25 12l7.5-7.5" />
                  </svg>
                  返回模板选择
                </button>
                {createError && (
                  <div className="bg-red-900/30 border border-red-700/40 rounded-lg p-3 mb-4 text-sm text-red-400">
                    {createError}
                  </div>
                )}
                <BotForm
                  onSubmit={handleCreate}
                  onCancel={() => { setShowForm(false); setSelectedTemplate(null); }}
                  templateName={selectedTemplate === 'empty' ? undefined : templates.find(t => t.id === selectedTemplate)?.name}
                  loading={createLoading}
                />
              </>
            )}
          </div>
        </div>
      )}

      {bots.length === 0 ? (
        <div className="text-center text-gray-500 py-20">
          <p className="text-lg mb-2">还没有 Bot</p>
          <p className="text-sm">点击"创建 Bot"开始</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bots.map((bot) => (
            <BotCard
              key={bot.id}
              bot={bot}
              onEdit={() => navigate(`/bot/${bot.id}`)}
              onDelete={() => handleDelete(bot.id)}
              onStart={() => handleStart(bot.id)}
              onStop={() => handleStop(bot.id)}
              onServerInfo={() => navigate(`/server/${bot.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
