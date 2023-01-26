const factory = require('./handlerFactory');
// const catchAsync = require('../../utils/catchAsync');
// const AppError = require('../../utils/appError');
const Scrimmage = require('../models/scrimmageModel');

exports.createScrimmage = factory.createOne(Scrimmage);
exports.getScrimmage = factory.getOne(Scrimmage);
exports.getAllScrimmages = factory.getAll(Scrimmage);
exports.updateScrimmage = factory.updateOne(Scrimmage);
exports.deleteScrimmage = factory.deleteOne(Scrimmage);
