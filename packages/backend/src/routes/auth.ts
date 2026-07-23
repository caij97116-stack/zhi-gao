import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import type { Client } from 'discord.js';

export const authRouter = Router();

const CLIENT_ID = process.env.DISCORD_CLIENT_ID || '';
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || 'http://localhost:5173/callback';

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

interface DiscordUser {
  id: string;
  username: string;
  avatar: string | null;
  discriminator: string;
}

interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
}

const sessions = new Map<string, { accessToken: string; user: DiscordUser }>();

authRouter.get('/discord', (req: Request, res: Response) => {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    res.json({ error: 'NOT_CONFIGURED', message: 'Discord OAuth2 未配置，请设置 DISCORD_CLIENT_ID 和 DISCORD_CLIENT_SECRET 环境变量' });
    return;
  }

  // 自动检测回调地址：优先用环境变量，其次用请求来源
  const origin = req.headers.origin || req.headers.referer?.replace(/\/$/, '') || '';
  const redirectUri = REDIRECT_URI !== 'http://localhost:5173/callback'
    ? REDIRECT_URI
    : origin
      ? `${origin}/callback`
      : REDIRECT_URI;

  const state = crypto.randomBytes(16).toString('hex');
  const url = new URL('https://discord.com/api/oauth2/authorize');
  url.searchParams.set('client_id', CLIENT_ID);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'identify guilds');
  url.searchParams.set('state', state);
  res.json({ url: url.toString(), state, redirectUri });
});

authRouter.get('/discord/callback', async (req: Request, res: Response) => {
  const { code } = req.query;

  if (!code || typeof code !== 'string') {
    res.status(400).json({ error: 'Missing authorization code' });
    return;
  }

  // 自动检测回调地址，与 /discord 端点保持一致
  const origin = req.headers.origin || req.headers.referer?.replace(/\/$/, '') || '';
  const redirectUri = REDIRECT_URI !== 'http://localhost:5173/callback'
    ? REDIRECT_URI
    : origin
      ? `${origin}/callback`
      : REDIRECT_URI;

  try {
    const tokenResp = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResp.ok) {
      const errText = await tokenResp.text();
      res.status(500).json({ error: `Token exchange failed: ${errText}` });
      return;
    }

    const tokens = (await tokenResp.json()) as TokenResponse;

    const userResp = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const user = (await userResp.json()) as DiscordUser;

    const sessionId = crypto.randomBytes(32).toString('hex');
    sessions.set(sessionId, { accessToken: tokens.access_token, user });

    res.json({
      sessionId,
      user: { id: user.id, username: user.username, avatar: user.avatar },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

authRouter.get('/me', async (req: Request, res: Response) => {
  const sessionId = req.headers.authorization?.replace('Bearer ', '');
  if (!sessionId || !sessions.has(sessionId)) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const session = sessions.get(sessionId)!;
  try {
    const guildsResp = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });
    const guilds = (await guildsResp.json()) as DiscordGuild[];

    res.json({
      user: session.user,
      guilds: guilds.map((g) => ({
        id: g.id,
        name: g.name,
        icon: g.icon,
        owner: g.owner,
      })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

authRouter.post('/logout', (req: Request, res: Response) => {
  const sessionId = req.headers.authorization?.replace('Bearer ', '');
  if (sessionId) {
    sessions.delete(sessionId);
  }
  res.json({ success: true });
});

// 通过 Bot Token 获取 Discord 应用信息
authRouter.post('/fetch-app', async (req: Request, res: Response) => {
  const { token } = req.body;
  if (!token) {
    res.status(400).json({ error: '请提供 Bot Token' });
    return;
  }

  let testClient: Client | undefined;
  try {
    const { Client, GatewayIntentBits, REST, Routes } = await import('discord.js');

    // 通过 Discord.js 验证并获取基本信息
    testClient = new Client({ intents: [GatewayIntentBits.Guilds] });
    await testClient.login(token);
    const user = testClient.user;
    const clientId = user?.id;
    const username = user?.username;
    const avatar = user?.avatar;

    // 通过 REST API 获取应用详情
    const rest = new REST({ version: '10' }).setToken(token);
    const appInfo = await rest.get(Routes.oauth2CurrentApplication()) as Record<string, unknown>;

    const app = {
      id: appInfo.id || clientId,
      name: appInfo.name || username,
      icon: appInfo.icon || avatar,
      description: appInfo.description || '',
      botPublic: appInfo.bot_public,
      botRequireCodeGrant: appInfo.bot_require_code_grant,
      flags: appInfo.flags,
      owner: appInfo.owner,
      inviteUrl: `https://discord.com/oauth2/authorize?client_id=${appInfo.id || clientId}&permissions=8&scope=bot`,
    };

    res.json({ app });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json({ error: `Token 无效或无法获取应用信息: ${message}` });
  } finally {
    if (testClient) {
      try { testClient.destroy(); } catch { /* ignore */ }
    }
  }
});
