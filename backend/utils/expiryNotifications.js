import { db } from "../db.js";
import nodemailer from "nodemailer";
import { emailTemplate } from "./emailTemplate.js";

// Helper to get transporter (reuse logic from routes)
function getTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASSWORD }
  });
}

export async function checkSubscriptionExpiries() {
  const transporter = getTransporter();

  try {
    // 1. Check for expiries in 7 days
    const [sevenDayUsers] = await db.query(`
      SELECT u.id, u.name, u.email, s.subscription_expiry 
      FROM users u
      JOIN user_subscription s ON u.id = s.userId
      WHERE s.is_premium = 1 
        AND s.notified_1week = 0 
        AND DATE(s.subscription_expiry) = DATE_ADD(CURDATE(), INTERVAL 7 DAY)
    `);

    for (const user of sevenDayUsers) {
      const expiryStr = new Date(user.subscription_expiry).toLocaleDateString('en-US', { 
        year: 'numeric', month: 'long', day: 'numeric' 
      });
      
      const emailParams = {
        title: 'Subscription Expiring Soon',
        preheader: `Premium access for ${user.name} will expire in one week.`,
        bodyHtml: `
          <p style="margin:0 0 16px;font-size:15px;color:#444;line-height:1.7;">
            This is a notification that the following Soluna premium subscription is approaching its end date in 7 days.
          </p>
          <div style="background:#f9f5ff;border-left:4px solid #9565B8;border-radius:0 8px 8px 0;padding:20px;margin:0 0 24px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:4px 0;font-size:12px;font-weight:700;color:#9565B8;text-transform:uppercase;letter-spacing:0.5px;width:140px;">User Name</td>
                <td style="padding:4px 0;font-size:14px;color:#1b1b1b;text-align:left;">${user.name || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding:4px 0;font-size:12px;font-weight:700;color:#9565B8;text-transform:uppercase;letter-spacing:0.5px;">User Email</td>
                <td style="padding:4px 0;font-size:14px;color:#1b1b1b;text-align:left;">
                   <a href="mailto:${user.email}" style="color:#9565B8;text-decoration:none;">${user.email}</a>
                </td>
              </tr>
              <tr>
                <td style="padding:4px 0;font-size:12px;font-weight:700;color:#9565B8;text-transform:uppercase;letter-spacing:0.5px;">Expiry Date</td>
                <td style="padding:4px 0;font-size:14px;color:#1b1b1b;text-align:left;">${expiryStr}</td>
              </tr>
            </table>
          </div>
        `
      };

      // Send to User
      await transporter.sendMail({
        from: `"Soluna Support" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: "Your Soluna Subscription Expires in 7 Days",
        html: emailTemplate({
          ...emailParams,
          bodyHtml: `
            <p style="margin:0 0 16px;font-size:15px;color:#444;line-height:1.7;">
              Providing you a gentle reminder that your Soluna premium subscription is approaching its end date.
            </p>
            ${emailParams.bodyHtml.split('</p>')[1]}
            <p style="margin:0 0 24px;font-size:15px;color:#444;line-height:1.7;">
              Renew now to continue having unlimited access to your journal, mood insights, and wellness companion.
            </p>
            <div style="text-align:center;margin:28px 0;">
              <a href="${process.env.CLIENT_URL}/home" style="display:inline-block;background:#9565B8;color:#ffffff;padding:14px 36px;border-radius:10px;text-decoration:none;font-size:15px;font-weight:600;">
                Renew Subscription
              </a>
            </div>
          `
        })
      });

      // Send to Admin
      await transporter.sendMail({
        from: `"Soluna Support" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_USER,
        subject: `[Admin] Subscription Expiring Soon: ${user.name}`,
        html: emailTemplate({
          ...emailParams,
          title: 'User Subscription Expiring'
        })
      });
      
      await db.query("UPDATE user_subscription SET notified_1week = 1 WHERE userId = ?", [user.id]);
      console.log(`[Scheduler] 7-day notification sent to user and admin for ${user.email}`);
    }

    // 2. Check for expiries TODAY
    const [todayUsers] = await db.query(`
      SELECT u.id, u.name, u.email, s.subscription_expiry 
      FROM users u
      JOIN user_subscription s ON u.id = s.userId
      WHERE s.is_premium = 1 
        AND s.notified_expiry = 0 
        AND DATE(s.subscription_expiry) <= CURDATE()
    `);

    for (const user of todayUsers) {
      const emailParams = {
        title: 'Subscription Expired',
        preheader: `The premium subscription for ${user.name} has expired.`,
        bodyHtml: `
          <p style="margin:0 0 16px;font-size:15px;color:#444;line-height:1.7;">
            The following Soluna premium subscription has officially expired and the account has returned to the free plan.
          </p>
          <div style="background:#f9f5ff;border-left:4px solid #9565B8;border-radius:0 8px 8px 0;padding:20px;margin:0 0 24px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:4px 0;font-size:12px;font-weight:700;color:#9565B8;text-transform:uppercase;letter-spacing:0.5px;width:140px;">User Name</td>
                <td style="padding:4px 0;font-size:14px;color:#1b1b1b;text-align:left;">${user.name || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding:4px 0;font-size:12px;font-weight:700;color:#9565B8;text-transform:uppercase;letter-spacing:0.5px;">User Email</td>
                <td style="padding:4px 0;font-size:14px;color:#1b1b1b;text-align:left;">
                   <a href="mailto:${user.email}" style="color:#9565B8;text-decoration:none;">${user.email}</a>
                </td>
              </tr>
              <tr>
                <td style="padding:4px 0;font-size:12px;font-weight:700;color:#9565B8;text-transform:uppercase;letter-spacing:0.5px;">Status</td>
                <td style="padding:4px 0;font-size:14px;color:#df4444;text-align:left;font-weight:600;">EXPIRED</td>
              </tr>
            </table>
          </div>
        `
      };

      // Send to User
      await transporter.sendMail({
        from: `"Soluna Support" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: "Your Soluna Subscription has Expired",
        html: emailTemplate({
          ...emailParams,
          bodyHtml: `
            <p style="margin:0 0 16px;font-size:15px;color:#444;line-height:1.7;">
              Your Soluna premium subscription has expired. Your account has returned to the free plan.
            </p>
            ${emailParams.bodyHtml.split('</p>')[1]}
            <p style="margin:0 0 24px;font-size:15px;color:#444;line-height:1.7;">
              Don't worry—your data is safe, but some features may now have usage limits. You can upgrade anytime to restore full access.
            </p>
            <div style="text-align:center;margin:28px 0;">
              <a href="${process.env.CLIENT_URL}/home" style="display:inline-block;background:#9565B8;color:#ffffff;padding:14px 36px;border-radius:10px;text-decoration:none;font-size:15px;font-weight:600;">
                Upgrade for Unlimited Access
              </a>
            </div>
          `
        })
      });

      // Send to Admin
      await transporter.sendMail({
        from: `"Soluna Support" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_USER,
        subject: `[Admin] Subscription Expired: ${user.name}`,
        html: emailTemplate({
          ...emailParams,
          title: 'User Subscription Expired'
        })
      });
      
      // Update is_premium to 0 and mark as notified
      await db.query(`
        UPDATE user_subscription 
        SET is_premium = 0, notified_expiry = 1, notified_1week = 0 
        WHERE userId = ?
      `, [user.id]);
      console.log(`[Scheduler] Expiry notification sent to user and admin for ${user.email}`);
    }

  } catch (err) {
    console.error("[Scheduler] Error checking expiries:", err);
  }
}
