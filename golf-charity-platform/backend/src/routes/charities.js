const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const charityController = require('../controllers/charityController');

router.get('/', charityController.getCharities);
router.get('/:id', charityController.getCharity);
router.post('/:id/donate', charityController.donate); // Public one-off donation
router.post('/', authenticate, requireAdmin, charityController.createCharity);
router.put('/:id', authenticate, requireAdmin, charityController.updateCharity);
router.delete('/:id', authenticate, requireAdmin, charityController.deleteCharity);

module.exports = router;
