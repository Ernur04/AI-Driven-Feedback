const crypto = require('crypto');

function generateToken(len = 48) {
  return crypto.randomBytes(len).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

module.exports = { generateToken, hashToken };
