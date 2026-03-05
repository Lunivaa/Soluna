import express from "express";
import { db } from "../db.js";
import { authenticate } from "./authRoutes.js";

const router = express.Router();

// Helper function to get local date string (truly local, not UTC-based)
const getLocalDateString = (date = new Date()) => {
  // Get truly local date using toLocaleDateString and parsing it back
  const localDateStr = date.toLocaleDateString('en-CA'); // 'en-CA' gives YYYY-MM-DD format
  return localDateStr;
};

// ➕ Log mood (server decides date using local time)
router.post("/", authenticate, async (req, res) => {
  const { mood } = req.body;
  const userId = req.userId;

  if (!mood) {
    return res.status(400).json({ error: "Mood is required" });
  }

  const today = getLocalDateString();

  const sql = `
    INSERT INTO mood (userId, date, mood)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE mood = VALUES(mood)
  `;

  try {
    await db.query(sql, [userId, today, mood]);
    res.json({ success: true, mood, date: today });
  } catch (err) {
    console.error("Mood insert error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// 📥 Get mood history + today status
router.get("/", authenticate, async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT DATE_FORMAT(date, '%Y-%m-%d') as date_str, mood FROM mood WHERE userId = ?",
      [req.userId]
    );

    const history = {};
    const today = getLocalDateString();
    let todayLogged = false;
    let todayMood = null;

    rows.forEach(r => {
      const key = r.date_str;
      history[key] = r.mood;

      if (key === today) {
        todayLogged = true;
        todayMood = r.mood;
      }
    });

    res.json({ history, todayLogged, todayMood });
  } catch (err) {
    console.error("Mood fetch error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

export default router;