const factory = require('./handlerFactory');
// const catchAsync = require('../../utils/catchAsync');
// const AppError = require('../../utils/appError');
const Tournament = require('../models/tournamentModel');

exports.createTournament = factory.createOne(Tournament);
exports.getTournament = factory.getOne(Tournament);
exports.getAllTournaments = factory.getAll(Tournament);
exports.updateTournament = factory.updateOne(Tournament);
exports.deleteTournament = factory.deleteOne(Tournament);
