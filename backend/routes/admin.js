import express from 'express';
import { db } from '../db.js';
import { authenticate } from './authRoutes.js';
import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { emailTemplate } from '../utils/emailTemplate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const getTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD || ''
    }
  });
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../uploads'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        const prefix = file.mimetype.startsWith('audio') ? 'audio' : 'image';
        cb(null, `${prefix}-${uniqueSuffix}${ext}`);
    }
});
const imageFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (allowedTypes.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Invalid file type. Only JPEG, PNG, GIF, WEBP, and SVG are allowed.'), false);
};
const audioFilter = (req, file, cb) => {
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/x-wav', 'audio/mp3', 'audio/aac', 'audio/flac', 'audio/m4a'];
    if (allowedTypes.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Invalid audio file type.'), false);
};
const imageUpload = multer({ storage, fileFilter: imageFilter, limits: { fileSize: 10 * 1024 * 1024 } });
const audioUpload = multer({ storage, fileFilter: audioFilter, limits: { fileSize: 50 * 1024 * 1024 } });

const sendMail = async ({ to, subject, title, preheader, bodyHtml }) => {
  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: `"Soluna Support" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html: emailTemplate({ title, preheader, bodyHtml }),
    });
    return { success: true };
  } catch (error) {
    console.error("Error sending email:", error);
    return { success: false, error: error.message };
  }
};

// Upload image route
router.post('/upload/image', authenticate, (req, res) => {
    imageUpload.single('image')(req, res, (err) => {
        if (err) return res.status(400).json({ error: err.message });
        try {
            if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
            // Return only the filename; frontend will handle prefixing via getMediaUrl
            res.json({ message: 'Image uploaded successfully', imageUrl: req.file.filename });
        } catch (error) {
            console.error('Error processing image:', error);
            res.status(500).json({ error: 'Failed to process image' });
        }
    });
});

// Upload audio route
router.post('/upload/audio', authenticate, (req, res) => {
    audioUpload.single('audio')(req, res, (err) => {
        if (err) return res.status(400).json({ error: err.message });
        try {
            if (!req.file) return res.status(400).json({ error: 'No audio file uploaded' });
            // Return only the filename; frontend will handle prefixing via getMediaUrl
            res.json({ message: 'Audio uploaded successfully', audioUrl: req.file.filename });
        } catch (error) {
            console.error('Error processing audio:', error);
            res.status(500).json({ error: 'Failed to process audio' });
        }
    });
});

// Admin login route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Look up user in DB by email where is_admin = 1
    const [rows] = await db.query(
      'SELECT * FROM users WHERE email = ? AND is_admin = 1 LIMIT 1',
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Incorrect email or password. Please try again.' });
    }

    const admin = rows[0];
    const match = await bcrypt.compare(password, admin.password);

    if (!match) {
      return res.status(401).json({ message: 'Incorrect email or password. Please try again.' });
    }

    const token = jwt.sign(
      { userId: admin.id, email: admin.email, name: admin.name, isAdmin: true },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      message: 'Admin login successful',
      token,
      user: { email: admin.email, name: admin.name }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Get total users count
router.get('/users/count', authenticate, async (req, res) => {
  if (!req.isAdmin) return res.status(403).json({ error: 'Admin access required' });
  try {
    const [result] = await db.query('SELECT COUNT(*) as count FROM users WHERE is_admin = 0 AND deleted_at IS NULL');
    res.json({ count: parseInt(result[0].count) });
  } catch (error) {
    console.error('Error fetching user count:', error);
    res.status(500).json({ error: 'Failed to fetch user count' });
  }
});

// Get all users with basic info
router.get('/users', authenticate, async (req, res) => {
  if (!req.isAdmin) return res.status(403).json({ error: 'Admin access required' });
  try {
    const [users] = await db.query(`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.avatar,
        u.last_login,
        u.status,
        COALESCE(s.is_premium, 0) AS is_premium,
        s.subscription_expiry
      FROM users u
      LEFT JOIN user_subscription s ON s.userId = u.id
      WHERE u.is_admin = 0 AND u.deleted_at IS NULL
      ORDER BY u.id DESC
    `);
    
    // Format the data for frontend
    const formattedUsers = users.map(user => {
      // Check if premium is still valid
      const isPremium = user.is_premium === 1 &&
        (!user.subscription_expiry || new Date(user.subscription_expiry) > new Date());
      return {
        id: user.id,
        name: user.name || 'Unknown User',
        email: user.email,
        avatar: user.avatar || null,
        lastLogin: formatLastLogin(user.last_login),
        status: user.status || 'active',
        isPremium
      };
    });
    
    res.json(formattedUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users', details: error.message });
  }
});

// Helper function to format last login time
function formatLastLogin(lastLogin) {
  if (!lastLogin) return 'Not logged in yet';
  
  const now = new Date();
  const loginDate = new Date(lastLogin);
  const diffMs = now - loginDate;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
  return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`;
}

// Suspend user with email notification
router.post('/users/:userId/suspend', authenticate, async (req, res) => {
  if (!req.isAdmin) return res.status(403).json({ error: 'Admin access required' });
  const { userId } = req.params;
  const { reason, userEmail, userName } = req.body;
  
  try {
    // Update user status to suspended
    await db.query('UPDATE users SET status = ? WHERE id = ?', ['suspended', userId]);
    
    // Send email notification
    const mailOptions = {
      from: `"Soluna Support" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: 'Account Suspension Notice',
      html: emailTemplate({
        title: 'Account Suspended',
        preheader: 'Important notice regarding your Soluna account.',
        bodyHtml: `
          <p style="margin:0 0 16px;font-size:16px;color:#1b1b1b;font-weight:600;">Dear ${userName},</p>
          <p style="margin:0 0 20px;font-size:15px;color:#444;line-height:1.7;">
            We regret to inform you that your <strong>Soluna Wellness</strong> account has been suspended.
          </p>
          <div style="background:#f9f5ff;border-left:4px solid #9565B8;border-radius:0 8px 8px 0;padding:16px 20px;margin:0 0 24px;">
            <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#9565B8;text-transform:uppercase;letter-spacing:0.5px;">Reason for Suspension</p>
            <p style="margin:0;font-size:14px;color:#444;line-height:1.6;">${reason}</p>
          </div>
          <p style="margin:0;font-size:14px;color:#666;line-height:1.7;">
            If you believe this is a mistake or would like to discuss this matter, please reply to this email or contact our support team.
          </p>
        `
      })
    };
    
    try {
      await getTransporter().sendMail(mailOptions);
      res.json({ 
        success: true, 
        message: 'User suspended successfully',
        emailSent: true
      });
    } catch (emailError) {
      res.json({ 
        success: true, 
        message: 'User suspended successfully, but email failed to send',
        emailSent: false,
        emailError: emailError.message
      });
    }
  } catch (error) {
    console.error('Error suspending user:', error);
    res.status(500).json({ error: 'Failed to suspend user' });
  }
});

// Reactivate user
router.post('/users/:userId/reactivate', authenticate, async (req, res) => {
  const { userId } = req.params;
  
  try {
    // Get user info before reactivating
    const [users] = await db.query('SELECT name, email FROM users WHERE id = ? AND deleted_at IS NULL', [userId]);
    const user = users[0];
    
    // Update user status to active
    await db.query('UPDATE users SET status = ? WHERE id = ?', ['active', userId]);
    
    // Send reactivation email
    const mailOptions = {
      from: `"Soluna Support" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Account Reactivated',
      html: emailTemplate({
        title: 'Account Reactivated',
        preheader: 'Great news — your Soluna account is back!',
        bodyHtml: `
          <p style="margin:0 0 16px;font-size:16px;color:#1b1b1b;font-weight:600;">Dear ${user.name},</p>
          <p style="margin:0 0 20px;font-size:15px;color:#444;line-height:1.7;">
            Great news! Your <strong>Soluna Wellness</strong> account has been reactivated. You can now log in and access all features of the platform.
          </p>
          <div style="text-align:center;margin:28px 0;">
            <a href="${process.env.CLIENT_URL}/auth" style="display:inline-block;background:#9565B8;color:#ffffff;padding:14px 36px;border-radius:10px;text-decoration:none;font-size:15px;font-weight:600;">
              Log In to Soluna
            </a>
          </div>
          <p style="margin:0;font-size:14px;color:#666;line-height:1.7;">
            If you have any questions, feel free to reply to this email or contact our support team.
          </p>
        `
      })
    };
    
    try {
      await getTransporter().sendMail(mailOptions);
    } catch (emailError) {
      // Log but don't fail the reactivation
    }
    
    res.json({ 
      success: true, 
      message: 'User reactivated successfully'
    });
  } catch (error) {
    console.error('Error reactivating user:', error);
    res.status(500).json({ error: 'Failed to reactivate user' });
  }
});

// Get admin profile
// Helper: verify admin token, returns decoded or throws with proper status
function verifyAdminToken(req, res) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    res.status(401).json({ error: 'No token provided' });
    return null;
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.isAdmin) {
      res.status(403).json({ error: 'Not authorized' });
      return null;
    }
    return decoded;
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      res.status(401).json({ error: 'Token expired', expired: true });
    } else {
      res.status(401).json({ error: 'Invalid token' });
    }
    return null;
  }
}

// Get admin profile
router.get('/profile', async (req, res) => {
  const decoded = verifyAdminToken(req, res);
  if (!decoded) return;

  try {
    const [rows] = await db.query(
      'SELECT name, email, avatar FROM users WHERE id = ? AND is_admin = 1 LIMIT 1',
      [decoded.userId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Admin not found' });
    res.json({ name: rows[0].name, email: rows[0].email, avatar: rows[0].avatar || null });
  } catch (error) {
    console.error('Error fetching admin profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update admin profile
router.put('/profile', async (req, res) => {
  const decoded = verifyAdminToken(req, res);
  if (!decoded) return;
  const { name, avatar } = req.body;
  try {
    if (name) await db.query('UPDATE users SET name = ? WHERE id = ?', [name, decoded.userId]);
    if (avatar !== undefined) await db.query('UPDATE users SET avatar = ? WHERE id = ?', [avatar, decoded.userId]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating admin profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Update admin profile name
router.put('/profile/name', async (req, res) => {
  const decoded = verifyAdminToken(req, res);
  if (!decoded) return;
  const { name } = req.body;
  try {
    await db.query('UPDATE users SET name = ? WHERE id = ?', [name, decoded.userId]);
    res.json({ success: true, name });
  } catch (error) {
    console.error('Error updating admin name:', error);
    res.status(500).json({ error: 'Failed to update name' });
  }
});

// Update admin profile avatar
router.put('/profile/avatar', async (req, res) => {
  const decoded = verifyAdminToken(req, res);
  if (!decoded) return;
  const { avatar } = req.body;
  try {
    await db.query('UPDATE users SET avatar = ? WHERE id = ?', [avatar || null, decoded.userId]);
    res.json({ success: true, avatar: avatar || null });
  } catch (error) {
    console.error('Error updating admin avatar:', error);
    res.status(500).json({ error: 'Failed to update avatar' });
  }
});

// Admin forgot password — sends reset link to admin email
router.post('/forgot-password', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM users WHERE is_admin = 1 LIMIT 1'
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Admin not found' });

    const admin = rows[0];
    const crypto = await import('crypto');
    const token = crypto.default.randomBytes(32).toString('hex');
    const tokenHash = crypto.default.createHash('sha256').update(token).digest('hex');
    const expiry = new Date(Date.now() + 15 * 60 * 1000);

    await db.query(
      'UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?',
      [tokenHash, expiry, admin.id]
    );

    const resetLink = `${process.env.CLIENT_URL}/admin-reset-password?token=${token}`;

    await getTransporter().sendMail({
      from: `"Soluna Support" <${process.env.EMAIL_USER}>`,
      to: admin.email,
      subject: 'Reset Your Soluna Admin Password',
      html: emailTemplate({
        title: 'Admin Password Reset',
        preheader: 'Reset your Soluna admin password — link valid for 15 minutes.',
        bodyHtml: `
          <p style="margin:0 0 16px;font-size:16px;color:#1b1b1b;font-weight:600;">Hi ${admin.name} 👋</p>
          <p style="margin:0 0 20px;font-size:15px;color:#444;line-height:1.7;">
            You requested a password reset for your <strong>Soluna Admin</strong> account.
            Click the button below to set a new password. This link is valid for <strong>15 minutes</strong>.
          </p>
          <div style="text-align:center;margin:28px 0;">
            <a href="${resetLink}" style="display:inline-block;background:#9565B8;color:#ffffff;padding:14px 36px;border-radius:10px;text-decoration:none;font-size:15px;font-weight:600;letter-spacing:0.3px;">
              Reset Admin Password
            </a>
          </div>
          <p style="margin:0;font-size:13px;color:#888;line-height:1.6;">
            If the button doesn't work, copy and paste this link into your browser:<br/>
            <a href="${resetLink}" style="color:#9565B8;word-break:break-all;">${resetLink}</a>
          </p>
        `
      })
    });

    res.json({ success: true, message: 'Reset link sent to admin email.' });
  } catch (error) {
    console.error('Admin forgot password error:', error);
    res.status(500).json({ error: 'Failed to send reset email' });
  }
});

// Admin reset password via token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ error: 'Token and new password are required' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    if (!/[A-Z]/.test(newPassword)) return res.status(400).json({ error: 'Password must include at least one uppercase letter.' });
    if (!/[a-z]/.test(newPassword)) return res.status(400).json({ error: 'Password must include at least one lowercase letter.' });
    if (!/\d/.test(newPassword)) return res.status(400).json({ error: 'Password must include at least one number.' });
    if (!/[@$!%*?&]/.test(newPassword)) return res.status(400).json({ error: 'Password must include at least one special character (@$!%*?&).' });

    const { createHash } = await import('crypto');
    const tokenHash = createHash('sha256').update(token).digest('hex');

    const [rows] = await db.query(
      'SELECT * FROM users WHERE reset_token = ? AND reset_token_expiry > ? AND is_admin = 1 LIMIT 1',
      [tokenHash, new Date()]
    );

    if (rows.length === 0) return res.status(400).json({ error: 'Invalid or expired reset token' });

    const isSame = await bcrypt.compare(newPassword, rows[0].password);
    if (isSame) return res.status(400).json({ error: 'New password cannot be the same as your previous password.' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await db.query(
      'UPDATE users SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?',
      [hashed, rows[0].id]
    );

    res.json({ success: true, message: 'Password reset successfully.' });
  } catch (error) {
    console.error('Admin reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Change admin password
router.put('/profile/password', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.isAdmin) return res.status(403).json({ error: 'Not authorized' });

    const { currentPassword, newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    if (!/[A-Z]/.test(newPassword)) return res.status(400).json({ error: 'Password must include at least one uppercase letter.' });
    if (!/[a-z]/.test(newPassword)) return res.status(400).json({ error: 'Password must include at least one lowercase letter.' });
    if (!/[0-9]/.test(newPassword)) return res.status(400).json({ error: 'Password must include at least one number.' });
    if (!/[!@#$%^&*]/.test(newPassword)) return res.status(400).json({ error: 'Password must include at least one special character (!@#$%^&*).' });

    const [rows] = await db.query(
      'SELECT * FROM users WHERE id = ? AND is_admin = 1 LIMIT 1',
      [decoded.userId]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Admin not found' });

    const match = await bcrypt.compare(currentPassword, rows[0].password);
    if (!match) return res.status(400).json({ error: 'Current password is incorrect' });

    const isSame = await bcrypt.compare(newPassword, rows[0].password);
    if (isSame) return res.status(400).json({ error: 'New password cannot be the same as the current password.' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password = ? WHERE id = ?', [hashed, decoded.userId]);

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

export default router;
