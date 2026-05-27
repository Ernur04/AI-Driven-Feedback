const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { sendEmail } = require('../utils/email');
const { generateToken, hashToken } = require('../utils/token');

router.post('/send', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Missing email' });
    const row = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    const user = row.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });
    const token = generateToken(24);
    const tokenHash = hashToken(token);
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await pool.query('INSERT INTO email_tokens(user_id, token_hash, type, expires_at, created_at) VALUES($1,$2,$3,$4,NOW())', [user.id, tokenHash, 'verify', expires]);
    const url = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}`;
    await sendEmail(email, 'Verify your email', `Verify: ${url}`);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

router.post('/confirm', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Missing token' });
    const tokenHash = hashToken(token);
    const row = await pool.query('SELECT id,user_id,expires_at,used FROM email_tokens WHERE token_hash = $1 AND type = $2', [tokenHash, 'verify']);
    const entry = row.rows[0];
    if (!entry || entry.used || new Date(entry.expires_at) < new Date()) return res.status(400).json({ error: 'Invalid token' });
    await pool.query('UPDATE users SET email_verified = true WHERE id = $1', [entry.user_id]);
    await pool.query('UPDATE email_tokens SET used = true WHERE id = $1', [entry.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

module.exports = router;
