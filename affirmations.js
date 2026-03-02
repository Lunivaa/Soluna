import express from "express";
import { db } from "../db.js";
import { authenticate } from "./authRoutes.js";

const router = express.Router();

// 📥 Get all affirmations (for admin panel)
router.get("/all", authenticate, async (req, res) => {
  try {
    const sql = `
      SELECT id, text, mood, isActive
      FROM affirmations
      ORDER BY mood ASC, id ASC
    `;

    const [results] = await db.query(sql);
    
    // Format for admin panel
    const formattedResults = results.map(row => ({
      id: row.id,
      text: row.text,
      moodNumber: row.mood,
      status: row.isActive ? 'active' : 'suspended'
    }));

    res.json(formattedResults || []);
  } catch (err) {
    console.error("Affirmations fetch error:", err);
    return res.status(500).json({ error: "Database error" });
  }
});

// 📝 Create new affirmation
router.post("/", authenticate, async (req, res) => {
  const { text, mood } = req.body;

  if (!text || !mood) {
    return res.status(400).json({ error: "Text and mood are required" });
  }

  if (isNaN(mood) || mood < 1 || mood > 10) {
    return res.status(400).json({ error: "Mood must be between 1-10" });
  }

  try {
    const sql = `INSERT INTO affirmations (text, mood, isActive) VALUES (?, ?, 1)`;
    const [result] = await db.query(sql, [text, mood]);

    res.json({
      id: result.insertId,
      text,
      moodNumber: mood,
      status: 'active'
    });
  } catch (err) {
    console.error("Affirmation create error:", err);
    return res.status(500).json({ error: "Database error" });
  }
});

// ✏️ Update affirmation
router.put("/:id", authenticate, async (req, res) => {
  const { id } = req.params;
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ error: "Text is required" });
  }

  try {
    const sql = `UPDATE affirmations SET text = ? WHERE id = ?`;
    await db.query(sql, [text, id]);

    res.json({ success: true });
  } catch (err) {
    console.error("Affirmation update error:", err);
    return res.status(500).json({ error: "Database error" });
  }
});

// 🔄 Toggle affirmation status
router.patch("/:id/toggle", authenticate, async (req, res) => {
  const { id } = req.params;

  try {
    const sql = `UPDATE affirmations SET isActive = NOT isActive WHERE id = ?`;
    await db.query(sql, [id]);

    res.json({ success: true });
  } catch (err) {
    console.error("Affirmation toggle error:", err);
    return res.status(500).json({ error: "Database error" });
  }
});

// 🗑️ Delete affirmation
router.delete("/:id", authenticate, async (req, res) => {
  const { id } = req.params;

  try {
    const sql = `DELETE FROM affirmations WHERE id = ?`;
    await db.query(sql, [id]);

    res.json({ success: true });
  } catch (err) {
    console.error("Affirmation delete error:", err);
    return res.status(500).json({ error: "Database error" });
  }
});

// 📥 Get affirmations for a specific mood value (1-10)
router.get("/:mood", authenticate, async (req, res) => {
  const mood = parseInt(req.params.mood);

  if (isNaN(mood) || mood < 1 || mood > 10) {
    return res.status(400).json({ error: "Invalid mood value. Must be 1-10." });
  }

  try {
    const sql = `
      SELECT id, text
      FROM affirmations
      WHERE mood = ? AND isActive = 1
      ORDER BY id ASC
    `;

    const [results] = await db.query(sql, [mood]);

    res.json(results || []);
  } catch (err) {
    console.error("Affirmations fetch error:", err);
    return res.status(500).json({ error: "Database error" });
  }
});

export default router;