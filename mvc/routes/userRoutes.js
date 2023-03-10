const express = require('express');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');

const router = express.Router();

router.post('/login', authController.login);
router.get('/logout', authController.logout);
router.post('/signup', authController.isLoggedIn, authController.signup);
router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);
router.get('/getUser', authController.isLoggedIn, authController.getUser);
router.get('/activateAccount/:token', authController.activateAccount);

router.use(authController.protect);

router.patch('/changePassword', authController.updatePassword);
router.patch('/updateMe', userController.updateMe);
router.patch('/handleRequest/:id', userController.handleManagerRequest);
router.patch('/leaveTeam/:id', userController.leaveTeam);
router.get('/:id', userController.getMe);

module.exports = router;
