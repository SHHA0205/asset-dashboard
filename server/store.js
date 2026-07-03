import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR =
  process.env.DATA_DIR ||
  (process.env.NODE_ENV === 'production'
    ? '/tmp/asset-dashboard-data'
    : path.join(__dirname, '..', 'data'));
const DB_FILE = path.join(DATA_DIR, 'database.json');

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readDb() {
  ensureDir();
  if (!fs.existsSync(DB_FILE)) {
    return { users: {}, portfolios: {} };
  }
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch {
    return { users: {}, portfolios: {} };
  }
}

function writeDb(data) {
  ensureDir();
  const tmp = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, DB_FILE);
}

export function createUserId() {
  return crypto.randomUUID();
}

export function findUserByUsername(username) {
  const db = readDb();
  const key = username.toLowerCase();
  return db.users[key] || null;
}

export function createUser(username, passwordHash) {
  const db = readDb();
  const key = username.toLowerCase();
  if (db.users[key]) {
    throw new Error('이미 사용 중인 아이디입니다.');
  }
  const user = {
    id: createUserId(),
    username,
    passwordHash,
    createdAt: new Date().toISOString(),
  };
  db.users[key] = user;
  db.portfolios[user.id] = {
    accounts: [],
    holdings: [],
    otherAssets: [],
    recentSearches: [],
    updatedAt: new Date().toISOString(),
  };
  writeDb(db);
  return { id: user.id, username: user.username };
}

export function verifyUser(username, passwordHashCompare) {
  const user = findUserByUsername(username);
  if (!user) return null;
  return user;
}

export function getUserById(userId) {
  const db = readDb();
  return Object.values(db.users).find((u) => u.id === userId) || null;
}

export function getPortfolio(userId) {
  const db = readDb();
  const portfolio = db.portfolios[userId] || {
    accounts: [],
    holdings: [],
    otherAssets: [],
    recentSearches: [],
    updatedAt: null,
  };
  if (!portfolio.otherAssets) portfolio.otherAssets = [];
  return portfolio;
}

export function savePortfolio(userId, portfolio) {
  const db = readDb();
  if (!db.portfolios[userId]) {
    throw new Error('사용자를 찾을 수 없습니다.');
  }
  db.portfolios[userId] = {
    accounts: portfolio.accounts || [],
    holdings: portfolio.holdings || [],
    otherAssets: portfolio.otherAssets || [],
    recentSearches: portfolio.recentSearches || [],
    updatedAt: new Date().toISOString(),
  };
  writeDb(db);
  return db.portfolios[userId];
}