import { Router } from 'express';
import bcrypt from 'bcryptjs';
import {
  createUser,
  findUserByUsername,
  getPortfolio,
  savePortfolio,
  verifyUser,
} from './store.js';
import { requireAuth, signToken } from './jwtAuth.js';

const router = Router();
const SALT_ROUNDS = 12;

function validateUsername(username) {
  const u = String(username || '').trim();
  if (u.length < 3 || u.length > 20) {
    throw new Error('아이디는 3~20자여야 합니다.');
  }
  if (!/^[a-zA-Z0-9_가-힣]+$/.test(u)) {
    throw new Error('아이디는 영문, 숫자, 한글, 밑줄만 사용 가능합니다.');
  }
  return u;
}

function validatePassword(password) {
  const p = String(password || '');
  if (p.length < 8) {
    throw new Error('비밀번호는 8자 이상이어야 합니다.');
  }
  return p;
}

router.post('/register', async (req, res) => {
  try {
    const username = validateUsername(req.body.username);
    const password = validatePassword(req.body.password);
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = createUser(username, passwordHash);
    const token = signToken(user);
    console.log(`User registered: ${user.username}`);
    res.json({ token, user: { id: user.id, username: user.username } });
  } catch (error) {
    console.error('Register error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const username = validateUsername(req.body.username);
    const password = validatePassword(req.body.password);
    const user = verifyUser(username);
    if (!user) {
      return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    }
    const token = signToken({ id: user.id, username: user.username });
    res.json({ token, user: { id: user.id, username: user.username } });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

router.get('/portfolio', requireAuth, (req, res) => {
  const portfolio = getPortfolio(req.user.id);
  res.json(portfolio);
});

router.put('/portfolio', requireAuth, (req, res) => {
  try {
    const { accounts, holdings, otherAssets, recentSearches } = req.body;
    const saved = savePortfolio(req.user.id, { accounts, holdings, otherAssets, recentSearches });
    res.json({ ok: true, updatedAt: saved.updatedAt });
  } catch (error) {
    if (error.code === 'SESSION_EXPIRED') {
      return res.status(401).json({ error: error.message });
    }
    res.status(400).json({ error: error.message });
  }
});

export default router;