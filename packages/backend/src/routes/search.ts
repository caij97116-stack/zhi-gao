import { Router, Request, Response } from 'express';

interface SearchResult {
  source: 'github' | 'npm' | 'mcp';
  name: string;
  description: string;
  url: string;
  stars?: number;
  language?: string;
  license?: string;
  installCommand?: string;
}

const MCP_PROJECTS: SearchResult[] = [
  {
    source: 'mcp',
    name: 'mcp-discord',
    description: 'Discord MCP Server - 消息管理、频道创建、角色管理、成员列表',
    url: 'https://github.com/hanweg/mcp-discord',
    stars: 200,
    language: 'Python',
    license: 'MIT',
    installCommand: 'git clone https://github.com/hanweg/mcp-discord.git && cd mcp-discord && uv pip install -e .',
  },
  {
    source: 'mcp',
    name: 'discordmcp',
    description: 'Discord MCP Server (Node.js) - LLM 与 Discord 频道交互',
    url: 'https://github.com/v-3/discordmcp',
    stars: 150,
    language: 'TypeScript',
    license: 'MIT',
    installCommand: 'git clone https://github.com/v-3/discordmcp.git && cd discordmcp && npm install && npm run build',
  },
];

export const searchRouter = Router();

searchRouter.get('/', async (req: Request, res: Response) => {
  const q = (req.query.q as string) || '';
  const source = (req.query.source as string) || '';
  const lang = (req.query.lang as string) || '';

  if (!q.trim()) {
    res.json({ results: [] });
    return;
  }

  const results: SearchResult[] = [];
  const targetSources = source ? source.split(',') : ['github', 'npm'];

  const promises: Promise<void>[] = [];

  if (targetSources.includes('github')) {
    promises.push(
      (async () => {
        try {
          const query = `discord+bot+${encodeURIComponent(q)}`;
          const url = `https://api.github.com/search/repositories?q=${query}&sort=stars&per_page=10`;
          const resp = await fetch(url, {
            headers: { Accept: 'application/vnd.github.v3+json', 'User-Agent': 'discord-bot-workshop' },
          });
          if (!resp.ok) return;
          const data = await resp.json() as { items?: Array<Record<string, unknown>> };
          for (const item of data.items || []) {
            if (lang && item.language !== lang) continue;
            results.push({
              source: 'github',
              name: item.full_name as string,
              description: (item.description as string) || '',
              url: item.html_url as string,
              stars: item.stargazers_count as number,
              language: item.language as string,
              license: (item.license as { spdx_id?: string } | null)?.spdx_id,
            });
          }
        } catch {
          // GitHub API limit or network error, skip
        }
      })()
    );
  }

  if (targetSources.includes('npm')) {
    promises.push(
      (async () => {
        try {
          const query = `discord+${encodeURIComponent(q)}`;
          const url = `https://registry.npmjs.org/-/v1/search?text=${query}&size=10`;
          const resp = await fetch(url);
          if (!resp.ok) return;
          const data = await resp.json() as { objects?: Array<{ package: Record<string, unknown> }> };
          for (const obj of data.objects || []) {
            const pkg = obj.package;
            const keywords = (pkg.keywords as string[]) || [];
            if (lang && !keywords.some((k: string) => k.toLowerCase() === lang.toLowerCase())) {
              if (pkg.language && pkg.language !== lang) continue;
            }
            results.push({
              source: 'npm',
              name: pkg.name as string,
              description: (pkg.description as string) || '',
              url: (pkg.links as { npm?: string })?.npm || `https://www.npmjs.com/package/${pkg.name}`,
              installCommand: `npm install ${pkg.name}`,
            });
          }
        } catch {
          // npm API error, skip
        }
      })()
    );
  }

  if (source === '' || source.includes('mcp')) {
    const matched = MCP_PROJECTS.filter(
      (p) =>
        p.name.toLowerCase().includes(q.toLowerCase()) ||
        p.description.toLowerCase().includes(q.toLowerCase())
    );
    if (lang) {
      results.push(...matched.filter((p) => p.language === lang));
    } else {
      results.push(...matched);
    }
  }

  await Promise.allSettled(promises);

  results.sort((a, b) => (b.stars || 0) - (a.stars || 0));

  res.json({ results });
});
