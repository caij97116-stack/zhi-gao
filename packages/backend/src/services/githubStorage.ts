import fs from 'fs';
import path from 'path';
import { getDataDir } from '../utils/dataDir.js';

const DB_FILE = 'discord-bots.db';
const BRANCH = 'data';

let backupTimer: ReturnType<typeof setTimeout> | null = null;
let pendingBackup = false;

function getDbPath(): string {
  return path.join(getDataDir(), DB_FILE);
}

function getToken(): string | null {
  return process.env.GITHUB_TOKEN || null;
}

function getRepoInfo(): { owner: string; repo: string } | null {
  const token = getToken();
  if (!token) return null;
  
  const repoFull = process.env.GITHUB_REPOSITORY || 'caij97116-stack/zhi-gao';
  const [owner, repo] = repoFull.split('/');
  if (!owner || !repo) return null;
  return { owner, repo };
}

/**
 * 从 GitHub data 分支恢复数据库文件。
 * 返回 true 表示恢复成功，false 表示恢复失败（首次使用正常）。
 */
export async function restoreFromGitHub(): Promise<boolean> {
  const token = getToken();
  const repoInfo = getRepoInfo();
  if (!token || !repoInfo) return false;

  const dbPath = getDbPath();

  try {
    const url = `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/contents/${DB_FILE}?ref=${BRANCH}`;
    const resp = await fetch(url, {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (resp.status === 404) {
      console.log('[GitHub] data 分支尚无备份文件，将从头开始');
      return false;
    }

    if (!resp.ok) {
      console.error(`[GitHub] 下载失败: HTTP ${resp.status}`);
      return false;
    }

    const data = (await resp.json()) as { content?: string; encoding?: string };
    if (!data.content) {
      console.error('[GitHub] 响应中没有文件内容');
      return false;
    }

    const buffer = Buffer.from(data.content, 'base64');
    fs.writeFileSync(dbPath, buffer);
    console.log(`[GitHub] 数据库已从 data 分支恢复 (${(buffer.length / 1024).toFixed(1)} KB)`);
    return true;
  } catch (err) {
    console.error('[GitHub] 恢复失败:', err instanceof Error ? err.message : err);
    return false;
  }
}

/**
 * 将数据库文件备份到 GitHub data 分支。
 * 使用防抖机制，多次调用只会在最后一次调用后延迟执行。
 */
export function scheduleBackup(): void {
  if (!getToken()) return;

  pendingBackup = true;

  if (backupTimer) {
    clearTimeout(backupTimer);
  }

  backupTimer = setTimeout(async () => {
    pendingBackup = false;
    await doBackup();
  }, 5000); // 5 秒防抖
}

/**
 * 立即执行备份（不等待防抖）。
 */
export async function backupNow(): Promise<void> {
  if (backupTimer) {
    clearTimeout(backupTimer);
    backupTimer = null;
  }
  pendingBackup = false;
  await doBackup();
}

async function doBackup(): Promise<void> {
  const token = getToken();
  const repoInfo = getRepoInfo();
  if (!token || !repoInfo) return;

  const dbPath = getDbPath();
  if (!fs.existsSync(dbPath)) {
    console.log('[GitHub] 数据库文件不存在，跳过备份');
    return;
  }

  try {
    const content = fs.readFileSync(dbPath);
    const base64 = content.toString('base64');

    // 获取当前文件的 SHA（如果存在）
    let sha = '';
    try {
      const getUrl = `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/contents/${DB_FILE}?ref=${BRANCH}`;
      const getResp = await fetch(getUrl, {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });
      if (getResp.ok) {
        const data = (await getResp.json()) as { sha?: string };
        sha = data.sha || '';
      }
    } catch {
      // 文件不存在，将创建新文件
    }

    // 创建或更新文件
    const putUrl = `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/contents/${DB_FILE}`;
    const body: Record<string, string> = {
      message: `backup: ${new Date().toISOString()}`,
      content: base64,
      branch: BRANCH,
    };
    if (sha) body.sha = sha;

    const putResp = await fetch(putUrl, {
      method: 'PUT',
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (putResp.ok) {
      console.log(`[GitHub] 数据库已备份到 data 分支 (${(content.length / 1024).toFixed(1)} KB)`);
    } else {
      const errText = await putResp.text();
      console.error(`[GitHub] 备份失败: HTTP ${putResp.status} - ${errText}`);
    }
  } catch (err) {
    console.error('[GitHub] 备份失败:', err instanceof Error ? err.message : err);
  }
}