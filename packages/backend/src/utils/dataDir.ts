import path from 'path';
import fs from 'fs';

/**
 * 获取持久化数据目录。
 * 优先使用 DATA_DIR 环境变量（Render 持久化磁盘），
 * 否则使用项目根目录下的 data/ 目录，
 * 如果都不存在则回退到 process.cwd()。
 */
export function getDataDir(): string {
  const envDir = process.env.DATA_DIR;
  if (envDir) {
    if (!fs.existsSync(envDir)) {
      fs.mkdirSync(envDir, { recursive: true });
    }
    return envDir;
  }

  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return dataDir;
}