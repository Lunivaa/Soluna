import express from "express";
import nodemailer from "nodemailer";
import { db } from "../db.js"; 

const router = express.Router();

router.post("/", async (req, res) => {
  const { name, email, message } = req.body;

  // Validate inputs
  if (!name || !email || !message) {
    return res.status(400).json({ message: "All fields are required." });
  }

  try {
    // Store the message in MySQL database
    const [result] = await db.query(
      "INSERT INTO messages (name, email, message) VALUES (?, ?, ?)",
      [name, email, message]
    );

    // Configure Gmail transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "wellnesssoluna@gmail.com",
        pass: "bdauhaictaqgfsvx", 
      },
    });

    // Email content
    const mailOptions = {
      from: `"${name}" <${email}>`,
      to: "wellnesssoluna@gmail.com",
      subject: `New Contact Message from ${name}`,
      text: `You received a new message from ${name} (${email}):\n\n${message}`,
    };

    // Send the email
    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: "Message stored and email sent successfully!" });
  } catch (error) {
    console.error("Error in contact route:", error);
    res.status(500).json({ message: "Failed to send or store message." });
  }
});

export default router;
