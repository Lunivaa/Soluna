import express from "express";
import { db } from "../db.js";
import { authenticate } from "./authRoutes.js";

const router = express.Router();

// Get all entries for the authenticated user
router.get("/", authenticate, async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM journal WHERE userId = ? ORDER BY modified DESC",
      [req.userId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch entries" });
  }
});

// Get single entry by ID for the authenticated user
router.get("/:id", authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query(
      "SELECT * FROM journal WHERE id = ? AND userId = ?",
      [id, req.userId]
    );
    res.json(rows[0] || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch entry" });
  }
});

// Create a new entry for the authenticated user
router.post("/", authenticate, async (req, res) => {
  const { title, content, snippet, favorite } = req.body;
  try {
    const [result] = await db.query(
      "INSERT INTO journal (userId, title, content, snippet, favorite) VALUES (?, ?, ?, ?, ?)",
      [req.userId, title, content, snippet, favorite || false]
    );

    const [newEntry] = await db.query(
      "SELECT * FROM journal WHERE id = ? AND userId = ?",
      [result.insertId, req.userId]
    );

    res.status(201).json(newEntry[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create entry" });
  }
});

// Update an entry for the authenticated user
router.put("/:id", authenticate, async (req, res) => {
  const { id } = req.params;
  const { title, content, snippet, favorite } = req.body;
  try {
    await db.query(
      "UPDATE journal SET title = ?, content = ?, snippet = ?, favorite = ?, modified = NOW() WHERE id = ? AND userId = ?",
      [title, content, snippet, favorite, id, req.userId]
    );

    const [updated] = await db.query(
      "SELECT * FROM journal WHERE id = ? AND userId = ?",
      [id, req.userId]
    );

    res.json(updated[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update entry" });
  }
});

// Delete an entry for the authenticated user
router.delete("/:id", authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    await db.query(
      "DELETE FROM journal WHERE id = ? AND userId = ?",
      [id, req.userId]
    );
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete entry" });
  }
});

export default router;
