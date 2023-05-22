const express = require('express');
const authController = require('../controllers/authController');
const gameController = require('../controllers/gameController');
const Game = require('../models/gameModel');

const router = express.Router();

router.use(authController.protect);

router.post('/', gameController.createGame);

router.use('/*/:id', gameController.verifyOwnership);

router.patch('/startPoint/:id', gameController.startPoint);
router.patch('/setPasses/:id', gameController.setPasses);
router.patch('/endPeriod/:id', gameController.endPeriod);
router.patch('/endGame/:id', gameController.endGame);
router.patch('/setLineup/:id', gameController.setLineup);
router.patch('/subPlayer/:id', gameController.subPlayer);
router.patch('/returnToPoint/:id', gameController.returnToPoint);
/**Test only */
router.patch('/clear/:id', gameController.clearPoints);
router.patch('/resetPoint/:id', gameController.resetPoint);
router.patch('/resetHalf/:id', gameController.resetBeforeHalf);
router.patch('/resetAll/:id', gameController.resetAll);
/**end test endpoints */
router.use('/:id', gameController.verifyOwnership);
router
	.route('/:id')
	.get(gameController.getGame)
	.patch(gameController.updateGame)
	.delete(gameController.deleteGame);

module.exports = router;
