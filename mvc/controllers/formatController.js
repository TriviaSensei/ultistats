const factory = require('./handlerFactory');
// const catchAsync = require('../../utils/catchAsync');
// const AppError = require('../../utils/appError');
const Format = require('../models/formatModel');

exports.createFormat = factory.createOne(Format);
exports.getFormat = factory.getOne(Format);
exports.getAllFormats = factory.getAll(Format);
exports.updateFormat = factory.updateOne(Format);
exports.deleteFormat = factory.deleteOne(Format);
