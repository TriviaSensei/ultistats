export const dataDictionary = [
	{
		table: 'Tournaments',
		columns: [
			{
				name: 'id',
				description:
					'A unique number identifying the tournament. Always starts at 1 for whatever data you are downloading, so it is possible that two separate data downloads will produce different IDs for the same tournament',
			},
			{
				name: 'name',
				description: 'The name of the tournament',
			},
			{
				name: 'start_date',
				description: 'The start date of the tournament',
			},
			{
				name: 'format',
				description: 'The name of the tournament format (e.g. USAU, etc.)',
			},
			{
				name: 'endzone',
				description: 'The length of the end zone',
			},
			{
				name: 'length',
				description: 'The length of the main playing field area',
			},
			{
				name: 'width',
				description: 'The width of the playing field',
			},
			{
				name: 'cap',
				description: 'The point cap, as prescribed by the tournament rules',
			},
			{
				name: 'hard_cap',
				description:
					'The hard point cap, as prescribed by the tournament rules. Under the 2021 USAU rules, this should be the same as the normal point cap, as the win-by-2 rule was removed. However, this app does allow for custom tournament rules, so this column exists',
			},
		],
	},
	{
		table: 'Players',
		columns: [
			{
				name: 'id',
				description:
					'A unique number identifying the player. Always starts at 1 for whatever data you are downloading, so it is possible that two separate data downloads will produce different IDs for the same player',
			},
			{
				name: 'first_name',
				description: 'The first name of the player',
			},
			{
				name: 'last_name',
				description: 'The last name of the player',
			},
			{
				name: 'gender_match',
				description: 'The gender that this player matches against',
			},
			{
				name: 'line',
				description:
					'Whether this player is primarily an O-line or D-line player',
			},
			{
				name: 'position',
				description:
					"This player's primary position\n\tH: Handler\n\tC: Cutter\n\tHy: Hybrid",
			},
			{
				name: 'number',
				description: "The player's jersey number",
			},
		],
	},
	{
		table: 'Games',
		columns: [
			{
				name: 'id',
				description:
					'A unique number identifying the game. Always starts at 1 for whatever data you are downloading, so it is possible that two separate data downloads will produce different IDs for the same game',
			},
			{
				name: 'tournament',
				description: 'The tournament to which this game belongs',
			},
			{
				name: 'game_number',
				description:
					'The game number for this game within the tournament (e.g. 1 = the first game of the tournament)',
			},
			{
				name: 'round',
				description:
					'The round (e.g. pool play, semifinals, etc.) for this game',
			},
			{
				name: 'opponent',
				description: 'The opponent for this game',
			},
			{
				name: 'cap',
				description:
					'The point cap for this game, as prescribed by the tournament rules. This is, by default, the same as the point cap for the tournament, but this app also considers the possibility that games with a tournament may not have the same point caps, so this column exists.',
			},
			{
				name: 'hard_cap',
				description:
					'The hard point cap for this game, as prescribed by the tournament rules. Under the 2021 USAU rules, this should be the same as the normal point cap, as the win-by-2 rule was removed. However, this app does allow for custom tournament rules, so this column exists.',
			},
			{
				name: 'win_by',
				description:
					'The "win-by" requirement for this game. Under 2021 USAU rules, this should be 1, but this app does allow for custom tournament rules, so this column exists.',
			},
			{
				name: 'score',
				description: "Your team's score for this game",
			},
			{
				name: 'opp_score',
				description: "Your opponent's score for this game",
			},
			{
				name: 'result',
				description: "This game's result\n\tW: Win\n\tL: Loss\n\tT: Tie",
			},
		],
	},
	{
		table: 'Points',
		columns: [
			{
				name: 'game',
				description: 'The game ID to which this point belongs',
			},
			{
				name: 'point_number',
				description:
					'The point number for this point within the game (e.g. 1 = the first point of the game)',
			},
			{
				name: 'score',
				description: "Your team's score before this point",
			},
			{
				name: 'opp_score',
				description: "Your opponent's score before this point",
			},
			{
				name: 'scored',
				description:
					'Which team scored this point.\n1: Your team\n0: No one\n-1: Opponent',
			},
			{
				name: 'lineup',
				description:
					'A comma-separated list (in quotes) of player IDs that were on the field at the end of this point',
			},
			{
				name: 'injuries',
				description:
					'A comma-separated list (in quotes) of player IDs that were subbed off during this point',
			},
		],
	},
	{
		table: 'Passes',
		columns: [
			{
				name: 'game',
				description: 'The game ID to which this pass belongs',
			},
			{
				name: 'point_number',
				description:
					'The point number for this point within the game (e.g. 1 = the first point of the game)',
			},
			{
				name: 'event_index',
				description:
					'The event number for this pass within the point (e.g. 1 = the first event of the point)',
			},
			{
				name: 'event',
				description:
					"An event that occurs that isn't a pass\n\tsub: a substitution for any reason\n\ttimeout: a timeout called",
			},
			{
				name: 'event_team',
				description:
					'The team that this event applies to\n\t1: Your team\n\t0: Neither team\n\t-1: Your opponent',
			},
			{
				name: 'player_in',
				description: 'Player ID of the player who subbed in (if applicable)',
			},
			{
				name: 'player_out',
				description: 'Player ID of the player who subbed out (if applicable)',
			},
			{
				name: 'goal',
				description:
					'Whether this event resulted in a goal\n\t1: Goal for your team\n\t0: Not a goal\n\t-1: Goal for your opponent',
			},
			{
				name: 'player',
				description: 'Player ID of the intended receiver for the pass',
			},
			{
				name: 'result',
				description:
					'Result of the pass\n\tcomplete: Pass was completed\n\tthrowaway: Pass was thrown away. If a pass is thrown away, there may not be an intended receiver listed, and the throwaway is credited to the previous player who possessed the disc.\n\tdrop: Pass was dropped by the intended receiver\n\tstall: Thrower was stalled out. If a thrower is stalled out, there may not be an intended receiver listed. The stall will be credited to the previous player who possessed the disc.',
			},
			{
				name: 'turnover',
				description: 'Whether this event resulted in a turnover (true/false)',
			},
			{
				name: 'x',
				description:
					'The x-coordinate of this event. The field is oriented so that teams attack left and right, so the x-axis is the one stretching along the sideline from endzone to endzone. x=0 is defined as the back of your own endzone, regardless of your direction of attack. All reports will standardize your direction of attack.',
			},
			{
				name: 'y',
				description:
					'The y-coordinate of this event. The field is oriented so that teams attack left and right, so the y-axis is the one stretching along either endline. y=0 is defined as the left sideline, regardless of your direction of attack. All reports will standardize your direction of attack.',
			},
		],
	},
];
