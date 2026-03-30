const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const subController = require('../controllers/subscriptionController');

router.post('/create-checkout', authenticate, subController.createCheckout);
router.post('/verify', authenticate, subController.verifyPayment);
router.post('/cancel', authenticate, subController.cancelSubscription);
router.get('/status', authenticate, subController.getStatus);
router.get('/portal', authenticate, subController.getBillingPortal);

module.exports = router;
