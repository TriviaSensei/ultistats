const express = require('express');
const authController = require('../controllers/authController');
const teamController = require('../controllers/teamController');
const subscriptionController = require('../controllers/subscriptionController');

const router = express.Router();

router.use(authController.protect);

router.use('/:id', teamController.verifyOwnership);
router.use('/*/:id', teamController.verifyOwnership);

// router.post('/:id', subscriptionController.createSubscription);
// router.route('/:id').get(subscriptionController.getSubscription);
// .patch(subscriptionController.updateSubscription);

router.route('/:id').post(subscriptionController.createSubscription);

module.exports = router;
