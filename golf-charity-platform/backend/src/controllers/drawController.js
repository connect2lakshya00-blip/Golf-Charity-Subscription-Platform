const { query, getClient } = require('../config/db');
const { sendDrawResultsEmail, sendWinnerEmail } = require('../services/emailService');

/**
 * Prize pool distribution constants
 */
const PRIZE_DISTRIBUTION = {
  5: 0.40, // 40% jackpot
  4: 0.35, // 35%
  3: 0.25, // 25%
};

/**
 * Calculate prize pool from active subscriptions this month
 * Monthly = $29.99, Yearly = $299.99/12 = $24.99/mo equivalent
 */
async function calculatePrizePool() {
  const result = await query(
    `SELECT 
       COUNT(*) FILTER (WHERE plan = 'monthly') as monthly_count,
       COUNT(*) FILTER (WHERE plan = 'yearly') as yearly_count
     FROM subscriptions 
     WHERE status = 'active' AND current_period_end > NOW()`
  );

  const { monthly_count, yearly_count } = result.rows[0];
  // 10% of subscription revenue goes to prize pool
  const pool = (parseInt(monthly_count) * 29.99 + parseInt(yearly_count) * 24.99) * 0.10;
  return Math.round(pool * 100) / 100;
}

/**
 * Core draw logic: match user scores against winning numbers
 * Returns winners grouped by match count
 */
async function executeDrawLogic(drawId, winningNumbers, simulate = false) {
  // Get all eligible users (active subscription + at least 1 score)
  const usersResult = await query(
    `SELECT u.id, u.full_name, u.email,
            ARRAY_AGG(gs.score ORDER BY gs.played_at DESC) as scores
     FROM users u
     JOIN subscriptions s ON s.user_id = u.id AND s.status = 'active'
     JOIN golf_scores gs ON gs.user_id = u.id
     WHERE u.is_active = true
     GROUP BY u.id, u.full_name, u.email
     HAVING COUNT(gs.id) > 0`
  );

  const winners = { 5: [], 4: [], 3: [] };

  for (const user of usersResult.rows) {
    const userScores = user.scores.slice(0, 5); // Use last 5 scores
    const matchCount = userScores.filter(s => winningNumbers.includes(s)).length;

    if (matchCount >= 3) {
      winners[matchCount] = winners[matchCount] || [];
      winners[matchCount].push({ userId: user.id, matchCount, scores: userScores });
    }
  }

  return winners;
}

/**
 * POST /api/draws/run
 * Admin runs the monthly draw
 */
exports.runDraw = async (req, res, next) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Check no draw already ran this month
    const existing = await client.query(
      `SELECT id FROM draws 
       WHERE date_trunc('month', draw_date) = date_trunc('month', NOW())
       AND status != 'cancelled'`
    );
    if (existing.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Draw already ran this month' });
    }

    // Generate 5 random winning numbers (1-45, no duplicates)
    const winningNumbers = generateWinningNumbers();
    const prizePool = await calculatePrizePool();

    // Get rollover from previous jackpot if no 5-match winner
    const rolloverResult = await client.query(
      `SELECT COALESCE(SUM(rollover_amount), 0) as rollover 
       FROM draws WHERE jackpot_rolled_over = true AND status = 'published'`
    );
    const rollover = parseFloat(rolloverResult.rows[0].rollover);
    const totalPool = prizePool + rollover;

    // Create draw record
    const drawResult = await client.query(
      `INSERT INTO draws (winning_numbers, prize_pool, rollover_amount, status, draw_date)
       VALUES ($1, $2, $3, 'pending', NOW())
       RETURNING id`,
      [winningNumbers, totalPool, rollover]
    );
    const drawId = drawResult.rows[0].id;

    // Execute draw logic
    const winners = await executeDrawLogic(drawId, winningNumbers);

    // Calculate and record prizes
    const jackpotRolledOver = winners[5].length === 0;
    const prizes = {
      5: jackpotRolledOver ? 0 : totalPool * PRIZE_DISTRIBUTION[5],
      4: totalPool * PRIZE_DISTRIBUTION[4],
      3: totalPool * PRIZE_DISTRIBUTION[3],
    };

    // Insert winners
    for (const [matchCount, matchWinners] of Object.entries(winners)) {
      if (matchWinners.length === 0) continue;
      const prizePerWinner = prizes[matchCount] / matchWinners.length;

      for (const winner of matchWinners) {
        await client.query(
          `INSERT INTO draw_winners (draw_id, user_id, match_count, prize_amount, payment_status)
           VALUES ($1, $2, $3, $4, 'pending')`,
          [drawId, winner.userId, parseInt(matchCount), prizePerWinner]
        );
      }
    }

    // Update draw with jackpot rollover status
    await client.query(
      `UPDATE draws SET jackpot_rolled_over = $1, status = 'completed' WHERE id = $2`,
      [jackpotRolledOver, drawId]
    );

    await client.query('COMMIT');

    // Send draw result emails to all active subscribers (non-blocking)
    query(`SELECT u.email, u.full_name FROM users u
           JOIN subscriptions s ON s.user_id = u.id AND s.status = 'active'
           WHERE u.is_active = true`)
      .then(r => sendDrawResultsEmail(r.rows, { winningNumbers, prizePool: totalPool, jackpotRolledOver }))
      .catch(() => {});

    // Send winner emails (non-blocking)
    for (const [matchCount, matchWinners] of Object.entries(winners)) {
      if (matchWinners.length === 0) continue;
      const prizePerWinner = prizes[parseInt(matchCount)] / matchWinners.length;
      for (const winner of matchWinners) {
        query('SELECT email, full_name FROM users WHERE id = $1', [winner.userId])
          .then(r => r.rows[0] && sendWinnerEmail(r.rows[0], { matchCount: parseInt(matchCount), prizeAmount: prizePerWinner }))
          .catch(() => {});
      }
    }

    res.json({
      drawId,
      winningNumbers,
      prizePool: totalPool,
      jackpotRolledOver,
      winnerCounts: {
        fiveMatch: winners[5].length,
        fourMatch: winners[4].length,
        threeMatch: winners[3].length,
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

/**
 * POST /api/draws/simulate
 * Simulate a draw without saving results
 */
exports.simulateDraw = async (req, res, next) => {
  try {
    const winningNumbers = generateWinningNumbers();
    const prizePool = await calculatePrizePool();
    const winners = await executeDrawLogic(null, winningNumbers, true);

    res.json({
      simulation: true,
      winningNumbers,
      estimatedPrizePool: prizePool,
      winnerCounts: {
        fiveMatch: winners[5]?.length || 0,
        fourMatch: winners[4]?.length || 0,
        threeMatch: winners[3]?.length || 0,
      },
      prizes: {
        fiveMatch: winners[5]?.length ? (prizePool * 0.40) / winners[5].length : 0,
        fourMatch: winners[4]?.length ? (prizePool * 0.35) / winners[4].length : 0,
        threeMatch: winners[3]?.length ? (prizePool * 0.25) / winners[3].length : 0,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/draws/:id/publish
 */
exports.publishDraw = async (req, res, next) => {
  try {
    const result = await query(
      `UPDATE draws SET status = 'published', published_at = NOW() 
       WHERE id = $1 AND status = 'completed' RETURNING *`,
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Draw not found or already published' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

exports.getDraws = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, draw_date, winning_numbers, prize_pool, status, jackpot_rolled_over, published_at
       FROM draws WHERE status = 'published' ORDER BY draw_date DESC LIMIT 12`
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

exports.getCurrentDraw = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT d.*, 
              COUNT(dw.id) as total_winners
       FROM draws d
       LEFT JOIN draw_winners dw ON dw.draw_id = d.id
       WHERE d.status IN ('completed', 'published')
       GROUP BY d.id
       ORDER BY d.draw_date DESC LIMIT 1`
    );
    res.json(result.rows[0] || null);
  } catch (err) {
    next(err);
  }
};

exports.getDrawById = async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM draws WHERE id = $1', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Draw not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

exports.getDrawResults = async (req, res, next) => {
  try {
    // Only show user's own results unless admin
    const isAdmin = req.user.role === 'admin';
    const whereClause = isAdmin ? '' : 'AND dw.user_id = $2';
    const params = isAdmin ? [req.params.id] : [req.params.id, req.user.id];

    const result = await query(
      `SELECT dw.id, dw.match_count, dw.prize_amount, dw.payment_status, dw.proof_url,
              u.full_name, u.email
       FROM draw_winners dw
       JOIN users u ON u.id = dw.user_id
       WHERE dw.draw_id = $1 ${whereClause}
       ORDER BY dw.match_count DESC`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/draws/:drawId/proof
 * Winner uploads proof image (base64 or URL)
 */
exports.uploadProof = async (req, res, next) => {
  try {
    const { proof_url } = req.body;
    if (!proof_url) return res.status(400).json({ error: 'Proof URL required' });

    const result = await query(
      `UPDATE draw_winners SET proof_url = $1, proof_submitted_at = NOW()
       WHERE draw_id = $2 AND user_id = $3
       RETURNING id, payment_status`,
      [proof_url, req.params.drawId, req.user.id]
    );

    if (!result.rows[0]) return res.status(404).json({ error: 'No winning entry found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

// Generate 5 unique random numbers between 1-45
function generateWinningNumbers() {
  const numbers = new Set();
  while (numbers.size < 5) {
    numbers.add(Math.floor(Math.random() * 45) + 1);
  }
  return Array.from(numbers).sort((a, b) => a - b);
}

// GET /api/draws/my-winnings
exports.getMyWinnings = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT dw.id, dw.match_count, dw.prize_amount, dw.payment_status,
              dw.proof_url, dw.proof_submitted_at, dw.rejection_reason,
              d.draw_date, d.winning_numbers
       FROM draw_winners dw
       JOIN draws d ON d.id = dw.draw_id
       WHERE dw.user_id = $1
       ORDER BY d.draw_date DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};
