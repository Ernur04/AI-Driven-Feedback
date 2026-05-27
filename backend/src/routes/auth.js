const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const { pool } = require('../db');
const { signAccess, generateRefresh, hashToken, saveRefresh, revokeRefreshHash } = require('../auth');
const { sendEmail } = require('../utils/email');
const { generateToken } = require('../utils/token');

const SALT_ROUNDS = 12;

router.post('/register', async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    if (!email || !password || password.length < 6) return res.status(400).json({ error: 'Invalid input' });
    const exists = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (exists.rows.length) return res.status(409).json({ error: 'Email exists' });
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    // Allow passing `role` from frontend only when explicitly enabled via env var
    const requestedRole = (role && typeof role === 'string') ? role.toLowerCase() : 'user';
    const allowAdmin = (process.env.ALLOW_ADMIN_REG === 'true');
    const dbRole = (requestedRole === 'admin' && allowAdmin) ? 'admin' : 'user';
    const result = await pool.query(
      'INSERT INTO users(email, password_hash, name, role, email_verified, created_at) VALUES($1,$2,$3,$4,false,NOW()) RETURNING id,email,name,role',
      [email.toLowerCase(), password_hash, name || null, dbRole]
    );
    const user = result.rows[0];
    // send verification email if SMTP configured
    try {
      const token = generateToken(24);
      const tokenHash = hashToken(token);
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await pool.query('INSERT INTO email_tokens(user_id, token_hash, type, expires_at, created_at) VALUES($1,$2,$3,$4,NOW())', [user.id, tokenHash, 'verify', expires]);
      const url = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}`;
      await sendEmail(user.email, 'Verify your email', `Verify: ${url}`);
    } catch (e) {
      console.warn('Failed to send verification email', e.message || e);
    }
    const accessToken = signAccess(user);
    const refreshToken = generateRefresh();
    await saveRefresh(user.id, refreshToken);
    res.json({ accessToken, refreshToken, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Invalid input' });
    const result = await pool.query('SELECT id, email, password_hash, name, role FROM users WHERE email = $1', [email.toLowerCase()]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const accessToken = signAccess(user);
    const refreshToken = generateRefresh();
    await saveRefresh(user.id, refreshToken);
    res.json({ accessToken, refreshToken, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Missing refreshToken' });
    const tokenHash = hashToken(refreshToken);
    const row = await pool.query('SELECT user_id, expires_at, revoked FROM refresh_tokens WHERE token_hash = $1', [tokenHash]);
    const entry = row.rows[0];
    if (!entry) return res.status(401).json({ error: 'Invalid token' });
    if (entry.revoked) return res.status(401).json({ error: 'Token revoked' });
    if (new Date(entry.expires_at) < new Date()) return res.status(401).json({ error: 'Token expired' });
    const userRow = await pool.query('SELECT id, email, name, role FROM users WHERE id = $1', [entry.user_id]);
    const user = userRow.rows[0];
    if (!user) return res.status(401).json({ error: 'User not found' });
    // rotate refresh token
    await revokeRefreshHash(tokenHash);
    const newRefresh = generateRefresh();
    await saveRefresh(user.id, newRefresh);
    const accessToken = signAccess(user);
    res.json({ accessToken, refreshToken: newRefresh });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.sendStatus(204);
    const tokenHash = hashToken(refreshToken);
    await revokeRefreshHash(tokenHash);
    res.sendStatus(204);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

module.exports = router;
