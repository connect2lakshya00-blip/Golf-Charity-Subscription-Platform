const { validationResult } = require('express-validator');
const { query, getClient } = require('../config/db');

/**
 * GET /api/scores
 * Returns user's last 5 scores, newest first
 */
exports.getScores = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, score, played_at, created_at 
       FROM golf_scores 
       WHERE user_id = $1 
       ORDER BY played_at DESC, created_at DESC 
       LIMIT 5`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/scores
 * Add a score. If user already has 5, replace the oldest one.
 */
exports.addScore = async (req, res, next) => {
  const client = await getClient();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { score, played_at } = req.body;

    await client.query('BEGIN');

    // Count current scores
    const countResult = await client.query(
      'SELECT COUNT(*) as count FROM golf_scores WHERE user_id = $1',
      [req.user.id]
    );
    const count = parseInt(countResult.rows[0].count);

    // If at limit (5), delete the oldest
    if (count >= 5) {
      await client.query(
        `DELETE FROM golf_scores WHERE id = (
           SELECT id FROM golf_scores WHERE user_id = $1 
           ORDER BY played_at ASC, created_at ASC LIMIT 1
         )`,
        [req.user.id]
      );
    }

    // Insert new score
    const result = await client.query(
      `INSERT INTO golf_scores (user_id, score, played_at) 
       VALUES ($1, $2, $3) 
       RETURNING id, score, played_at, created_at`,
      [req.user.id, score, played_at]
    );

    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

/**
 * DELETE /api/scores/:id
 */
exports.deleteScore = async (req, res, next) => {
  try {
    const result = await query(
      'DELETE FROM golf_scores WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Score not found' });
    }

    res.json({ message: 'Score deleted' });
  } catch (err) {
    next(err);
  }
};
