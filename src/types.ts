/**
 * Eurogames API Type Definitions
 */

// Games
export interface Game {
	id: string;
	name: string;
	bggId?: number;
	notes?: string;
	data?: Record<string, unknown>;
	createdAt: string;
	updatedAt: string;
}

export interface GamesListResponse {
	games: Game[];
	total: number;
	filter?: Record<string, unknown>;
}

export interface GameDetailsResponse extends Game {
	history?: PlayRecord[];
}

// Play Records
export interface PlayRecord {
	id: string;
	gameId: string;
	date: string;
	players: string[];
	winner?: string;
	notes?: string;
	createdAt: string;
	updatedAt: string;
}

export interface PlaysListResponse {
	plays: PlayRecord[];
	total: number;
	filter?: Record<string, unknown>;
}

// Statistics
export interface WinStats {
	gameId: string;
	gameName: string;
	wins: Record<string, number>;
	totalPlays: number;
}

export interface WinStatsResponse {
	stats: WinStats[];
}

export interface TotalStats {
	player: string;
	wins: number;
	plays: number;
	winRate: number;
}

export interface TotalStatsResponse {
	totals: TotalStats[];
}

export interface LastPlayedItem {
	gameId: string;
	gameName: string;
	lastPlayed: string;
}

export interface LastPlayedResponse {
	games: LastPlayedItem[];
}

export interface RecentPlay {
	id: string;
	gameId: string;
	gameName: string;
	date: string;
	winner?: string;
	players: string[];
}

export interface RecentPlaysResponse {
	plays: RecentPlay[];
	limit?: number;
}

export interface PlayerStats {
	player: string;
	wins: number;
	plays: number;
	winRate: number;
	favoriteGame?: string;
	recentPlays?: RecentPlay[];
}

export interface GameStats {
	gameId: string;
	gameName: string;
	totalPlays: number;
	winnerDistribution: Record<string, number>;
	lastPlayed: string;
	avgPlayersPerGame: number;
}

export interface GameStatsResponse {
	games: GameStats[];
}

// Data Export
export interface ExportData {
	games: Game[];
	plays: PlayRecord[];
	exportedAt: string;
}

// Query Response
export interface QueryResponse {
	data: unknown[];
	rowCount: number;
}

// Generic API Response
export interface ApiErrorResponse {
	error: string;
	message: string;
	status: number;
}
