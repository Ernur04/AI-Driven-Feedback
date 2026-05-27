const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const { pool } = require('./db');
require('dotenv').config();

async function findOrCreateOAuthUser(provider, profile) {
  const email = (profile.emails && profile.emails[0] && profile.emails[0].value) || null;
  const providerId = profile.id;
  // find existing oauth_accounts
  const r = await pool.query('SELECT user_id FROM oauth_accounts WHERE provider=$1 AND provider_user_id=$2', [provider, providerId]);
  if (r.rows[0]) {
    const userRow = await pool.query('SELECT id,email,name,role FROM users WHERE id=$1', [r.rows[0].user_id]);
    return userRow.rows[0];
  }
  // try find by email
  if (email) {
    const u = await pool.query('SELECT id,email,name,role FROM users WHERE email=$1', [email.toLowerCase()]);
    if (u.rows[0]) {
      await pool.query('INSERT INTO oauth_accounts(user_id,provider,provider_user_id,provider_email) VALUES($1,$2,$3,$4)', [u.rows[0].id, provider, providerId, email]);
      return u.rows[0];
    }
  }
  // create user with explicit default role to match frontend expectations
  const insert = await pool.query('INSERT INTO users(email,name,role,email_verified,created_at) VALUES($1,$2,$3,true,NOW()) RETURNING id,email,name,role', [email || null, profile.displayName || null, 'student']);
  const newUser = insert.rows[0];
  await pool.query('INSERT INTO oauth_accounts(user_id,provider,provider_user_id,provider_email) VALUES($1,$2,$3,$4)', [newUser.id, provider, providerId, email]);
  return newUser;
}

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK || '/api/auth/oauth/google/callback'
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const user = await findOrCreateOAuthUser('google', profile);
      done(null, user);
    } catch (err) {
      done(err);
    }
  }));
}

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: process.env.GITHUB_CALLBACK || '/api/auth/oauth/github/callback'
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const user = await findOrCreateOAuthUser('github', profile);
      done(null, user);
    } catch (err) {
      done(err);
    }
  }));
}

// Serialize / deserialize for session support
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const r = await pool.query('SELECT id,email,name,role FROM users WHERE id=$1', [id]);
    done(null, r.rows[0]);
  } catch (err) {
    done(err);
  }
});

module.exports = passport;
