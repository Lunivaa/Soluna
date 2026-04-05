// Shared branded email template for Soluna

export function emailTemplate({ title, preheader, bodyHtml }) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f0eaf8;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;color:#f0eaf8;">${preheader}</div>

  <!-- Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0eaf8;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

          <!-- Header -->
          <tr>
            <td align="center" style="background:#9565B8;border-radius:16px 16px 0 0;padding:36px 40px 28px;">
              <h1 style="margin:0;font-size:28px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Soluna</h1>
              <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.8);letter-spacing:1px;text-transform:uppercase;">${title}</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:36px 40px;border-radius:0 0 16px 16px;box-shadow:0 4px 24px rgba(149,101,184,0.12);">
              ${bodyHtml}

              <!-- Divider -->
              <div style="border-top:1px solid #ede8f5;margin:32px 0 24px;"></div>

              <!-- Footer -->
              <p style="margin:0;font-size:12px;color:#aaa;text-align:center;line-height:1.6;">
                This email was sent by <strong style="color:#9565B8;">Soluna Wellness</strong>.<br/>
                If you didn't request this, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Bottom spacing -->
          <tr><td style="height:32px;"></td></tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
