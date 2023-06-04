const express = require('express');
const authController = require('../controllers/authController');
const teamController = require('../controllers/teamController');

const router = express.Router();

router.use(authController.protect);
router.post('/', teamController.createTeam);

router.use('/*/:id', teamController.verifyOwnership);

router.patch('/addPlayer/:id', teamController.addPlayer);
router.patch('/removePlayer/:id', teamController.removePlayer);
router.patch('/editPlayer/:id', teamController.editPlayer);
router.patch('/addManager/:id', teamController.requestAddManager);
router.patch('/cancelManager/:id', teamController.cancelAddManager);
router.patch('/leaveTeam/:id', teamController.leaveTeam);
router.get('/tournaments/:id', teamController.getTournaments);
router.get('/tournament-details/:id', teamController.getTournamentDetails);

router.use('/:id', teamController.verifyOwnership);

router
	.route('/:id')
	.get(teamController.getTeam)
	.patch(teamController.updateTeam)
	.delete(teamController.deleteTeam);

module.exports = router;
