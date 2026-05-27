const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool } = require('./db');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'change_me';
const ACCESS_EXP = process.env.ACCESS_TOKEN_EXPIRY || '15m';
const REFRESH_DAYS = parseInt(process.env.REFRESH_TOKEN_EXPIRY_DAYS || '30', 10);

function signAccess(user) {
  return jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: ACCESS_EXP });
}

function verifyAccess(token) {
  return jwt.verify(token, JWT_SECRET);
}

const { hashToken } = require('./utils/token');

function generateRefresh() {
  return crypto.randomBytes(48).toString('hex');
}

async function saveRefresh(userId, token, days = REFRESH_DAYS) {
  const hash = hashToken(token);
  const now = new Date();
  const expires_at = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  await pool.query(
    'INSERT INTO refresh_tokens(token_hash, user_id, expires_at, created_at, revoked) VALUES($1,$2,$3,NOW(),false)',
    [hash, userId, expires_at]
  );
}

async function revokeRefreshHash(hash) {
  await pool.query('UPDATE refresh_tokens SET revoked = true WHERE token_hash = $1', [hash]);
}

module.exports = { signAccess, verifyAccess, generateRefresh, hashToken, saveRefresh, revokeRefreshHash };
