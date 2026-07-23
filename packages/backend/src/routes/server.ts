import { Router, Request, Response } from 'express';
import { getDatabase } from '../db/database.js';
import { decryptToken } from '../services/crypto.js';
import type { BotRow } from '../models/types.js';

export const serverRouter = Router();

const VERIFICATION_NAMES: Record<number, string> = {
  0: '无', 1: '低 (需邮箱)', 2: '中 (注册 5 分钟+)', 3: '高 (成员 10 分钟+)', 4: '最高 (需手机)',
};
const NSFW_NAMES: Record<number, string> = { 0: '默认', 1: '显式内容', 2: '安全', 3: '年龄限制' };
const BOOST_TIER_NAMES: Record<number, string> = { 0: '无', 1: '1 级', 2: '2 级', 3: '3 级' };
const FEATURE_LABELS: Record<string, string> = {
  ANIMATED_BANNER: '动态横幅', ANIMATED_ICON: '动态图标', BANNER: '横幅', COMMUNITY: '社区服务器',
  DISCOVERABLE: '可被发现', FEATURABLE: '可被推荐', INVITE_SPLASH: '邀请背景图', MEMBER_VERIFICATION_GATE_ENABLED: '成员验证',
  NEWS: '公告频道', PARTNERED: '合作伙伴', PREVIEW_ENABLED: '预览已启用', VANITY_URL: '自定义邀请',
  VERIFIED: '已验证', VIP_REGIONS: 'VIP 区域', WELCOME_SCREEN_ENABLED: '欢迎屏幕', THREE_DAY_THREAD_ARCHIVE: '3 天帖子存档',
  SEVEN_DAY_THREAD_ARCHIVE: '7 天帖子存档', PRIVATE_THREADS: '私有帖子', ROLE_ICONS: '角色图标',
  ROLE_SUBSCRIPTIONS_ENABLED: '角色订阅', RAID_ALERTS_DISABLED: '突击警报关闭', CREATOR_MONETIZABLE: '创作者变现',
  CREATOR_STORE_PAGE: '创作者商店',
};

serverRouter.get('/:botId/info', async (req: Request, res: Response) => {
  const db = getDatabase();
  const bot = db.prepare('SELECT * FROM bots WHERE id = ?').get(req.params.botId) as BotRow | undefined;

  if (!bot) {
    res.status(404).json({ error: 'Bot not found' });
    return;
  }

  try {
    const token = decryptToken(bot.token);
    const { Client, GatewayIntentBits } = await import('discord.js');
    const client = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildEmojisAndStickers],
    });
    try {
      await client.login(token);

      const result: Record<string, unknown>[] = [];

      for (const [, guild] of client.guilds.cache) {
        await guild.members.fetch();
        await guild.channels.fetch();
        await guild.roles.fetch();
        await guild.emojis.fetch();
        await guild.stickers.fetch();

        result.push({
          id: guild.id,
          name: guild.name,
          icon: guild.icon,
          description: guild.description || null,
          ownerId: guild.ownerId,
          memberCount: guild.memberCount,
          approximatePresenceCount: guild.approximatePresenceCount || 0,
          boostCount: guild.premiumSubscriptionCount || 0,
          boostTier: guild.premiumTier as number,
          verificationLevelName: VERIFICATION_NAMES[guild.verificationLevel] || '未知',
          nsfwLevelName: NSFW_NAMES[guild.nsfwLevel] || '未知',
          preferredLocale: guild.preferredLocale,
          vanityUrlCode: guild.vanityURLCode || null,
          features: (guild.features as string[]).map((f) => FEATURE_LABELS[f] || f),
          boostTierName: BOOST_TIER_NAMES[guild.premiumTier] || '无',
          emojiCount: guild.emojis.cache.size,
          stickerCount: guild.stickers.cache.size,
          createdAt: guild.createdAt.toISOString(),
          members: guild.members.cache.map((m) => ({
            id: m.user.id,
            username: m.user.username,
            displayName: m.displayName,
            avatar: m.user.avatar,
            joinedAt: m.joinedAt?.toISOString() || null,
            roles: m.roles.cache.map((r) => ({ id: r.id, name: r.name, color: r.hexColor })),
          })),
          channels: guild.channels.cache
            .filter((c) => c.parentId === null)
            .sort((a, b) => 'position' in a && 'position' in b ? (a as { position: number }).position - (b as { position: number }).position : 0)
            .map((c) => ({
              id: c.id,
              name: c.name,
              type: c.type,
            })),
          roles: guild.roles.cache
            .sort((a, b) => b.position - a.position)
            .map((r) => ({
              id: r.id,
              name: r.name,
              color: r.hexColor,
              position: r.position,
              memberCount: r.members.size,
              hoist: r.hoist,
              managed: r.managed,
              permissions: r.permissions.bitfield.toString(),
            })),
        });
      }

      res.json({ guilds: result });
    } finally {
      try { client.destroy(); } catch { /* ignore */ }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});
