import { Router, Request, Response } from 'express';
import type { Command, EventConfig } from '../models/types.js';

export const templatesRouter = Router();

export interface BotTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  commands: { name: string; description: string; options?: Command['options']; reply: Command['reply'] }[];
  events: { type: EventConfig['type']; enabled: boolean; config: EventConfig['config'] }[];
}

export const templates: BotTemplate[] = [
  {
    id: 'welcome',
    name: '入群欢迎',
    description: '新成员加入时自动发送欢迎消息，支持自定义欢迎词和频道',
    icon: 'hand',
    commands: [
      {
        name: 'welcome',
        description: '测试欢迎消息',
        reply: {
          type: 'embed',
          embeds: [
            {
              title: '欢迎来到服务器！',
              description: '你好，欢迎加入我们！请阅读规则频道的内容，祝你在这里玩得愉快！',
              color: '#5865F2',
              footer: '服务器欢迎系统',
            },
          ],
        },
      },
    ],
    events: [
      {
        type: 'memberJoin',
        enabled: true,
        config: {
          channelId: '',
          message: '欢迎 {user} 加入我们的社区！你是第 {count} 位成员！',
        },
      },
    ],
  },
  {
    id: 'keyword',
    name: '关键词回复',
    description: '根据消息关键词自动回复，适合FAQ和自动化应答',
    icon: 'chat',
    commands: [
      {
        name: 'keyword',
        description: '管理关键词回复',
        options: [
          { name: 'action', description: '操作类型', type: 'STRING', required: true },
          { name: 'pattern', description: '关键词', type: 'STRING', required: false },
          { name: 'reply', description: '回复内容', type: 'STRING', required: false },
        ],
        reply: {
          type: 'text',
          content: '关键词操作已执行',
        },
      },
    ],
    events: [
      {
        type: 'messageCreate',
        enabled: true,
        config: {
          keywords: [
            { pattern: '你好', reply: '你好呀！有什么可以帮你的吗？' },
            { pattern: '规则', reply: '请阅读 #规则 频道的置顶消息' },
            { pattern: '链接', reply: '我们的官网：https://example.com' },
          ],
        },
      },
    ],
  },
  {
    id: 'poll',
    name: '投票系统',
    description: '快速创建投票，自动统计结果，支持多选项',
    icon: 'bar-chart',
    commands: [
      {
        name: 'poll',
        description: '创建投票',
        options: [
          { name: 'question', description: '投票问题', type: 'STRING', required: true },
          { name: 'option1', description: '选项1', type: 'STRING', required: true },
          { name: 'option2', description: '选项2', type: 'STRING', required: true },
          { name: 'option3', description: '选项3', type: 'STRING', required: false },
          { name: 'option4', description: '选项4', type: 'STRING', required: false },
        ],
        reply: {
          type: 'embed',
          embeds: [
            {
              title: '投票',
              description: '请使用反应表情投票',
              color: '#FEE75C',
              fields: [],
              footer: '投票系统',
            },
          ],
        },
      },
    ],
    events: [],
  },
  {
    id: 'mod',
    name: 'Mod 审核',
    description: '基础管理功能：禁言、踢出、封禁、清除消息',
    icon: 'shield',
    commands: [
      {
        name: 'kick',
        description: '将成员踢出服务器',
        options: [
          { name: 'user', description: '目标用户', type: 'USER', required: true },
          { name: 'reason', description: '原因', type: 'STRING', required: false },
        ],
        reply: { type: 'text', content: '已踢出用户' },
      },
      {
        name: 'ban',
        description: '封禁成员',
        options: [
          { name: 'user', description: '目标用户', type: 'USER', required: true },
          { name: 'reason', description: '原因', type: 'STRING', required: false },
        ],
        reply: { type: 'text', content: '已封禁用户' },
      },
      {
        name: 'timeout',
        description: '禁言成员（秒）',
        options: [
          { name: 'user', description: '目标用户', type: 'USER', required: true },
          { name: 'seconds', description: '禁言秒数', type: 'INTEGER', required: true },
          { name: 'reason', description: '原因', type: 'STRING', required: false },
        ],
        reply: { type: 'text', content: '已禁言用户' },
      },
      {
        name: 'clear',
        description: '清除消息',
        options: [
          { name: 'count', description: '清除数量 (1-100)', type: 'INTEGER', required: true },
        ],
        reply: { type: 'text', content: '消息已清除' },
      },
    ],
    events: [],
  },
];

templatesRouter.get('/', (_req: Request, res: Response) => {
  const result = templates.map(({ id, name, description, icon, commands, events }) => ({
    id,
    name,
    description,
    icon,
    commandCount: commands.length,
    eventCount: events.length,
  }));
  res.json(result);
});

templatesRouter.get('/:id', (req: Request, res: Response) => {
  const tpl = templates.find((t) => t.id === req.params.id);
  if (!tpl) {
    res.status(404).json({ error: 'Template not found' });
    return;
  }
  res.json(tpl);
});
