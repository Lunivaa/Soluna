// backend/routes/resetPassword.js
import express from "express";
import bcrypt from "bcryptjs";
import { db } from "../db.js";
const router = express.Router();

router.post("/", async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ message: "Token and password are required." });

  try {
    const [rows] = await db.query(
      "SELECT * FROM users WHERE reset_token = ? AND reset_token_expiry > ?",
      [token, new Date()]
    );
    if (rows.length === 0) return res.status(400).json({ message: "Invalid or expired token." });

    const user = rows[0];

    // Check if new password is same as old
    const isSame = await bcrypt.compare(password, user.password);
    if (isSame) return res.status(400).json({ message: "New password cannot be same as old password." });

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update password and clear token
    await db.query(
      "UPDATE users SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?",
      [hashedPassword, user.id]
    );

    res.status(200).json({ message: "Password updated successfully!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error. Try again later." });
  }
});

export default router;
