/// <reference path="./types.js" />

/**
 * API client for Eurogames backend
 * Handles all HTTP requests and response unwrapping
 */
const api = {
  /**
   * Base fetch wrapper that handles ApiResponse format
   * @template T
   * @param {string} endpoint
   * @param {RequestInit} [options]
   * @returns {Promise<ApiResponse<T>>}
   */
  async _fetch(endpoint, options = {}) {
    try {
      const response = await fetch(endpoint, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      const result = await response.json();
      return result; // Already in ApiResponse format from worker

    } catch (error) {
      console.error('API Error:', error);
      return {
        success: false,
        data: undefined,
        error: error.message || 'Network error',
        status: 0
      };
    }
  },

  // ===== GAMES =====

  /**
   * Get all games
   * @returns {Promise<ApiResponse<GamesListResponse>>}
   */
  async getGames() {
    return this._fetch('/v1/games');
  },

  /**
   * Get game by ID
   * @param {string} id
   * @returns {Promise<ApiResponse<GameDetailsResponse>>}
   */
  async getGame(id) {
    return this._fetch(`/v1/games/${id}`);
  },

  /**
   * Add new game from BoardGameGeek
   * @param {number} bggId
   * @returns {Promise<ApiResponse<Game>>}
   */
  async addGame(bggId) {
    return this._fetch('/v1/games', {
      method: 'POST',
      body: JSON.stringify({ bggId })
    });
  },

  /**
   * Update game notes
   * @param {string} id
   * @param {string} notes
   * @returns {Promise<ApiResponse<Game>>}
   */
  async updateGameNotes(id, notes) {
    return this._fetch(`/v1/games/${id}/notes`, {
      method: 'PATCH',
      body: JSON.stringify({ notes })
    });
  },

  /**
   * Update game BGG data
   * @param {string} id
   * @param {Record<string, unknown>} data
   * @returns {Promise<ApiResponse<Game>>}
   */
  async updateGameData(id, data) {
    return this._fetch(`/v1/games/${id}/data`, {
      method: 'PATCH',
      body: JSON.stringify({ data })
    });
  },

  /**
   * Sync game data from BoardGameGeek
   * @param {string} id
   * @returns {Promise<ApiResponse<Game>>}
   */
  async syncGameData(id) {
    return this._fetch(`/v1/games/${id}/sync`, {
      method: 'PUT',
      body: JSON.stringify({})
    });
  },

  /**
   * Get game play history
   * @param {string} id
   * @returns {Promise<ApiResponse<PlayRecord[]>>}
   */
  async getGameHistory(id) {
    return this._fetch(`/v1/games/${id}/history`);
  },

  // ===== PLAYS =====

  /**
   * Get all plays with optional filtering
   * @param {Record<string, string>} [filter]
   * @returns {Promise<ApiResponse<PlaysListResponse>>}
   */
  async getPlays(filter) {
    let endpoint = '/v1/plays';
    if (filter) {
      const params = new URLSearchParams(filter);
      endpoint += `?${params.toString()}`;
    }
    return this._fetch(endpoint);
  },

  /**
   * Record new play
   * @param {Object} playData
   * @param {string} playData.gameId
   * @param {string} playData.date
   * @param {string[]} playData.players
   * @param {string} [playData.winner]
   * @param {string} [playData.notes]
   * @returns {Promise<ApiResponse<PlayRecord>>}
   */
  async recordPlay(playData) {
    return this._fetch('/v1/plays', {
      method: 'POST',
      body: JSON.stringify(playData)
    });
  },

  /**
   * Get specific play record
   * @param {string} id
   * @returns {Promise<ApiResponse<PlayRecord>>}
   */
  async getPlay(id) {
    return this._fetch(`/v1/plays/${id}`);
  },

  /**
   * Update play record
   * @param {string} id
   * @param {Partial<PlayRecord>} updates
   * @returns {Promise<ApiResponse<PlayRecord>>}
   */
  async updatePlay(id, updates) {
    return this._fetch(`/v1/plays/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  /**
   * Delete play record
   * @param {string} id
   * @returns {Promise<ApiResponse<void>>}
   */
  async deletePlay(id) {
    return this._fetch(`/v1/plays/${id}`, {
      method: 'DELETE'
    });
  },

  // ===== STATISTICS =====

  /**
   * Get win statistics by game
   * @returns {Promise<ApiResponse<WinStatsResponse>>}
   */
  async getWinStats() {
    return this._fetch('/v1/stats/winners');
  },

  /**
   * Get overall win totals
   * @returns {Promise<ApiResponse<TotalStatsResponse>>}
   */
  async getTotalStats() {
    return this._fetch('/v1/stats/totals');
  },

  /**
   * Get last played dates for all games
   * @returns {Promise<ApiResponse<LastPlayedResponse>>}
   */
  async getLastPlayed() {
    return this._fetch('/v1/stats/last-played');
  },

  /**
   * Get recent game plays
   * @param {number} [limit]
   * @returns {Promise<ApiResponse<RecentPlaysResponse>>}
   */
  async getRecentPlays(limit) {
    const endpoint = limit
      ? `/v1/stats/recent?limit=${limit}`
      : '/v1/stats/recent';
    return this._fetch(endpoint);
  },

  /**
   * Get player-specific statistics
   * @param {string} player
   * @returns {Promise<ApiResponse<PlayerStats>>}
   */
  async getPlayerStats(player) {
    return this._fetch(`/v1/stats/players/${encodeURIComponent(player)}`);
  },

  /**
   * Get game collection statistics
   * @returns {Promise<ApiResponse<GameStatsResponse>>}
   */
  async getGameStats() {
    return this._fetch('/v1/stats/games');
  },

  // ===== UTILITIES =====

  /**
   * Export all data as JSON
   * @returns {Promise<ApiResponse<ExportData>>}
   */
  async exportData() {
    return this._fetch('/v1/export');
  },

  /**
   * Execute custom SELECT query
   * @param {string} sql
   * @returns {Promise<ApiResponse<QueryResponse>>}
   */
  async query(sql) {
    return this._fetch('/v1/query', {
      method: 'POST',
      body: JSON.stringify({ sql })
    });
  }
};

// Make available globally
window.api = api;
