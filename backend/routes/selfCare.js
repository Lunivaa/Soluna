import express from "express";
import { db } from "../db.js";

const router = express.Router();

// Get all self-care items by category
router.get('/:category', async (req, res) => {
  try {
    const { category } = req.params;
    
    // Validate category
    const validCategories = ['breathing', 'sound', 'meditation', 'art'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    const query = `
      SELECT id, title, category, description, audio_url, thumbnail_url, duration, is_loop, 
             inhale_duration, hold_duration, exhale_duration, rest_duration, created_at
      FROM selfCare 
      WHERE category = ? 
      ORDER BY id ASC
    `;
    
    const [rows] = await db.execute(query, [category]);
    
    // Format duration for frontend (convert seconds to minutes:seconds)
    const formattedRows = rows.map(row => ({
      ...row,
      description: row.description || `${row.category} audio for relaxation and peace`, // Use database description or fallback
      duration_formatted: row.duration ? `${Math.floor(row.duration / 60)}:${(row.duration % 60).toString().padStart(2, '0')}` : null
    }));
    
    res.json(formattedRows);
  } catch (error) {
    console.error('Error fetching self-care items:', error);
    res.status(500).json({ error: 'Failed to fetch self-care items' });
  }
});

// Get featured items (limit 3 per category for homepage)
router.get('/featured/:category', async (req, res) => {
  try {
    const { category } = req.params;
    
    // Validate category
    const validCategories = ['breathing', 'sound', 'meditation', 'art'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    const query = `
      SELECT id, title, category, description, audio_url, thumbnail_url, duration, is_loop, created_at
      FROM selfCare 
      WHERE category = ? 
      ORDER BY created_at DESC
      LIMIT 3
    `;
    
    const [rows] = await db.execute(query, [category]);
    
    // Format duration for frontend
    const formattedRows = rows.map(row => ({
      ...row,
      description: row.description || `${row.category} audio for relaxation and peace`, // Use database description or fallback
      duration_formatted: row.duration ? `${Math.floor(row.duration / 60)}:${(row.duration % 60).toString().padStart(2, '0')}` : null
    }));
    
    res.json(formattedRows);
  } catch (error) {
    console.error('Error fetching featured self-care items:', error);
    res.status(500).json({ error: 'Failed to fetch featured self-care items' });
  }
});

// Get single self-care item by ID
router.get('/item/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT id, title, category, description, audio_url, thumbnail_url, duration, is_loop,
             inhale_duration, hold_duration, exhale_duration, rest_duration, created_at
      FROM selfCare 
      WHERE id = ?
    `;
    
    const [rows] = await db.execute(query, [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Self-care item not found' });
    }
    
    const item = rows[0];
    item.description = item.description || `${item.category} audio for relaxation and peace`; // Use database description or fallback
    item.duration_formatted = item.duration ? `${Math.floor(item.duration / 60)}:${(item.duration % 60).toString().padStart(2, '0')}` : null;
    
    res.json(item);
  } catch (error) {
    console.error('Error fetching self-care item:', error);
    res.status(500).json({ error: 'Failed to fetch self-care item' });
  }
});

// Create new self-care item (admin only - you can add auth middleware later)
router.post('/', async (req, res) => {
  try {
    const { 
      id, 
      title, 
      category, 
      description,
      audio_url, 
      thumbnail_url, 
      duration, 
      is_loop,
      inhale_duration,
      hold_duration,
      exhale_duration,
      rest_duration
    } = req.body;
    
    // Validate required fields
    if (!id || !title || !category) {
      return res.status(400).json({ error: 'ID, title, and category are required' });
    }
    
    // Validate category
    const validCategories = ['breathing', 'sound', 'meditation', 'art'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }
    
    // For sound and meditation categories, audio_url is required
    if ((category === 'sound' || category === 'meditation') && !audio_url) {
      return res.status(400).json({ error: 'audio_url is required for this category' });
    }
    
    const query = `
      INSERT INTO selfCare (
        id, title, category, description, audio_url, thumbnail_url, duration, is_loop,
        inhale_duration, hold_duration, exhale_duration, rest_duration
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await db.execute(query, [
      id,
      title,
      category,
      description || null,
      audio_url || '', // Use empty string instead of null for breathing exercises
      thumbnail_url || null,
      duration || null,
      is_loop !== undefined ? is_loop : true,
      inhale_duration || null,
      hold_duration || null,
      exhale_duration || null,
      rest_duration || null
    ]);
    
    // Return the created item
    const [newItem] = await db.execute(
      'SELECT * FROM selfCare WHERE id = ?',
      [id]
    );
    
    res.status(201).json(newItem[0]);
  } catch (error) {
    console.error('Error creating self-care item:', error);
    res.status(500).json({ error: 'Failed to create self-care item', details: error.message });
  }
});

// Update self-care item (admin only)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      title, 
      category, 
      description,
      audio_url, 
      thumbnail_url, 
      duration, 
      is_loop,
      inhale_duration,
      hold_duration,
      exhale_duration,
      rest_duration
    } = req.body;
    
    // Check if item exists
    const [existing] = await db.execute('SELECT id FROM selfCare WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Self-care item not found' });
    }
    
    // Validate category if provided
    if (category) {
      const validCategories = ['breathing', 'sound', 'meditation', 'art'];
      if (!validCategories.includes(category)) {
        return res.status(400).json({ error: 'Invalid category' });
      }
    }
    
    const query = `
      UPDATE selfCare 
      SET title = COALESCE(?, title),
          category = COALESCE(?, category),
          description = COALESCE(?, description),
          audio_url = COALESCE(?, audio_url),
          thumbnail_url = COALESCE(?, thumbnail_url),
          duration = COALESCE(?, duration),
          is_loop = COALESCE(?, is_loop),
          inhale_duration = COALESCE(?, inhale_duration),
          hold_duration = COALESCE(?, hold_duration),
          exhale_duration = COALESCE(?, exhale_duration),
          rest_duration = COALESCE(?, rest_duration)
      WHERE id = ?
    `;
    
    await db.execute(query, [
      title || null,
      category || null,
      description || null,
      audio_url || null,
      thumbnail_url || null,
      duration || null,
      is_loop !== undefined ? is_loop : null,
      inhale_duration || null,
      hold_duration || null,
      exhale_duration || null,
      rest_duration || null,
      id
    ]);
    
    // Return updated item
    const [updated] = await db.execute('SELECT * FROM selfCare WHERE id = ?', [id]);
    res.json(updated[0]);
  } catch (error) {
    console.error('Error updating self-care item:', error);
    res.status(500).json({ error: 'Failed to update self-care item' });
  }
});

// Delete self-care item (admin only)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if item exists
    const [existing] = await db.execute('SELECT id FROM selfCare WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Self-care item not found' });
    }
    
    await db.execute('DELETE FROM selfCare WHERE id = ?', [id]);
    res.json({ message: 'Self-care item deleted successfully' });
  } catch (error) {
    console.error('Error deleting self-care item:', error);
    res.status(500).json({ error: 'Failed to delete self-care item' });
  }
});

// Get all categories with counts
router.get('/stats/categories', async (req, res) => {
  try {
    const query = `
      SELECT 
        category,
        COUNT(*) as count,
        AVG(duration) as avg_duration
      FROM selfCare 
      GROUP BY category
      ORDER BY category
    `;
    
    const [rows] = await db.execute(query);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching category stats:', error);
    res.status(500).json({ error: 'Failed to fetch category statistics' });
  }
});

export default router;