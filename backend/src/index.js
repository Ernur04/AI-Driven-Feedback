const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
require('dotenv').config();

const { init } = require('./db');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const passwordRoutes = require('./routes/password');
const oauthRoutes = require('./routes/oauth');
const verifyRoutes = require('./routes/verify');
const passport = require('./passport');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
const winston = require('winston');

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

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/auth', passwordRoutes);
app.use('/api/auth/oauth', oauthRoutes);
app.use(passport.initialize());
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
