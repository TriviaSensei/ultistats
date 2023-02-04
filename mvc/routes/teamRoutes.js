const express = require('express');
const authController = require('../controllers/authController');
const teamController = require('../controllers/teamController');

const router = express.Router();

router.use(authController.protect);

router.patch('/:id/addPlayer', teamController.addPlayer);
router.patch('/:id/removePlayer', teamController.removePlayer);
router.patch('/:id/editPlayer', teamController.editPlayer);
router.patch('/:id/addManager', teamController.requestAddManager);
router.patch('/:id/cancelManager', teamController.cancelAddManager);

router.post('/', teamController.createTeam);
router
	.route('/:id')
	.get(teamController.getTeam)
	.patch(teamController.updateTeam)
	.delete(teamController.deleteTeam);

module.exports = router;
