const express = require('express');
const router = express.Router();
const { verifyAccess } = require('../auth');
const { pool } = require('../db');

function authMiddleware(req, res, next) {
  const h = req.headers.authorization;
  if (!h || !h.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' });
  const token = h.slice(7);
  try {
    const payload = verifyAccess(token);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const row = await pool.query('SELECT id, email, name, role, photo, birth, phone, address, cover, email_verified FROM users WHERE id = $1', [req.user.userId]);
    const user = row.rows[0];
    if (!user) return res.status(404).json({ error: 'Not found' });
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

router.patch('/me', authMiddleware, async (req, res) => {
  try {
    const allowed = ['name', 'email', 'photo', 'birth', 'phone', 'address', 'password', 'cover'];
    const updates = {};
    for (const key of allowed) if (req.body[key] !== undefined) updates[key] = req.body[key];
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No updates' });
    // handle password separately (hash)
    let passwordHash;
    if (updates.password) {
      const bcrypt = require('bcrypt');
      passwordHash = await bcrypt.hash(updates.password, 12);
      delete updates.password;
    }
    const parts = [];
    const values = [];
    let idx = 1;
    for (const [k,v] of Object.entries(updates)) {
      parts.push(`${k} = $${idx}`);
      values.push(v);
      idx++;
    }
    if (passwordHash) { parts.push(`password_hash = $${idx}`); values.push(passwordHash); idx++; }
    values.push(req.user.userId);
    const sql = `UPDATE users SET ${parts.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING id,email,name,role,photo,birth,phone,address,cover,email_verified`;
    const r = await pool.query(sql, values);
    const user = r.rows[0];
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

module.exports = router;
