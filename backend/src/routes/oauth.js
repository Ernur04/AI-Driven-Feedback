const express = require('express');
const passport = require('passport');
const router = express.Router();
const { signAccess, generateRefresh, saveRefresh } = require('../auth');

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/' }), async (req, res) => {
  if (!req.user) return res.status(401).send('Auth failed');
  try {
    const accessToken = signAccess(req.user);
    const refreshToken = generateRefresh();
    await saveRefresh(req.user.id, refreshToken);
    res.json({ accessToken, refreshToken, user: req.user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));

router.get('/github/callback', passport.authenticate('github', { failureRedirect: '/' }), async (req, res) => {
  if (!req.user) return res.status(401).send('Auth failed');
  try {
    const accessToken = signAccess(req.user);
    const refreshToken = generateRefresh();
    await saveRefresh(req.user.id, refreshToken);
    res.json({ accessToken, refreshToken, user: req.user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

module.exports = router;
