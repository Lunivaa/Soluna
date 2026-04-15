import express from "express";
import { db } from "../db.js";
import { authenticate } from "./authRoutes.js";

const router = express.Router();

// Get read notification keys for the current user
router.get("/", authenticate, async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT notif_key FROM user_notification_status WHERE user_id = ? AND is_read = 1",
      [req.userId]
    );
    res.json(rows.map(row => row.notif_key));
  } catch (error) {
    console.error("Error fetching notification status:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Mark multiple notification keys as read
router.post("/mark-read", authenticate, async (req, res) => {
  const { keys } = req.body;
  
  if (!Array.isArray(keys) || keys.length === 0) {
    return res.json({ success: true, message: "No keys provided" });
  }

  try {
    const values = keys.map(key => [req.userId, key, 1]);
    
    // Using ON DUPLICATE KEY UPDATE to handle existing records
    await db.query(
      "INSERT INTO user_notification_status (user_id, notif_key, is_read) VALUES ? ON DUPLICATE KEY UPDATE is_read = 1",
      [values]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
