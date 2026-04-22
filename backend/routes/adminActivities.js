import express from "express";
import { db } from "../db.js";

const router = express.Router();

// Get recent admin activities
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT id, action, details, timestamp 
      FROM admin_activities 
      ORDER BY timestamp DESC 
      LIMIT 10
    `;
    const [rows] = await db.execute(query);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching admin activities:', error);
    res.status(500).json({ error: 'Failed to fetch admin activities' });
  }
});

// Log a new activity
router.post('/', async (req, res) => {
  try {
    const { action, details } = req.body;
    
    if (!action) {
      return res.status(400).json({ error: 'Action is required' });
    }

    const query = `
      INSERT INTO admin_activities (action, details) 
      VALUES (?, ?)
    `;
    await db.execute(query, [action, details || '']);
    
    res.status(201).json({ message: 'Activity logged successfully' });
  } catch (error) {
    console.error('Error logging admin activity:', error);
    res.status(500).json({ error: 'Failed to log admin activity' });
  }
});

export default router;