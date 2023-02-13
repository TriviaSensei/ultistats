const express = require('express');
const authController = require('../controllers/authController');
const tournamentController = require('../controllers/tournamentController');

const router = express.Router();

router.use(authController.protect);

router.post('/', tournamentController.createTournament);

router.use(tournamentController.verifyOwnership);

router.patch('/changeTeam/:id', tournamentController.changeTeam);
router.patch('/addPlayers/:id', tournamentController.addPlayers);
router.patch('/removePlayers/:id', tournamentController.removePlayers);

router
	.route('/:id')
	.get(tournamentController.getTournament)
	.patch(tournamentController.updateTournament)
	.delete(tournamentController.deleteTournament);

module.exports = router;
