import fs from 'fs';
import path from 'path';
import { getDataDir } from '../utils/dataDir.js';

const DB_FILE = 'discord-bots.db';
const KEY_FILE = '.encryption_key';
const BRANCH = 'data';

let backupTimer: ReturnType<typeof setTimeout> | null = null;
let pendingBackup = false;
let branchExistsChecked = false;

function getDbPath(): string {
  return path.join(getDataDir(), DB_FILE);
}

function getKeyPath(): string {
  return path.join(getDataDir(), KEY_FILE);
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
 * 从 GitHub data 分支下载单个文件，写入本地。
 */
async function downloadFromGitHub(fileName: string, localPath: string): Promise<boolean> {
  const token = getToken();
  const repoInfo = getRepoInfo();
  if (!token || !repoInfo) return false;

  try {
    const url = `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/contents/${fileName}?ref=${BRANCH}`;
    const resp = await fetch(url, {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (resp.status === 404) return false;
    if (!resp.ok) {
      console.error(`[GitHub] 下载 ${fileName} 失败: HTTP ${resp.status}`);
      return false;
    }

    const data = (await resp.json()) as { content?: string; encoding?: string };
    if (!data.content) return false;

    const buffer = Buffer.from(data.content, 'base64');
    fs.writeFileSync(localPath, buffer);
    return true;
  } catch (err) {
    console.error(`[GitHub] 下载 ${fileName} 失败:`, err instanceof Error ? err.message : err);
    return false;
  }
}

/**
 * 上传单个文件到 GitHub data 分支。
 */
async function uploadToGitHub(fileName: string, localPath: string): Promise<boolean> {
  const token = getToken();
  const repoInfo = getRepoInfo();
  if (!token || !repoInfo) return false;

  if (!fs.existsSync(localPath)) return false;

  try {
    const content = fs.readFileSync(localPath);
    const base64 = content.toString('base64');

    // 获取当前文件的 SHA（如果存在）
    let sha = '';
    try {
      const getUrl = `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/contents/${fileName}?ref=${BRANCH}`;
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

    const putUrl = `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/contents/${fileName}`;
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
      return true;
    } else {
      const errText = await putResp.text();
      console.error(`[GitHub] 上传 ${fileName} 失败: HTTP ${putResp.status} - ${errText}`);
      return false;
    }
  } catch (err) {
    console.error(`[GitHub] 上传 ${fileName} 失败:`, err instanceof Error ? err.message : err);
    return false;
  }
}

/**
 * 确保 GitHub 上存在 data 分支。
 * 如果分支不存在，则从默认分支创建。
 */
async function ensureDataBranch(): Promise<boolean> {
  const token = getToken();
  const repoInfo = getRepoInfo();
  if (!token || !repoInfo) return false;

  if (branchExistsChecked) return true;

  try {
    // 检查 data 分支是否已存在
    const checkUrl = `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/git/refs/heads/${BRANCH}`;
    const checkResp = await fetch(checkUrl, {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (checkResp.ok) {
      branchExistsChecked = true;
      return true;
    }

    if (checkResp.status !== 404) {
      console.error(`[GitHub] 检查 data 分支失败: HTTP ${checkResp.status}`);
      return false;
    }

    // data 分支不存在，需要创建
    console.log('[GitHub] data 分支不存在，正在创建...');

    // 获取默认分支的最新 commit SHA
    const repoUrl = `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}`;
    const repoResp = await fetch(repoUrl, {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!repoResp.ok) {
      console.error(`[GitHub] 获取仓库信息失败: HTTP ${repoResp.status}`);
      return false;
    }

    const repoData = (await repoResp.json()) as { default_branch?: string };
    const defaultBranch = repoData.default_branch || 'main';

    // 获取默认分支最新 commit 的 SHA
    const branchUrl = `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/git/refs/heads/${defaultBranch}`;
    const branchResp = await fetch(branchUrl, {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!branchResp.ok) {
      console.error(`[GitHub] 获取 ${defaultBranch} 分支信息失败: HTTP ${branchResp.status}`);
      return false;
    }

    const branchData = (await branchResp.json()) as { object?: { sha?: string } };
    const sha = branchData.object?.sha;

    if (!sha) {
      console.error('[GitHub] 无法获取默认分支的 commit SHA');
      return false;
    }

    // 创建 data 分支
    const createRefUrl = `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/git/refs`;
    const createResp = await fetch(createRefUrl, {
      method: 'POST',
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ref: `refs/heads/${BRANCH}`,
        sha,
      }),
    });

    if (createResp.ok) {
      console.log('[GitHub] data 分支创建成功');
      branchExistsChecked = true;
      return true;
    } else {
      const errText = await createResp.text();
      console.error(`[GitHub] 创建 data 分支失败: HTTP ${createResp.status} - ${errText}`);
      return false;
    }
  } catch (err) {
    console.error('[GitHub] 确保 data 分支存在时出错:', err instanceof Error ? err.message : err);
    return false;
  }
}

/**
 * 从 GitHub data 分支恢复数据库文件和加密密钥。
 * 返回 true 表示恢复成功，false 表示恢复失败（首次使用正常）。
 */
export async function restoreFromGitHub(): Promise<boolean> {
  const token = getToken();
  const repoInfo = getRepoInfo();
  if (!token || !repoInfo) {
    console.log('[GitHub] 未配置 GITHUB_TOKEN，跳过数据恢复');
    return false;
  }

  const dbPath = getDbPath();
  const keyPath = getKeyPath();
  let restored = false;

  // 先恢复加密密钥（数据库的 token 需要用它解密）
  const keyRestored = await downloadFromGitHub(KEY_FILE, keyPath);
  if (keyRestored) {
    console.log('[GitHub] 加密密钥已从 data 分支恢复');
    restored = true;
  }

  // 恢复数据库
  const dbRestored = await downloadFromGitHub(DB_FILE, dbPath);
  if (dbRestored) {
    const size = fs.existsSync(dbPath) ? (fs.statSync(dbPath).size / 1024).toFixed(1) : '0';
    console.log(`[GitHub] 数据库已从 data 分支恢复 (${size} KB)`);
    restored = true;
  }

  if (!restored) {
    console.log('[GitHub] data 分支尚无备份文件，将从头开始');
  }

  return restored;
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
  const keyPath = getKeyPath();

  if (!fs.existsSync(dbPath)) {
    console.log('[GitHub] 数据库文件不存在，跳过备份');
    return;
  }

  try {
    // 确保 data 分支存在
    const branchReady = await ensureDataBranch();
    if (!branchReady) {
      console.error('[GitHub] 无法确保 data 分支存在，备份中止');
      return;
    }

    // 备份数据库
    const dbOk = await uploadToGitHub(DB_FILE, dbPath);
    if (dbOk) {
      const size = (fs.statSync(dbPath).size / 1024).toFixed(1);
      console.log(`[GitHub] 数据库已备份到 data 分支 (${size} KB)`);
    }

    // 备份加密密钥
    if (fs.existsSync(keyPath)) {
      const keyOk = await uploadToGitHub(KEY_FILE, keyPath);
      if (keyOk) {
        console.log('[GitHub] 加密密钥已备份到 data 分支');
      }
    }
  } catch (err) {
    console.error('[GitHub] 备份失败:', err instanceof Error ? err.message : err);
  }
}