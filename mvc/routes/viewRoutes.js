const express = require('express');
const viewController = require('../controllers/viewController');
const authController = require('../controllers/authController');
const gameController = require('../controllers/gameController');
const subscriptionController = require('../controllers/subscriptionController');

const router = express.Router();

//run this middleware for all routes
router.use(authController.isLoggedIn);
router.use(viewController.handleAlert);

router.get('/', viewController.getHome);

router.get('/test', viewController.getTest);

router.get('/signup', viewController.getSignUpForm);
router.get('/login', viewController.getLoginForm);
router.get('/help', viewController.getHelpPage);
router.get('/forgotPassword', viewController.getForgotPasswordForm);
router.get('/resetPassword/:token', viewController.getPasswordResetForm);
router.get('/activate/:token', viewController.getActivation);

router.use(authController.protect);
router.get('/me', viewController.getAccount);
router.get('/mystuff/:id?', viewController.getManagerPage);
router.get('/contact', viewController.getContact);

router.get(
	'/mystuff/success/:id',
	subscriptionController.createSubscriptionCheckout,
	viewController.getManagerPage
);
router.get('/mystuff/cancel/:id', viewController.getManagerPage);
router.get('/confirmManager/:id', viewController.handleManagerRequest);
router.get('/declineManager/:id', viewController.handleManagerRequest);
router.get(
	'/games/:id',
	gameController.verifyOwnership,
	viewController.getGame
);
module.exports = router;
