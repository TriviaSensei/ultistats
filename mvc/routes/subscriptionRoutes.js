const express = require('express');
const authController = require('../controllers/authController');
const teamController = require('../controllers/teamController');
const subscriptionController = require('../controllers/subscriptionController');

const router = express.Router();

router.use(authController.protect);

router.use('/*/:id', teamController.verifyOwnership);

// router.post('/:id', subscriptionController.createSubscription);
// router.route('/:id').get(subscriptionController.getSubscription);
// .patch(subscriptionController.updateSubscription);

router
	.route('/create-checkout-session/:id')
	.post(subscriptionController.createCheckoutSession);
router.route('/cancel/:id').patch(subscriptionController.cancelSubscription);
router
	.route('/reactivate/:id')
	.patch(subscriptionController.reactivateSubscription);

router.use('/:id', teamController.verifyOwnership);
module.exports = router;
