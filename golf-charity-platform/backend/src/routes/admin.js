const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const adminController = require('../controllers/adminController');

// All admin routes require auth + admin role
router.use(authenticate, requireAdmin);

router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUserById);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deactivateUser);

router.get('/subscriptions', adminController.getSubscriptions);
router.get('/analytics', adminController.getAnalytics);

router.get('/winners', adminController.getPendingWinners);
router.put('/winners/:id/approve', adminController.approveWinner);
router.put('/winners/:id/reject', adminController.rejectWinner);
router.put('/winners/:id/paid', adminController.markPaid);

module.exports = router;
