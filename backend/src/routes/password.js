const express = require('express');
const crypto = require('crypto');
const { pool } = require('../db');
const { sendEmail } = require('../utils/email');
const { generateToken, hashToken } = require('../utils/token');
const router = express.Router();
require('dotenv').config();


router.post('/forgot', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Missing email' });
    const row = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    const user = row.rows[0];
    if (!user) return res.status(200).json({ ok: true });
    const token = generateToken(24);
    const tokenHash = hashToken(token);
    const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour
    await pool.query('INSERT INTO email_tokens(user_id, token_hash, type, expires_at, created_at) VALUES($1,$2,$3,$4,NOW())', [user.id, tokenHash, 'reset', expires]);
    const url = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
    await sendEmail(email, 'Password reset', `Reset your password: ${url}`);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

router.post('/reset', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ error: 'Missing' });
    const tokenHash = hashToken(token);
    const row = await pool.query('SELECT id,user_id,expires_at,used FROM email_tokens WHERE token_hash = $1 AND type = $2', [tokenHash, 'reset']);
    const entry = row.rows[0];
    if (!entry || entry.used || new Date(entry.expires_at) < new Date()) return res.status(400).json({ error: 'Invalid token' });
    // update password
    const bcrypt = require('bcrypt');
    const hash = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, entry.user_id]);
    await pool.query('UPDATE email_tokens SET used = true WHERE id = $1', [entry.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

module.exports = router;
