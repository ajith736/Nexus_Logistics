const nodemailer = require('nodemailer');
const { MailtrapClient } = require('mailtrap');

let transporter = null;
let mailtrapClient = null;

function isMailConfigured() {
  return Boolean(
    String(process.env.MAIL_USER || '').trim() && String(process.env.MAIL_PASS || '').trim()
  );
}

function isMailtrapApiConfigured() {
  return Boolean(String(process.env.MAILTRAP_API_TOKEN || '').trim());
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

function getMailtrapClient() {
  if (mailtrapClient) return mailtrapClient;
  mailtrapClient = new MailtrapClient({
    token: process.env.MAILTRAP_API_TOKEN || '',
  });
  return mailtrapClient;
}

module.exports = {
  getMailTransporter,
  isMailConfigured,
  getMailtrapClient,
  isMailtrapApiConfigured,
};
