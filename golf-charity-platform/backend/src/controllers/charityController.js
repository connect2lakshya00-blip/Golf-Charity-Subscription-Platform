const { query } = require('../config/db');
const { validationResult } = require('express-validator');

exports.getCharities = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, name, description, website, logo_url, total_raised, is_active
       FROM charities WHERE is_active = true ORDER BY name ASC`
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

exports.getCharity = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT c.*, 
              COUNT(u.id) as supporter_count,
              COALESCE(SUM(u.charity_contribution_percent), 0) as total_contribution_percent
       FROM charities c
       LEFT JOIN users u ON u.charity_id = c.id
       WHERE c.id = $1
       GROUP BY c.id`,
      [req.params.id]
    );

    if (!result.rows[0]) return res.status(404).json({ error: 'Charity not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

exports.createCharity = async (req, res, next) => {
  try {
    const { name, description, website, logo_url } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const result = await query(
      `INSERT INTO charities (name, description, website, logo_url, is_active)
       VALUES ($1, $2, $3, $4, true) RETURNING *`,
      [name, description, website, logo_url]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

exports.updateCharity = async (req, res, next) => {
  try {
    const { name, description, website, logo_url, is_active } = req.body;
    const result = await query(
      `UPDATE charities SET name=$1, description=$2, website=$3, logo_url=$4, is_active=$5, updated_at=NOW()
       WHERE id=$6 RETURNING *`,
      [name, description, website, logo_url, is_active, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Charity not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

exports.deleteCharity = async (req, res, next) => {
  try {
    // Soft delete
    await query('UPDATE charities SET is_active = false WHERE id = $1', [req.params.id]);
    res.json({ message: 'Charity deactivated' });
  } catch (err) {
    next(err);
  }
};

// POST /api/charities/:id/donate — one-off donation (no subscription required)
exports.donate = async (req, res, next) => {
  try {
    const { amount, donor_name, message } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Valid amount required' });

    // Update total_raised on the charity
    const result = await query(
      `UPDATE charities SET total_raised = total_raised + $1, updated_at = NOW()
       WHERE id = $2 AND is_active = true RETURNING id, name, total_raised`,
      [amount, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Charity not found' });

    res.json({ message: 'Donation recorded', charity: result.rows[0] });
  } catch (err) {
    next(err);
  }
};
