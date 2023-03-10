const express = require('express');
const authController = require('../controllers/authController');
const tournamentController = require('../controllers/tournamentController');

const router = express.Router();

router.use(authController.protect);

router.post('/', tournamentController.createTournament);

router.use('/*/:id', tournamentController.verifyOwnership);

router.patch('/changeTeam/:id', tournamentController.changeTeam);
router.patch('/addPlayers/:id', tournamentController.addPlayers);
router.patch('/removePlayers/:id', tournamentController.removePlayers);
router.patch('/modifyLine/:id', tournamentController.modifyLine);
router.patch('/deleteLine/:id', tournamentController.deleteLine);

router.use('/:id', tournamentController.verifyOwnership);
router
	.route('/:id')
	.get(tournamentController.getTournament)
	.patch(tournamentController.updateTournament)
	.delete(tournamentController.deleteTournament);

module.exports = router;
