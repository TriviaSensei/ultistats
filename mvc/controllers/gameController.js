const factory = require('./handlerFactory');
// const catchAsync = require('../../utils/catchAsync');
// const AppError = require('../../utils/appError');
const Game = require('../models/gameModel');

exports.createGame = factory.createOne(Game);
exports.getGame = factory.getOne(Game);
exports.getAllGames = factory.getAll(Game);
exports.updateGame = factory.updateOne(Game);
exports.deleteGame = factory.deleteOne(Game);
