// backend/routes/forgotPassword.js
import express from "express";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { db } from "../db.js";
import { emailTemplate } from "../utils/emailTemplate.js";
const router = express.Router();

router.post("/", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required." });

  try {
    const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    if (rows.length === 0) return res.status(404).json({ message: "Account not registered." });

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiry = new Date(Date.now() + 15 * 60 * 1000);

    await db.query(
      "UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE email = ?",
      [tokenHash, expiry, email]
    );

    const resetLink = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASSWORD },
    });

    await transporter.sendMail({
      from: `"Soluna Support" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Reset Your Soluna Password",
      html: emailTemplate({
        title: 'Password Reset',
        preheader: 'Reset your Soluna password — link valid for 15 minutes.',
        bodyHtml: `
          <p style="margin:0 0 16px;font-size:16px;color:#1b1b1b;font-weight:600;">Hi there 👋</p>
          <p style="margin:0 0 20px;font-size:15px;color:#444;line-height:1.7;">
            We received a request to reset your <strong>Soluna</strong> account password.
            Click the button below to set a new password. This link is valid for <strong>15 minutes</strong>.
          </p>
          <div style="text-align:center;margin:28px 0;">
            <a href="${resetLink}" style="display:inline-block;background:#9565B8;color:#ffffff;padding:14px 36px;border-radius:10px;text-decoration:none;font-size:15px;font-weight:600;letter-spacing:0.3px;">
              Reset My Password
            </a>
          </div>
          <p style="margin:0;font-size:13px;color:#888;line-height:1.6;">
            If the button doesn't work, copy and paste this link into your browser:<br/>
            <a href="${resetLink}" style="color:#9565B8;word-break:break-all;">${resetLink}</a>
          </p>
        `
      })
    });

    res.status(200).json({ message: "Reset link sent to your email!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error. Try again later." });
  }
});

export default router;