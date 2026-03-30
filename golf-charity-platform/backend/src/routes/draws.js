const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin, requireSubscription } = require('../middleware/auth');
const drawController = require('../controllers/drawController');

router.get('/', authenticate, drawController.getDraws);
router.get('/my-winnings', authenticate, drawController.getMyWinnings);
router.get('/current', authenticate, drawController.getCurrentDraw);
router.get('/:id', authenticate, drawController.getDrawById);
router.get('/:id/results', authenticate, drawController.getDrawResults);

// Admin only
router.post('/run', authenticate, requireAdmin, drawController.runDraw);
router.post('/simulate', authenticate, requireAdmin, drawController.simulateDraw);
router.post('/:id/publish', authenticate, requireAdmin, drawController.publishDraw);

// Winner proof upload
router.post('/:drawId/proof', authenticate, requireSubscription, drawController.uploadProof);

module.exports = router;
