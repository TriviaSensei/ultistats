const express = require('express');
const authController = require('../controllers/authController');
const formatController = require('../controllers/formatController');

const router = express.Router();

router.use(authController.protect);

router.get('/:id', formatController.getFormat);
router.get('/', formatController.getAllFormats);

router.use(authController.restrictTo('admin'));

router.post('/', formatController.createFormat);
router
	.route('/:id')
	.patch(formatController.updateFormat)
	.delete(formatController.deleteFormat);

module.exports = router;
