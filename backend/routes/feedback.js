import express from 'express';
import { db } from '../db.js';
import { authenticate } from './authRoutes.js';

const router = express.Router();

// Check if user has already submitted feedback
router.get('/mine', authenticate, async (req, res) => {
  try {
    const [[row]] = await db.query(
      'SELECT id, rating, comment, created_at FROM feedback WHERE user_id = ? LIMIT 1',
      [req.userId]
    );
    res.json({ hasRated: !!row, feedback: row || null });
  } catch (err) {
    res.status(500).json({ error: 'Failed to check feedback' });
  }
});

// Submit feedback
router.post('/', authenticate, async (req, res) => {
  try {
    const { rating, comment, is_public: show_publicly } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }
    const [[existing]] = await db.query(
      'SELECT id FROM feedback WHERE user_id = ? LIMIT 1',
      [req.userId]
    );
    if (existing) {
      return res.status(409).json({ error: 'You have already submitted a rating.' });
    }
    await db.query(
      'INSERT INTO feedback (user_id, rating, comment, show_publicly) VALUES (?, ?, ?, ?)',
      [req.userId, rating, comment || null, show_publicly ? 1 : 0]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Feedback error:', err);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

// Get all feedback (admin)
router.get('/all', authenticate, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT f.id, f.rating, f.comment, f.created_at, f.show_publicly, u.name, u.email, u.avatar
      FROM feedback f
      JOIN users u ON f.user_id = u.id
      WHERE u.deleted_at IS NULL
      ORDER BY f.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('Get feedback error:', err);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

// Get public feedback for landing page (no auth, only show_publicly=1 with comments)
router.get('/public', async (_req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT f.rating, f.comment, f.created_at, u.name, u.avatar
      FROM feedback f
      JOIN users u ON f.user_id = u.id
      WHERE f.show_publicly = 1 AND u.deleted_at IS NULL
        AND f.comment IS NOT NULL AND f.comment != ''
      ORDER BY f.rating DESC, f.created_at DESC
    `);
    // First name + last initial only — no email
    const safe = rows.map(r => {
      const parts = (r.name || 'Anonymous').trim().split(/\s+/);
      const display = parts.length > 1
        ? `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`
        : parts[0];
      return { rating: r.rating, comment: r.comment, created_at: r.created_at, name: display, avatar: r.avatar };
    });
    res.json(safe);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Delete feedback (admin)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if item exists
    const [existing] = await db.query('SELECT id FROM feedback WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Feedback not found' });
    }
    
    await db.query('DELETE FROM feedback WHERE id = ?', [id]);
    res.json({ message: 'Feedback deleted successfully' });
  } catch (err) {
    console.error('Delete feedback error:', err);
    res.status(500).json({ error: 'Failed to delete feedback' });
  }
});

export default router;
