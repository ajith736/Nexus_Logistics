const { getMailTransporter, isMailConfigured } = require('../config/mailer');

const FROM_ADDRESS = process.env.MAIL_FROM || 'noreply@nexuslogistics.io';

/**
 * Sends a bulk-upload summary email to the dispatcher who triggered the upload.
 */
async function sendUploadReport({ to, originalName, totalRows, successCount, failCount, errorFileUrl }) {
  if (!isMailConfigured()) {
    return;
  }

  const transporter = getMailTransporter();

  const hasFailures = failCount > 0;
  const subject = hasFailures
    ? `Upload "${originalName}" completed with ${failCount} error(s)`
    : `Upload "${originalName}" completed successfully`;

  const html = `
    <h2>Bulk Upload Report</h2>
    <table style="border-collapse:collapse;">
      <tr><td style="padding:4px 12px;font-weight:bold;">File</td><td style="padding:4px 12px;">${originalName}</td></tr>
      <tr><td style="padding:4px 12px;font-weight:bold;">Total rows</td><td style="padding:4px 12px;">${totalRows}</td></tr>
      <tr><td style="padding:4px 12px;font-weight:bold;">Succeeded</td><td style="padding:4px 12px;color:green;">${successCount}</td></tr>
      <tr><td style="padding:4px 12px;font-weight:bold;">Failed</td><td style="padding:4px 12px;color:${hasFailures ? 'red' : 'green'};">${failCount}</td></tr>
    </table>
    ${hasFailures ? `<p>Download the <a href="${errorFileUrl}">error report CSV</a> for details on failed rows.</p>` : ''}
  `.trim();

  try {
    await transporter.sendMail({
      from: FROM_ADDRESS,
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error('Failed to send upload report email:', err.message);
  }
}

module.exports = { sendUploadReport };
