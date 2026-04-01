import express from "express";
import { db } from "../db.js";
import jwt from "jsonwebtoken";

const router = express.Router();

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token', details: err.message });
    }
    
    // The token contains userId, email, and name
    req.user = {
      id: decoded.userId || decoded.id, // Support both formats
      email: decoded.email,
      name: decoded.name
    };
    
    next();
  });
};

// Get user's saved items
router.get('/saved', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const query = `
      SELECT s.*, sc.title, sc.category, sc.description, sc.audio_url, 
             sc.thumbnail_url, sc.duration, sc.is_loop
      FROM savedItems s
      JOIN selfCare sc ON s.itemId = sc.id
      WHERE s.userId = ?
      ORDER BY s.savedAt DESC
    `;
    
    const [rows] = await db.execute(query, [userId]);
    res.json(rows);
  } catch (error) {
    console.error('[Preferences] Error fetching saved items:', error);
    res.status(500).json({ error: 'Failed to fetch saved items', details: error.message });
  }
});

// Save an item
router.post('/saved', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { item_id } = req.body;
    
    if (!item_id) {
      return res.status(400).json({ error: 'item_id is required' });
    }
    
    // Check if already saved
    const [existing] = await db.execute(
      'SELECT id FROM savedItems WHERE userId = ? AND itemId = ?',
      [userId, item_id]
    );
    
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Item already saved' });
    }
    
    const query = 'INSERT INTO savedItems (userId, itemId) VALUES (?, ?)';
    await db.execute(query, [userId, item_id]);
    
    res.status(201).json({ message: 'Item saved successfully' });
  } catch (error) {
    console.error('[Preferences] Error saving item:', error);
    res.status(500).json({ error: 'Failed to save item', details: error.message });
  }
});

// Remove saved item
router.delete('/saved/:itemId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;
    
    const query = 'DELETE FROM savedItems WHERE userId = ? AND itemId = ?';
    const [result] = await db.execute(query, [userId, itemId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Saved item not found' });
    }
    
    res.json({ message: 'Item removed from saved' });
  } catch (error) {
    console.error('Error removing saved item:', error);
    res.status(500).json({ error: 'Failed to remove saved item' });
  }
});

// Get user's listening history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;
    
    const query = `
      SELECT h.*, sc.title, sc.category, sc.description, sc.audio_url, 
             sc.thumbnail_url, sc.duration, sc.is_loop
      FROM listeningHistory h
      JOIN selfCare sc ON h.itemId = sc.id
      WHERE h.userId = ?
      ORDER BY h.playedAt DESC
      LIMIT ?
    `;
    
    const [rows] = await db.execute(query, [userId, limit]);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// Add to listening history
router.post('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { item_id, duration_played } = req.body;
    
    if (!item_id) {
      return res.status(400).json({ error: 'item_id is required' });
    }
    
    const query = `
      INSERT INTO listeningHistory (userId, itemId, durationPlayed)
      VALUES (?, ?, ?)
    `;
    
    await db.execute(query, [userId, item_id, duration_played || 0]);
    res.status(201).json({ message: 'Added to history' });
  } catch (error) {
    console.error('Error adding to history:', error);
    res.status(500).json({ error: 'Failed to add to history' });
  }
});

// Check if item is saved
router.get('/saved/check/:itemId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;
    
    const [rows] = await db.execute(
      'SELECT id FROM savedItems WHERE userId = ? AND itemId = ?',
      [userId, itemId]
    );
    
    res.json({ isSaved: rows.length > 0 });
  } catch (error) {
    console.error('Error checking saved status:', error);
    res.status(500).json({ error: 'Failed to check saved status' });
  }
});

// Get saved status for multiple items
router.post('/saved/check-multiple', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { item_ids } = req.body;
    
    if (!Array.isArray(item_ids) || item_ids.length === 0) {
      return res.json({});
    }
    
    const placeholders = item_ids.map(() => '?').join(',');
    const query = `
      SELECT itemId FROM savedItems 
      WHERE userId = ? AND itemId IN (${placeholders})
    `;
    
    const [rows] = await db.execute(query, [userId, ...item_ids]);
    
    const savedStatus = {};
    item_ids.forEach(id => savedStatus[id] = false);
    rows.forEach(row => savedStatus[row.itemId] = true);
    
    res.json(savedStatus);
  } catch (error) {
    console.error('Error checking multiple saved status:', error);
    res.status(500).json({ error: 'Failed to check saved status' });
  }
});

// Clear all history
router.delete('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    await db.execute('DELETE FROM listeningHistory WHERE userId = ?', [userId]);
    res.json({ message: 'History cleared successfully' });
  } catch (error) {
    console.error('Error clearing history:', error);
    res.status(500).json({ error: 'Failed to clear history' });
  }
});

export default router;