const express = require('express');
const viewController = require('../controllers/viewController');
const authController = require('../controllers/authController');

const router = express.Router();

//run this middleware for all routes
router.use(authController.isLoggedIn);

router.get('/', viewController.getHome);
router.get('/signup', viewController.getSignUpForm);
router.get('/login', viewController.getLoginForm);

router.use(authController.protect);
router.get('/me', viewController.getAccount);
router.get('/mystuff', viewController.getManagerPage);

module.exports = router;
