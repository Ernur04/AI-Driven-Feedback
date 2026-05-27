const express = require('express');
const passport = require('passport');
const router = express.Router();

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', passport.authenticate('google', { session: false }), (req, res) => {
  // After successful auth, passport will set req.user
  if (!req.user) return res.status(401).send('Auth failed');
  res.json({ user: req.user });
});

router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));

router.get('/github/callback', passport.authenticate('github', { session: false }), (req, res) => {
  if (!req.user) return res.status(401).send('Auth failed');
  res.json({ user: req.user });
});

module.exports = router;
