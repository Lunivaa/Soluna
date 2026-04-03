import express from "express";
import { db } from "../db.js";
import { authenticate } from "./authRoutes.js";

const router = express.Router();

// Get all artworks for a user
router.get("/", authenticate, async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM artworks WHERE userId = ? ORDER BY createdAt DESC",
      [req.userId]
    );
    res.json(rows);
  } catch (err) {
    console.error("Error fetching artworks:", err);
    res.status(500).json({ error: "Failed to fetch artworks" });
  }
});

// Create a new artwork
router.post("/", authenticate, async (req, res) => {
  try {
    const { title, dataUrl, type, favorite, templateId, backgroundUrl } = req.body;
    
    const [result] = await db.query(
      `INSERT INTO artworks (userId, title, dataUrl, type, favorite, templateId, backgroundUrl, createdAt, updatedAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [req.userId, title, dataUrl, type, favorite || false, templateId || null, backgroundUrl || null]
    );
    
    const [newArtwork] = await db.query(
      "SELECT * FROM artworks WHERE id = ?",
      [result.insertId]
    );
    
    res.status(201).json(newArtwork[0]);
  } catch (err) {
    console.error("Error creating artwork:", err);
    res.status(500).json({ error: "Failed to create artwork" });
  }
});

// Update an artwork
router.put("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, dataUrl, favorite } = req.body;
    
    // Verify ownership
    const [existing] = await db.query(
      "SELECT * FROM artworks WHERE id = ? AND userId = ?",
      [id, req.userId]
    );
    
    if (existing.length === 0) {
      return res.status(404).json({ error: "Artwork not found" });
    }
    
    await db.query(
      `UPDATE artworks 
       SET title = ?, dataUrl = ?, favorite = ?, updatedAt = NOW() 
       WHERE id = ? AND userId = ?`,
      [title, dataUrl, favorite, id, req.userId]
    );
    
    const [updated] = await db.query(
      "SELECT * FROM artworks WHERE id = ?",
      [id]
    );
    
    res.json(updated[0]);
  } catch (err) {
    console.error("Error updating artwork:", err);
    res.status(500).json({ error: "Failed to update artwork" });
  }
});

// Delete an artwork
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verify ownership
    const [existing] = await db.query(
      "SELECT * FROM artworks WHERE id = ? AND userId = ?",
      [id, req.userId]
    );
    
    if (existing.length === 0) {
      return res.status(404).json({ error: "Artwork not found" });
    }
    
    await db.query(
      "DELETE FROM artworks WHERE id = ? AND userId = ?",
      [id, req.userId]
    );
    
    res.json({ message: "Artwork deleted successfully" });
  } catch (err) {
    console.error("Error deleting artwork:", err);
    res.status(500).json({ error: "Failed to delete artwork" });
  }
});

export default router;
