const nodemailer = require('nodemailer');

let transporter = null;

function isMailConfigured() {
  return Boolean(
    String(process.env.MAIL_USER || '').trim() && String(process.env.MAIL_PASS || '').trim()
  );
}

function getMailTransporter() {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST || 'sandbox.smtp.mailtrap.io',
    port: parseInt(process.env.MAIL_PORT, 10) || 2525,
    auth: {
      user: process.env.MAIL_USER || '',
      pass: process.env.MAIL_PASS || '',
    },
  });

  return transporter;
}

module.exports = { getMailTransporter, isMailConfigured };
