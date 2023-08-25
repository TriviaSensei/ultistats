exports.rosterLimit = 50;
exports.freeMembership = {
	description: 'Free membership with basic stats',
	efficiency: false,
	heatmaps: false,
	maxLines: 0,
	plusMinus: false,
	yards: false,
	features:
		'Offense and defensive groupings for events, Points played, Touches, Goals, Assists, Turns, Blocks',
};
exports.plusMembership = {
	description: 'Plus membership with all features',
	efficiency: true,
	heatmaps: true,
	maxLines: 6,
	plusMinus: true,
	yards: true,
	features: 'Full membership',
};
