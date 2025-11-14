// backend/routes/forgotPassword.js
import express from "express";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { db } from "../db.js";
const router = express.Router();

router.post("/", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required." });

  try {
    const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    if (rows.length === 0) return res.status(404).json({ message: "Account not registered." });

    // Generate token
    const token = crypto.randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store token and expiry in DB
    await db.query(
      "UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE email = ?",
      [token, expiry, email]
    );

    // Send email
    const resetLink = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    await transporter.sendMail({
      from: `"Soluna Support 🌙" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Reset Your Soluna Password 🪷",
      html: `
        <div style="font-family: Arial, sans-serif; color: #1b1b1b; line-height: 1.6;">
          <h2 style="color: #9565B8;">Hello from Soluna 🪷</h2>
          <p>You requested a password reset. This link is valid for 15 minutes.</p>
          <p style="text-align: left; margin: 20px 0;">
            <a href="${resetLink}" style="background-color: #9565B8; color: #E7EBDC; padding: 12px 20px; border-radius: 10px; text-decoration: none; font-weight: 600;">
              Reset Your Password
            </a>
          </p>
          <p>If you didn't request this, ignore this email. 🌸</p>
          <p style="font-size: 12px; color: #666666;">With care,<br>The Soluna Team</p>
        </div>
      `,
    });

    res.status(200).json({ message: "Reset link sent to your email!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error. Try again later." });
  }
});

export default router;