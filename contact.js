import express from "express";
import nodemailer from "nodemailer";

const router = express.Router();

// POST route to send support email
router.post("/", async (req, res) => {
  const { name, email, message } = req.body;

  // Validate required field
  if (!message) return res.status(400).json({ message: "Message is required." });

  try {
    // Configure Gmail transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "wellnesssoluna@gmail.com",
        pass: "bdauhaictaqgfsvx", 
      },
    });

    // Email details
    const mailOptions = {
      from: `"${name || "Soluna User"}" <wellnesssoluna@gmail.com>`,
      replyTo: email || "noreply@example.com",
      to: "wellnesssoluna@gmail.com",
      subject: `Support Request from ${name || "Soluna User"}`,
      text: message,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: "Message sent successfully!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to send message." });
  }
});

export default router;
