const express = require('express');
const router = express.Router();
const { verifyAccess, hashToken } = require('../auth');
const { pool } = require('../db');
const { generateToken } = require('../utils/token');
const { sendEmail } = require('../utils/email');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// prepare upload dir for avatars
const uploadDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2,8)}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 2 * 1024 * 1024 } });

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
    // handle email change: require verification and reset email_verified
    if (updates.email) {
      const currentRow = await pool.query('SELECT email FROM users WHERE id = $1', [req.user.userId]);
      const currentEmail = currentRow.rows[0] && currentRow.rows[0].email;
      if (updates.email.toLowerCase() !== (currentEmail || '').toLowerCase()) {
        // ensure new email not already taken
        const exists = await pool.query('SELECT id FROM users WHERE email = $1', [updates.email.toLowerCase()]);
        if (exists.rows[0]) return res.status(409).json({ error: 'Email already in use' });
        updates.email = updates.email.toLowerCase();
        updates.email_verified = false;
        // create verification token
        try {
          const token = generateToken(24);
          const tokenHash = hashToken(token);
          const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
          await pool.query('INSERT INTO email_tokens(user_id, token_hash, type, expires_at, created_at) VALUES($1,$2,$3,$4,NOW())', [req.user.userId, tokenHash, 'verify', expires]);
          const url = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}`;
          await sendEmail(updates.email, 'Verify your email', `Verify: ${url}`);
        } catch (e) {
          console.warn('Failed to send verification email', e && e.message);
        }
      } else {
        delete updates.email; // no change
      }
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

// avatar upload endpoint (multipart/form-data)
router.post('/me/avatar', authMiddleware, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const publicPath = `/uploads/${req.file.filename}`;
    const r = await pool.query('UPDATE users SET photo = $1, updated_at = NOW() WHERE id = $2 RETURNING id,email,name,role,photo,birth,phone,address,cover,email_verified', [publicPath, req.user.userId]);
    const user = r.rows[0];
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

module.exports = router;
