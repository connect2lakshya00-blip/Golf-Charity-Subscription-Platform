const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { query } = require('../config/db');
const { sendWelcomeEmail } = require('../services/emailService');

const generateToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

/**
 * POST /api/auth/signup
 */
exports.signup = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, full_name, charity_id, charity_contribution_percent } = req.body;

    // Check if email already exists
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows[0]) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Verify charity exists
    const charity = await query('SELECT id FROM charities WHERE id = $1 AND is_active = true', [charity_id]);
    if (!charity.rows[0]) {
      return res.status(400).json({ error: 'Invalid charity selected' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await query(
      `INSERT INTO users (email, password_hash, full_name, charity_id, charity_contribution_percent, role, is_active)
       VALUES ($1, $2, $3, $4, $5, 'user', true)
       RETURNING id, email, full_name, role, charity_id, charity_contribution_percent, created_at`,
      [email, passwordHash, full_name, charity_id, charity_contribution_percent]
    );

    const user = result.rows[0];
    const token = generateToken(user.id);

    // Send welcome email (non-blocking)
    sendWelcomeEmail(user).catch(() => {});

    res.status(201).json({ token, user });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/login
 */
exports.login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const result = await query(
      `SELECT u.*, c.name as charity_name 
       FROM users u
       LEFT JOIN charities c ON u.charity_id = c.id
       WHERE u.email = $1`,
      [email]
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Get subscription status
    const sub = await query(
      `SELECT status, current_period_end, plan FROM subscriptions 
       WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [user.id]
    );

    const token = generateToken(user.id);
    const { password_hash, ...safeUser } = user;

    res.json({
      token,
      user: safeUser,
      subscription: sub.rows[0] || null,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/me
 */
exports.getMe = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT u.id, u.email, u.full_name, u.role, u.charity_id, u.charity_contribution_percent,
              u.created_at, c.name as charity_name,
              s.status as subscription_status, s.plan as subscription_plan, s.current_period_end
       FROM users u
       LEFT JOIN charities c ON u.charity_id = c.id
       LEFT JOIN subscriptions s ON s.user_id = u.id AND s.status = 'active'
       WHERE u.id = $1`,
      [req.user.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/refresh
 */
exports.refreshToken = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token required' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true });
    const result = await query('SELECT id FROM users WHERE id = $1 AND is_active = true', [decoded.userId]);

    if (!result.rows[0]) return res.status(401).json({ error: 'User not found' });

    const newToken = generateToken(decoded.userId);
    res.json({ token: newToken });
  } catch (err) {
    next(err);
  }
};
