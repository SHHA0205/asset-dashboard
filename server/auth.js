export function accessAuth(req, res, next) {
  const password = process.env.ACCESS_PASSWORD;
  if (!password) return next();

  if (req.path === '/api/health') return next();

  const header = req.headers.authorization || '';
  const [scheme, encoded] = header.split(' ');
  if (scheme === 'Basic' && encoded) {
    const decoded = Buffer.from(encoded, 'base64').toString();
    const colon = decoded.indexOf(':');
    const pass = colon >= 0 ? decoded.slice(colon + 1) : decoded;
    if (pass === password) return next();
  }

  res.set('WWW-Authenticate', 'Basic realm="Asset Dashboard"');
  return res.status(401).send('Authentication required');
}