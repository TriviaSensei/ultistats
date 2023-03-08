const express = require('express');
const authController = require('../controllers/authController');
const gameController = require('../controllers/gameController');

const router = express.Router();

router.use(authController.protect);

router.post('/', gameController.createGame);

router.use('/*/:id', gameController.verifyOwnership);

router.patch('/startPoint/:id', gameController.startPoint);
router.patch('/addPass/:id', gameController.addPass);
router.patch('/endGame/:id', gameController.endGame);

router.use('/:id', gameController.verifyOwnership);
router
	.route('/:id')
	.get(gameController.getGame)
	.patch(gameController.updateGame)
	.delete(gameController.deleteGame);

module.exports = router;
