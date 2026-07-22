import { Router, Request, Response } from 'express';
import crypto from 'crypto';

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

authRouter.get('/discord', (_req: Request, res: Response) => {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    res.json({ error: 'NOT_CONFIGURED', message: 'Discord OAuth2 未配置，请设置 DISCORD_CLIENT_ID 和 DISCORD_CLIENT_SECRET 环境变量' });
    return;
  }
  const state = crypto.randomBytes(16).toString('hex');
  const url = new URL('https://discord.com/api/oauth2/authorize');
  url.searchParams.set('client_id', CLIENT_ID);
  url.searchParams.set('redirect_uri', REDIRECT_URI);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'identify guilds');
  url.searchParams.set('state', state);
  res.json({ url: url.toString(), state });
});

authRouter.get('/discord/callback', async (req: Request, res: Response) => {
  const { code } = req.query;

  if (!code || typeof code !== 'string') {
    res.status(400).json({ error: 'Missing authorization code' });
    return;
  }

  try {
    const tokenResp = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
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
