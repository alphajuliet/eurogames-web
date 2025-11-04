/**
 * Type definitions for Eurogames API
 * These mirror the TypeScript types in src/types.ts
 * Used for JSDoc autocomplete in IDE
 */

/**
 * @typedef {Object} Game
 * @property {string} id - Unique game identifier
 * @property {string} name - Game name
 * @property {number} [bggId] - BoardGameGeek ID
 * @property {string} [notes] - User notes about the game
 * @property {Record<string, unknown>} [data] - Additional BGG data
 * @property {string} createdAt - ISO timestamp when created
 * @property {string} updatedAt - ISO timestamp when last updated
 */

/**
 * @typedef {Object} GamesListResponse
 * @property {Game[]} games - Array of games
 * @property {number} total - Total count of games
 * @property {Record<string, unknown>} [filter] - Applied filters
 */

/**
 * @typedef {Game} GameDetailsResponse
 * @property {PlayRecord[]} [history] - Play history for this game
 */

/**
 * @typedef {Object} PlayRecord
 * @property {string} id - Unique play identifier
 * @property {string} gameId - ID of the game played
 * @property {string} date - ISO date string when played
 * @property {string[]} players - Array of player names
 * @property {string} [winner] - Name of the winner
 * @property {string} [notes] - Notes about this play
 * @property {string} createdAt - ISO timestamp when created
 * @property {string} updatedAt - ISO timestamp when last updated
 */

/**
 * @typedef {Object} PlaysListResponse
 * @property {PlayRecord[]} plays - Array of play records
 * @property {number} total - Total count of plays
 * @property {Record<string, unknown>} [filter] - Applied filters
 */

/**
 * @typedef {Object} WinStats
 * @property {string} gameId - Game identifier
 * @property {string} gameName - Game name
 * @property {Record<string, number>} wins - Map of player name to win count
 * @property {number} totalPlays - Total number of plays for this game
 */

/**
 * @typedef {Object} WinStatsResponse
 * @property {WinStats[]} stats - Array of win statistics per game
 */

/**
 * @typedef {Object} TotalStats
 * @property {string} player - Player name
 * @property {number} wins - Total wins across all games
 * @property {number} plays - Total plays across all games
 * @property {number} winRate - Win rate as decimal (0-1)
 */

/**
 * @typedef {Object} TotalStatsResponse
 * @property {TotalStats[]} totals - Array of total statistics per player
 */

/**
 * @typedef {Object} LastPlayedItem
 * @property {string} gameId - Game identifier
 * @property {string} gameName - Game name
 * @property {string} lastPlayed - ISO date string of last play
 */

/**
 * @typedef {Object} LastPlayedResponse
 * @property {LastPlayedItem[]} games - Array of games with last played dates
 */

/**
 * @typedef {Object} RecentPlay
 * @property {string} id - Play identifier
 * @property {string} gameId - Game identifier
 * @property {string} gameName - Game name
 * @property {string} date - ISO date string when played
 * @property {string} [winner] - Name of the winner
 * @property {string[]} players - Array of player names
 */

/**
 * @typedef {Object} RecentPlaysResponse
 * @property {RecentPlay[]} plays - Array of recent plays
 * @property {number} [limit] - Limit applied to query
 */

/**
 * @typedef {Object} PlayerStats
 * @property {string} player - Player name
 * @property {number} wins - Total wins
 * @property {number} plays - Total plays
 * @property {number} winRate - Win rate as decimal (0-1)
 * @property {string} [favoriteGame] - Most played game
 * @property {RecentPlay[]} [recentPlays] - Recent plays for this player
 */

/**
 * @typedef {Object} GameStats
 * @property {string} gameId - Game identifier
 * @property {string} gameName - Game name
 * @property {number} totalPlays - Total number of plays
 * @property {Record<string, number>} winnerDistribution - Map of winners to counts
 * @property {string} lastPlayed - ISO date string of last play
 * @property {number} avgPlayersPerGame - Average number of players per game
 */

/**
 * @typedef {Object} GameStatsResponse
 * @property {GameStats[]} games - Array of game statistics
 */

/**
 * @typedef {Object} ExportData
 * @property {Game[]} games - All games
 * @property {PlayRecord[]} plays - All plays
 * @property {string} exportedAt - ISO timestamp of export
 */

/**
 * @typedef {Object} QueryResponse
 * @property {unknown[]} data - Query result rows
 * @property {number} rowCount - Number of rows returned
 */

/**
 * Generic API Response wrapper
 * @template T
 * @typedef {Object} ApiResponse
 * @property {boolean} success - Whether the request succeeded
 * @property {T} [data] - Response data (present if success is true)
 * @property {string} [error] - Error message (present if success is false)
 * @property {number} status - HTTP status code
 */

/**
 * API Error Response
 * @typedef {Object} ApiErrorResponse
 * @property {string} error - Error type
 * @property {string} message - Error message
 * @property {number} status - HTTP status code
 */
