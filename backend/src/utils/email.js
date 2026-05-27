const nodemailer = require('nodemailer');
require('dotenv').config();

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || ''
    }
  });
}

async function sendEmail(to, subject, text) {
  const transporter = createTransport();
  return transporter.sendMail({ from: process.env.EMAIL_FROM || 'noreply@example.com', to, subject, text });
}

module.exports = { sendEmail };
