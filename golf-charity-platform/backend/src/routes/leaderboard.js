const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { query } = require('../config/db');

// GET /api/leaderboard — top players by avg score + draw wins
router.get('/', authenticate, async (req, res, next) => {
  try {
    const result = await query(`
      SELECT
        u.id, u.full_name,
        ROUND(AVG(gs.score), 1) as avg_score,
        COUNT(gs.id) as total_scores,
        COALESCE(w.wins, 0) as total_wins,
        COALESCE(w.total_won, 0) as total_won,
        c.name as charity_name
      FROM users u
      JOIN subscriptions s ON s.user_id = u.id AND s.status = 'active'
      LEFT JOIN golf_scores gs ON gs.user_id = u.id
      LEFT JOIN (
        SELECT user_id, COUNT(*) as wins, SUM(prize_amount) as total_won
        FROM draw_winners WHERE payment_status IN ('approved','paid')
        GROUP BY user_id
      ) w ON w.user_id = u.id
      LEFT JOIN charities c ON c.id = u.charity_id
      WHERE u.is_active = true
      GROUP BY u.id, u.full_name, w.wins, w.total_won, c.name
      HAVING COUNT(gs.id) > 0
      ORDER BY avg_score DESC, total_wins DESC
      LIMIT 50
    `);
    res.json(result.rows);
  } catch (err) { next(err); }
});

module.exports = router;
