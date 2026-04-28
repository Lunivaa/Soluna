import express from "express";
import { db } from "../db.js";
import { authenticate } from "./authRoutes.js";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { emailTemplate } from "../utils/emailTemplate.js";
import { ensureSubscriptionRow } from "../utils/subscriptionUtils.js";

const router = express.Router();

// Lazy transporter — ensures dotenv is loaded before reading env vars
let _transporter = null;
function getTransporter() {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASSWORD }
    });
  }
  return _transporter;
}

// eSewa configuration — use environment variables for live production
// Obtain these from the eSewa developer portal
const ESEWA_SECRET = process.env.ESEWA_SECRET_KEY || '8gBm/:&EnhH.1/q';
const ESEWA_PRODUCT_CODE = process.env.ESEWA_PRODUCT_CODE || 'EPAYTEST';



// POST /api/subscription/esewa-sign — generate HMAC-SHA256 signature server-side
router.post("/esewa-sign", authenticate, async (req, res) => {
  const { total_amount, transaction_uuid, product_code } = req.body;
  if (!total_amount || !transaction_uuid || !product_code) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  const message = `total_amount=${total_amount},transaction_uuid=${transaction_uuid},product_code=${product_code}`;
  const signature = crypto.createHmac('sha256', ESEWA_SECRET).update(message).digest('base64');
  res.json({ signature });
});

// GET /api/subscription/usage
router.get("/usage", authenticate, async (req, res) => {
  const userId = req.userId;
  try {
    await ensureSubscriptionRow(userId);

    const [[sub]] = await db.query(
      `SELECT is_premium, subscription_expiry, premium_since, journal_created_total, chatbot_messages_total, artwork_created_total, library_usage_count, plan_type 
       FROM user_subscription WHERE userId = ?`,
      [userId]
    );

    const [[moodRow]] = await db.query(
      `SELECT MIN(DATE_FORMAT(date, '%Y-%m-%d')) AS firstDate FROM mood WHERE userId = ?`,
      [userId]
    );

    let isPremium = sub.is_premium === 1;
    if (isPremium && sub.subscription_expiry && new Date(sub.subscription_expiry) < new Date()) {
      isPremium = false;
      await db.query(`UPDATE user_subscription SET is_premium = 0 WHERE userId = ?`, [userId]);
    }

    res.json({
      chatbotCount: sub.chatbot_messages_total || 0,
      journalCount: sub.journal_created_total || 0,
      artworkCount: sub.artwork_created_total || 0,
      libraryUsageCount: sub.library_usage_count || 0,
      moodTrackingStartDate: moodRow.firstDate || null,
      isPremium,
      subscriptionExpiry: sub.subscription_expiry || null,
      premiumSince: sub.premium_since || null,
      planType: sub.plan_type || 'monthly'
    });
  } catch (err) {
    console.error("Usage fetch error:", err);
    res.status(500).json({ error: "Failed to fetch usage" });
  }
});

// POST /api/subscription/library — log a self-care session
router.post("/library", authenticate, async (req, res) => {
  const userId = req.userId;
  const { sessionType, itemId } = req.body;
  try {
    await ensureSubscriptionRow(userId);
    await db.query(
      `INSERT INTO selfcare_sessions (userId, session_type, item_id) VALUES (?, ?, ?)`,
      [userId, sessionType || 'unknown', itemId || null]
    );
    await db.query(
      `UPDATE user_subscription SET library_usage_count = library_usage_count + 1 WHERE userId = ?`,
      [userId]
    );
    const [[sub]] = await db.query(
      `SELECT library_usage_count FROM user_subscription WHERE userId = ?`,
      [userId]
    );
    res.json({ libraryUsageCount: sub.library_usage_count });
  } catch (err) {
    console.error("Library session error:", err);
    res.status(500).json({ error: "Failed to log session" });
  }
});

// POST /api/subscription/activate
router.post("/activate", authenticate, async (req, res) => {
  const userId = req.userId;
  const { plan } = req.body;
  try {
    await ensureSubscriptionRow(userId);
    const expiry = new Date();
    if (plan === "yearly") {
      expiry.setFullYear(expiry.getFullYear() + 1);
    } else {
      expiry.setMonth(expiry.getMonth() + 1);
    }
    await db.query(
      `UPDATE user_subscription 
       SET is_premium = 1, 
           subscription_expiry = ?, 
           notified_1week = 0, 
           notified_expiry = 0,
           premium_since = IFNULL(premium_since, NOW()),
           plan_type = ?
       WHERE userId = ?`,
      [expiry, plan || 'monthly', userId]
    );

    // Send confirmation email
    try {
      const [[user]] = await db.query(
        `SELECT name, email FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
        [userId]
      );
      if (user?.email) {
        const planLabel = plan === 'yearly' ? 'Yearly Plan' : 'Monthly Plan';
        const amount = plan === 'yearly' ? 'Rs. 5,000' : 'Rs. 500';
        const expiryStr = expiry.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

        const transporter = getTransporter();

        await transporter.sendMail({
          from: `"Soluna Support" <${process.env.EMAIL_USER}>`,
          to: user.email,
          subject: 'Your Soluna Subscription is Now Active',
          html: emailTemplate({
            title: 'Subscription Confirmed',
            preheader: `Your ${planLabel} is now active. Thank you for subscribing to Soluna!`,
            bodyHtml: `
              <p style="margin:0 0 16px;font-size:16px;color:#1b1b1b;font-weight:600;">Hi ${user.name || 'there'} 👋</p>
              <p style="margin:0 0 24px;font-size:15px;color:#444;line-height:1.7;">
                Your payment was successful and your Soluna subscription is now active. Here are your subscription details:
              </p>
              <div style="background:#f9f5ff;border-left:4px solid #9565B8;border-radius:0 8px 8px 0;padding:20px;margin:0 0 24px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:6px 0;font-size:12px;font-weight:700;color:#9565B8;text-transform:uppercase;letter-spacing:0.5px;width:140px;">Account Email</td>
                    <td style="padding:6px 0;font-size:14px;color:#1b1b1b;text-align:left;">
                      <a href="mailto:${user.email}" style="color:#9565B8;text-decoration:none;">${user.email}</a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;font-size:12px;font-weight:700;color:#9565B8;text-transform:uppercase;letter-spacing:0.5px;">Plan Type</td>
                    <td style="padding:6px 0;font-size:14px;color:#1b1b1b;text-align:left;">${planLabel}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;font-size:12px;font-weight:700;color:#9565B8;text-transform:uppercase;letter-spacing:0.5px;">Amount Paid</td>
                    <td style="padding:6px 0;font-size:14px;color:#1b1b1b;text-align:left;">${amount}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;font-size:12px;font-weight:700;color:#9565B8;text-transform:uppercase;letter-spacing:0.5px;">Valid Until</td>
                    <td style="padding:6px 0;font-size:14px;color:#9565B8;text-align:left;font-weight:600;">${expiryStr}</td>
                  </tr>
                </table>
              </div>
              <p style="margin:0 0 24px;font-size:15px;color:#444;line-height:1.7;">
                You now have unlimited access to all Soluna features — journaling, mood tracking, chatbot support, self-care library, and progress reports.
              </p>
              <p style="margin:0;font-size:15px;color:#444;line-height:1.7;">
                Thank you for investing in your mental wellness. We're here with you every step of the way. 💜
              </p>
            `
          })
        });

        // Also notify admin
        await transporter.sendMail({
          from: `"Soluna Support" <${process.env.EMAIL_USER}>`,
          to: process.env.EMAIL_USER,
          subject: `New Subscription Activated: ${user.name || 'User'}`,
          html: emailTemplate({
            title: 'New Subscription',
            preheader: 'A user has just successfully subscribed to a premium plan.',
            bodyHtml: `
              <p style="margin:0 0 16px;font-size:16px;color:#1b1b1b;font-weight:600;">New subscription activated</p>
              <div style="background:#f9f5ff;border-left:4px solid #9565B8;border-radius:0 8px 8px 0;padding:20px;margin:0 0 24px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:6px 0;font-size:12px;font-weight:700;color:#9565B8;text-transform:uppercase;letter-spacing:0.5px;width:140px;">User Name</td>
                    <td style="padding:6px 0;font-size:14px;color:#1b1b1b;text-align:left;">${user.name || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;font-size:12px;font-weight:700;color:#9565B8;text-transform:uppercase;letter-spacing:0.5px;">User Email</td>
                    <td style="padding:6px 0;font-size:14px;color:#1b1b1b;text-align:left;">
                      <a href="mailto:${user.email}" style="color:#9565B8;text-decoration:none;">${user.email}</a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;font-size:12px;font-weight:700;color:#9565B8;text-transform:uppercase;letter-spacing:0.5px;">Plan Type</td>
                    <td style="padding:6px 0;font-size:14px;color:#1b1b1b;text-align:left;">${planLabel}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;font-size:12px;font-weight:700;color:#9565B8;text-transform:uppercase;letter-spacing:0.5px;">Amount</td>
                    <td style="padding:6px 0;font-size:14px;color:#1b1b1b;text-align:left;">${amount}</td>
                  </tr>
                </table>
              </div>
            `
          })
        });
      }
    } catch (mailErr) {
      console.error('Subscription email error:', mailErr.message);
      // Don't fail the activation if email fails
    }

    res.json({ isPremium: true, subscriptionExpiry: expiry.toISOString() });
  } catch (err) {
    console.error("Activate premium error:", err);
    res.status(500).json({ error: "Failed to activate premium" });
  }
});

export default router;
