const express = require('express');
const authController = require('../controllers/authController');
const gameController = require('../controllers/gameController');

const router = express.Router();

router.use(authController.protect);

router.post('/', gameController.createGame);

router.use(gameController.verifyOwnership);

router.patch('/:id/startPoint', gameController.startPoint);
router.patch('/:id/addPass', gameController.addPass);
router.patch('/:id/endGame', gameController.endGame);
router
	.route('/:id')
	.get(gameController.getGame)
	.patch(gameController.updateGame)
	.delete(gameController.deleteGame);

module.exports = router;
