const express = require('express');
const authController = require('../controllers/authController');
const tournamentController = require('../controllers/tournamentController');

const router = express.Router();

router.use(authController.protect);

router.post('/', tournamentController.createTournament);

router.use(tournamentController.verifyOwnership);

router.patch('/:id/changeTeam', tournamentController.changeTeam);
router.patch('/:id/addPlayers', tournamentController.addPlayers);
router.patch('/:id/removePlayers', tournamentController.removePlayers);

router
	.route('/:id')
	.get(tournamentController.getTournament)
	.patch(tournamentController.updateTournament)
	.delete(tournamentController.deleteTournament);

module.exports = router;
