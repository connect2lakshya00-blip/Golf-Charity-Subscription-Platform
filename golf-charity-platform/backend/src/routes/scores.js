const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authenticate, requireSubscription } = require('../middleware/auth');
const scoreController = require('../controllers/scoreController');

const scoreValidation = [
  body('score').isInt({ min: 1, max: 45 }).withMessage('Score must be between 1 and 45'),
  body('played_at').isISO8601().withMessage('Valid date required'),
];

router.get('/', authenticate, requireSubscription, scoreController.getScores);
router.post('/', authenticate, requireSubscription, scoreValidation, scoreController.addScore);
router.delete('/:id', authenticate, requireSubscription, scoreController.deleteScore);

module.exports = router;
