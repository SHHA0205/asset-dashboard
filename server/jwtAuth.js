import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-change-in-production';
const JWT_EXPIRES = '30d';

export function signToken(user) {
  return jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES,
  });
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: '로그인이 필요합니다.' });
  }
  try {
    const payload = verifyToken(token);
    req.user = { id: payload.userId, username: payload.username };
    next();
  } catch {
    return res.status(401).json({ error: '세션이 만료되었습니다. 다시 로그인하세요.' });
  }
}