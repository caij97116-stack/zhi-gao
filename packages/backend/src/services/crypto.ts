import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { getDataDir } from '../utils/dataDir.js';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

function getKeyFilePath(): string {
  return path.join(getDataDir(), '.encryption_key');
}

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;

  // 优先使用环境变量（生产环境推荐）
  let rawKey = process.env.ENCRYPTION_KEY;

  if (rawKey) {
    cachedKey = crypto.createHash('sha256').update(rawKey).digest();
    return cachedKey;
  }

  // 环境变量未设置，尝试从文件读取（持久化自动生成的密钥）
  const keyFile = getKeyFilePath();
  try {
    if (fs.existsSync(keyFile)) {
      rawKey = fs.readFileSync(keyFile, 'utf8').trim();
      if (rawKey) {
        cachedKey = crypto.createHash('sha256').update(rawKey).digest();
        return cachedKey;
      }
    }
  } catch {
    // 读取失败，生成新的
  }

  // 自动生成密钥并持久化
  rawKey = crypto.randomBytes(32).toString('hex');
  try {
    fs.writeFileSync(keyFile, rawKey);
  } catch {
    // 写入失败也继续，使用内存中的密钥
  }

  console.log('');
  console.log('⚠️  ENCRYPTION_KEY 环境变量未设置，已自动生成密钥');
  console.log(`   密钥已保存到: ${keyFile}`);
  console.log('   生产环境建议设置 ENCRYPTION_KEY 环境变量');
  console.log('');

  cachedKey = crypto.createHash('sha256').update(rawKey).digest();
  return cachedKey;
}

export function encryptToken(token: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decryptToken(encrypted: string): string {
  const key = getKey();
  const parts = encrypted.split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid encrypted token format');
  }
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedData = Buffer.from(parts[1], 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
  return decrypted.toString('utf8');
}
