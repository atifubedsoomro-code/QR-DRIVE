/**
 * Send an email directly via Gmail API using the authenticated user's account
 */
export interface SendEmailParams {
  to: string;
  subject: string;
  documentTitle: string;
  documentUrl: string;
  qrDataUrl?: string;
  customMessage?: string;
  userEmail: string;
  userName?: string;
  accessToken: string;
}

export async function sendEmailViaGmail({
  to,
  subject,
  documentTitle,
  documentUrl,
  qrDataUrl,
  customMessage,
  userEmail,
  userName,
  accessToken,
}: SendEmailParams): Promise<{ messageId: string }> {
  if (!accessToken) {
    throw new Error('Access token is required. Please sign in with Google.');
  }

  // Construct styled responsive HTML email
  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 32px 24px; color: #ffffff; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
    .header p { margin: 8px 0 0; font-size: 14px; opacity: 0.85; }
    .content { padding: 32px 24px; }
    .doc-box { background: #f1f5f9; border-left: 4px solid #3b82f6; padding: 16px 20px; border-radius: 6px; margin: 20px 0; }
    .doc-title { font-size: 18px; font-weight: 700; color: #0f172a; margin: 0 0 6px; }
    .doc-meta { font-size: 13px; color: #64748b; margin: 0; }
    .btn-container { text-align: center; margin: 32px 0 24px; }
    .btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; padding: 14px 28px; text-decoration: none; font-weight: 600; font-size: 15px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2); }
    .qr-section { text-align: center; padding: 24px 0; border-top: 1px dashed #e2e8f0; margin-top: 24px; }
    .qr-text { font-size: 13px; color: #64748b; margin-top: 8px; }
    .footer { background: #f8fafc; padding: 20px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
    .note { margin-top: 16px; font-size: 14px; line-height: 1.6; color: #334155; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Shared Document</h1>
      <p>Prepared by ${escapeHtml(userName || userEmail)}</p>
    </div>
    <div class="content">
      <p style="font-size: 15px; margin: 0 0 16px;">Hello,</p>
      <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px;">
        ${escapeHtml(userName || userEmail)} has shared a digital document with you via <strong>DocQR</strong>.
      </p>

      ${customMessage ? `<div class="note"><strong>Personal Message:</strong><br>${escapeHtml(customMessage)}</div>` : ''}

      <div class="doc-box">
        <div class="doc-title">${escapeHtml(documentTitle)}</div>
        <div class="doc-meta">Access direct soft copy on Google Drive with Public Viewer link</div>
      </div>

      <div class="btn-container">
        <a href="${documentUrl}" class="btn" target="_blank" rel="noopener noreferrer">
          Open Document in Google Drive
        </a>
      </div>

      ${
        qrDataUrl
          ? `
      <div class="qr-section">
        <img src="${qrDataUrl}" alt="Document QR Code" width="160" height="160" style="display: inline-block; border-radius: 8px; border: 1px solid #cbd5e1; padding: 6px; background: #ffffff;" />
        <div class="qr-text">Scan this QR code with any mobile device to view immediately on Google Drive</div>
      </div>
      `
          : ''
      }
    </div>
    <div class="footer">
      Sent with DocQR • Cloud-Enabled Smart Document Cover Pages & Soft-Copy Access
    </div>
  </div>
</body>
</html>
  `;

  // Construct raw RFC 2822 email
  const fromHeader = userName ? `"${encodeHeader(userName)}" <${userEmail}>` : userEmail;
  const rawEmailParts = [
    `From: ${fromHeader}`,
    `To: ${to}`,
    `Subject: ${encodeHeader(subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 7bit',
    '',
    htmlBody,
  ].join('\r\n');

  // Base64url encode without padding
  const encodedEmail = btoa(unescape(encodeURIComponent(rawEmailParts)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: encodedEmail }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gmail send error:', response.status, errorText);
    throw new Error(`Failed to send email via Gmail (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  return { messageId: result.id };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function encodeHeader(str: string): string {
  // If ASCII only, return as is
  if (/^[\x00-\x7F]*$/.test(str)) {
    return str;
  }
  return `=?utf-8?B?${btoa(unescape(encodeURIComponent(str)))}?=`;
}
