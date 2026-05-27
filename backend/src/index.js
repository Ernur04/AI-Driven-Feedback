const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
require('dotenv').config();
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
const winston = require('winston');
const session = require('express-session');

const { init } = require('./db');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const passwordRoutes = require('./routes/password');
const oauthRoutes = require('./routes/oauth');
const verifyRoutes = require('./routes/verify');
const passport = require('./passport');

const app = express();

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

app.use(helmet());
app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json());

// setup logging
const logDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.File({ filename: path.join(logDir, 'combined.log') })]
});
app.use(morgan('combined', { stream: fs.createWriteStream(path.join(logDir, 'access.log'), { flags: 'a' }) }));

app.use(
  rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 100
  })
);

// ensure uploads dir exists and expose it
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
app.use('/uploads', express.static(uploadsDir));

// session + passport (must be before routes that use passport)
app.use(session({
  secret: process.env.SESSION_SECRET || process.env.JWT_SECRET || 'change_me',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production', sameSite: 'lax' }
}));

app.use(passport.initialize());
app.use(passport.session());

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/auth', passwordRoutes);
app.use('/api/auth/oauth', oauthRoutes);
app.use('/api/auth/verify', verifyRoutes);

const PORT = process.env.PORT || 4000;

init()
  .then(() => {
    app.listen(PORT, () => logger.info(`Server running on ${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to init DB', err);
    process.exit(1);
  });
