const { query } = require('../config/db');
const { sendPayoutEmail } = require('../services/emailService');

exports.getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT u.id, u.email, u.full_name, u.role, u.is_active, u.created_at,
              c.name as charity_name, u.charity_contribution_percent,
              s.status as subscription_status, s.plan as subscription_plan
       FROM users u
       LEFT JOIN charities c ON c.id = u.charity_id
       LEFT JOIN subscriptions s ON s.user_id = u.id AND s.status = 'active'
       WHERE (u.email ILIKE $1 OR u.full_name ILIKE $1)
       ORDER BY u.created_at DESC
       LIMIT $2 OFFSET $3`,
      [`%${search}%`, limit, offset]
    );

    const countResult = await query(
      'SELECT COUNT(*) FROM users WHERE email ILIKE $1 OR full_name ILIKE $1',
      [`%${search}%`]
    );

    res.json({
      users: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      pages: Math.ceil(countResult.rows[0].count / limit),
    });
  } catch (err) {
    next(err);
  }
};

exports.getUserById = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT u.*, c.name as charity_name,
              s.status as subscription_status, s.plan, s.current_period_end
       FROM users u
       LEFT JOIN charities c ON c.id = u.charity_id
       LEFT JOIN subscriptions s ON s.user_id = u.id
       WHERE u.id = $1
       ORDER BY s.created_at DESC`,
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    const { password_hash, ...user } = result.rows[0];
    res.json(user);
  } catch (err) {
    next(err);
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    const { role, is_active } = req.body;
    const result = await query(
      `UPDATE users SET role = COALESCE($1, role), is_active = COALESCE($2, is_active), updated_at = NOW()
       WHERE id = $3 RETURNING id, email, role, is_active`,
      [role, is_active, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

exports.deactivateUser = async (req, res, next) => {
  try {
    await query('UPDATE users SET is_active = false WHERE id = $1', [req.params.id]);
    res.json({ message: 'User deactivated' });
  } catch (err) {
    next(err);
  }
};

exports.getSubscriptions = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT s.*, u.email, u.full_name
       FROM subscriptions s
       JOIN users u ON u.id = s.user_id
       ORDER BY s.created_at DESC LIMIT 100`
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

exports.getAnalytics = async (req, res, next) => {
  try {
    const [users, subs, draws, revenue] = await Promise.all([
      query(`SELECT 
               COUNT(*) as total,
               COUNT(*) FILTER (WHERE is_active = true) as active,
               COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as new_this_month
             FROM users`),
      query(`SELECT 
               COUNT(*) FILTER (WHERE status = 'active') as active,
               COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
               COUNT(*) FILTER (WHERE status = 'expired') as expired,
               COUNT(*) FILTER (WHERE plan = 'monthly') as monthly,
               COUNT(*) FILTER (WHERE plan = 'yearly') as yearly
             FROM subscriptions`),
      query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'published') as published FROM draws`),
      query(`SELECT 
               COALESCE(SUM(CASE WHEN plan = 'monthly' THEN 29.99 ELSE 24.99 END), 0) as mrr
             FROM subscriptions WHERE status = 'active'`),
    ]);

    res.json({
      users: users.rows[0],
      subscriptions: subs.rows[0],
      draws: draws.rows[0],
      revenue: revenue.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

exports.getPendingWinners = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT dw.*, u.full_name, u.email, d.draw_date, d.winning_numbers
       FROM draw_winners dw
       JOIN users u ON u.id = dw.user_id
       JOIN draws d ON d.id = dw.draw_id
       WHERE dw.payment_status IN ('pending', 'proof_submitted')
       ORDER BY dw.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

exports.approveWinner = async (req, res, next) => {
  try {
    const result = await query(
      `UPDATE draw_winners SET payment_status = 'approved', updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Winner not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

exports.rejectWinner = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const result = await query(
      `UPDATE draw_winners SET payment_status = 'rejected', rejection_reason = $1, updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [reason, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Winner not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

exports.markPaid = async (req, res, next) => {
  try {
    const result = await query(
      `UPDATE draw_winners SET payment_status = 'paid', paid_at = NOW(), updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Winner not found' });

    // Send payout confirmation email
    query('SELECT email, full_name FROM users WHERE id = $1', [result.rows[0].user_id])
      .then(r => r.rows[0] && sendPayoutEmail(r.rows[0], result.rows[0].prize_amount))
      .catch(() => {});

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};
