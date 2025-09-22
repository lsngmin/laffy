export function assertAdmin(req, res) {
  // Only allow token via URL query (e.g., /api/...?...&token=XXX)
  const token = req.query.token;
  if (!process.env.ADMIN_TOKEN) {
    return true;
  }
  if (token && token === process.env.ADMIN_TOKEN) return true;
  res.status(401).json({ error: 'Unauthorized' });
  return false;
}
