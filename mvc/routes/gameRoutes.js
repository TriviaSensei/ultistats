const express = require('express');
const authController = require('../controllers/authController');
const gameController = require('../controllers/gameController');
const Game = require('../models/gameModel');

const router = express.Router();

router.use(authController.protect);

router.post('/', gameController.createGame);

router.use('/*/:id', gameController.verifyOwnership);

router.patch('/startPoint/:id', gameController.startPoint);
router.patch('/addPass/:id', gameController.setPasses);
router.patch('/endGame/:id', gameController.endGame);
router.patch('/clear/:id', gameController.clearPoints);

router.use('/:id', gameController.verifyOwnership);
router
	.route('/:id')
	.get(gameController.getGame)
	.patch(gameController.updateGame)
	.delete(gameController.deleteGame);

module.exports = router;
