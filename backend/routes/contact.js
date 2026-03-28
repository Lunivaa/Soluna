import express from "express";
import nodemailer from "nodemailer";
import { db } from "../db.js";
import { emailTemplate } from "../utils/emailTemplate.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ message: "All fields are required." });
  }

  try {
    await db.query(
      "INSERT INTO messages (name, email, message) VALUES (?, ?, ?)",
      [name, email, message]
    );

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const mailOptions = {
      from: `"Soluna Support" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      subject: `New Contact Message from ${name}`,
      replyTo: email,
      html: emailTemplate({
        title: 'New Contact Message',
        preheader: `${name} sent a message via the Soluna contact form.`,
        bodyHtml: `
          <p style="margin:0 0 16px;font-size:16px;color:#1b1b1b;font-weight:600;">New message received</p>
          <div style="background:#f9f5ff;border-left:4px solid #9565B8;border-radius:0 8px 8px 0;padding:16px 20px;margin:0 0 20px;">
            <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#9565B8;text-transform:uppercase;letter-spacing:0.5px;">From</p>
            <p style="margin:0;font-size:15px;color:#1b1b1b;font-weight:600;">${name}</p>
            <p style="margin:4px 0 0;font-size:14px;color:#666;">
              <a href="mailto:${email}" style="color:#9565B8;text-decoration:none;">${email}</a>
            </p>
          </div>
          <div style="background:#f9f5ff;border-left:4px solid #9565B8;border-radius:0 8px 8px 0;padding:16px 20px;">
            <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#9565B8;text-transform:uppercase;letter-spacing:0.5px;">Message</p>
            <p style="margin:0;font-size:15px;color:#444;line-height:1.7;">${message.replace(/\n/g, '<br/>')}</p>
          </div>
        `
      })
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: "Message stored and email sent successfully!" });
  } catch (error) {
    console.error("Error in contact route:", error);
    res.status(500).json({ message: "Failed to send or store message." });
  }
});

export default router;