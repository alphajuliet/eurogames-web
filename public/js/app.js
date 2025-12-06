/// <reference path="./types.js" />

/**
 * Main Alpine.js application
 * Initializes stores and components for the Eurogames app
 */

// Initialize Alpine.js stores and components
document.addEventListener('alpine:init', () => {

  // ===== GLOBAL APP STORE =====
  Alpine.store('app', {
    loading: false,
    loadingMessage: 'Loading...',
    error: null,
    currentView: 'games',

    /**
     * Set the current view
     * @param {string} view - 'games' | 'plays' | 'stats'
     */
    setView(view) {
      this.currentView = view;
      this.error = null;

      // Load data for the view if needed
      if (view === 'games' && Alpine.store('games').list.length === 0) {
        Alpine.store('games').load();
      } else if (view === 'plays') {
        // Load games for the dropdown if not already loaded
        if (Alpine.store('games').list.length === 0) {
          Alpine.store('games').load();
        }
        // Load plays if not already loaded
        if (Alpine.store('plays').list.length === 0) {
          Alpine.store('plays').load();
        }
      } else if (view === 'lastPlayed' && Alpine.store('lastPlayed').list.length === 0) {
        Alpine.store('lastPlayed').load();
      } else if (view === 'stats') {
        const stats = Alpine.store('stats');
        if (!stats.winners && !stats.totals) {
          stats.loadAll();
        }
      }
    },

    /**
     * Set loading state
     * @param {boolean} isLoading
     * @param {string} [message]
     */
    setLoading(isLoading, message = 'Loading...') {
      this.loading = isLoading;
      this.loadingMessage = message;
    },

    /**
     * Set error message (auto-dismisses after 5 seconds)
     * @param {string} message
     */
    setError(message) {
      this.error = message;
      setTimeout(() => this.error = null, 5000);
    },

    /**
     * Clear error message
     */
    clearError() {
      this.error = null;
    }
  });

  // ===== GAMES STORE =====
  Alpine.store('games', {
    list: [],
    selected: null,
    filter: '',
    statusFilter: '',
    sortBy: 'name',
    sortDirection: 'asc',

    /**
     * Load all games from API
     */
    async load() {
      Alpine.store('app').setLoading(true, 'Loading games...');

      const response = await api.getGames();

      if (response.success && response.data) {
        this.list = response.data.games || [];
        console.log('Loaded games:', this.list);
      } else {
        this.list = []; // Ensure list is always an array
        Alpine.store('app').setError(response.error || 'Failed to load games');
        console.error('Failed to load games:', response);
      }

      Alpine.store('app').setLoading(false);
    },

    /**
     * Add a new game by BGG ID
     * @param {number} bggId
     * @returns {Promise<boolean>}
     */
    async add(bggId) {
      const response = await api.addGame(bggId);

      if (response.success) {
        await this.load(); // Reload list
        return true;
      } else {
        Alpine.store('app').setError(response.error || 'Failed to add game');
        return false;
      }
    },

    /**
     * Update game notes
     * @param {string} id
     * @param {string} notes
     * @returns {Promise<boolean>}
     */
    async updateNotes(id, notes) {
      const response = await api.updateGameNotes(id, notes);

      if (response.success) {
        await this.load(); // Reload list
        return true;
      } else {
        Alpine.store('app').setError(response.error || 'Failed to update notes');
        return false;
      }
    },

    /**
     * Set sort column and toggle direction
     * @param {string} column
     */
    setSortBy(column) {
      if (this.sortBy === column) {
        // Toggle direction if same column
        this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        // New column, default to ascending
        this.sortBy = column;
        this.sortDirection = 'asc';
      }
    },

    /**
     * Get filtered and sorted games
     * @returns {Game[]}
     */
    get filtered() {
      let result = this.list;

      // Apply text filter
      if (this.filter) {
        const filterLower = this.filter.toLowerCase();
        result = result.filter(g =>
          g.name.toLowerCase().includes(filterLower) ||
          (g.status && g.status.toLowerCase().includes(filterLower))
        );
      }

      // Apply status filter
      if (this.statusFilter) {
        result = result.filter(g => g.status === this.statusFilter);
      }

      // Apply sort
      result = [...result].sort((a, b) => {
        let compareResult = 0;

        if (this.sortBy === 'name') {
          compareResult = a.name.localeCompare(b.name);
        } else if (this.sortBy === 'status') {
          compareResult = (a.status || '').localeCompare(b.status || '');
        } else if (this.sortBy === 'ranking') {
          compareResult = (a.ranking || 99999) - (b.ranking || 99999);
        } else if (this.sortBy === 'complexity') {
          compareResult = (a.complexity || 0) - (b.complexity || 0);
        } else if (this.sortBy === 'games') {
          compareResult = (a.games || 0) - (b.games || 0);
        } else if (this.sortBy === 'lastPlayed') {
          const dateA = a.lastPlayed ? new Date(a.lastPlayed).getTime() : 0;
          const dateB = b.lastPlayed ? new Date(b.lastPlayed).getTime() : 0;
          compareResult = dateA - dateB;
        }

        // Apply sort direction
        return this.sortDirection === 'asc' ? compareResult : -compareResult;
      });

      return result;
    }
  });

  // ===== PLAYS STORE =====
  Alpine.store('plays', {
    list: [],
    filter: '',
    sortBy: 'date',
    sortDirection: 'desc',

    /**
     * Load all plays from API
     */
    async load() {
      Alpine.store('app').setLoading(true, 'Loading plays...');

      const response = await api.getPlays({ limit: '100' });
      console.log('Plays API response:', response);

      if (response.success && response.data) {
        this.list = response.data.plays || [];
        console.log('Loaded plays:', this.list);
      } else {
        this.list = []; // Ensure list is always an array
        console.error('Failed to load plays:', response);
        Alpine.store('app').setError(response.error || 'Failed to load plays');
      }

      Alpine.store('app').setLoading(false);
    },

    /**
     * Record a new play
     * @param {Object} playData
     * @returns {Promise<boolean>}
     */
    async record(playData) {
      const response = await api.recordPlay(playData);

      if (response.success) {
        await this.load(); // Reload list
        return true;
      } else {
        Alpine.store('app').setError(response.error || 'Failed to record play');
        return false;
      }
    },

    /**
     * Delete a play
     * @param {string} id
     * @returns {Promise<boolean>}
     */
    async delete(id) {
      if (!confirm('Are you sure you want to delete this play record?')) {
        return false;
      }

      console.log('Deleting play with ID:', id);
      const response = await api.deletePlay(id);
      console.log('Delete response:', response);

      if (response.success) {
        await this.load(); // Reload list
        return true;
      } else {
        const errorMsg = `Failed to delete play (${response.status}): ${response.error || 'Unknown error'}`;
        console.error(errorMsg);
        Alpine.store('app').setError(errorMsg);
        return false;
      }
    },

    /**
     * Set sort column and toggle direction
     * @param {string} column
     */
    setSortBy(column) {
      if (this.sortBy === column) {
        // Toggle direction if same column
        this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        // New column, default to ascending
        this.sortBy = column;
        this.sortDirection = 'asc';
      }
    },

    /**
     * Get filtered and sorted plays
     * @returns {PlayRecord[]}
     */
    get filtered() {
      // Ensure list is always an array
      if (!Array.isArray(this.list)) {
        return [];
      }

      let result = this.list;

      // Apply text filter
      if (this.filter) {
        const filterLower = this.filter.toLowerCase();
        result = result.filter(p =>
          (p.name && p.name.toLowerCase().includes(filterLower)) ||
          (p.winner && p.winner.toLowerCase().includes(filterLower)) ||
          (p.comment && p.comment.toLowerCase().includes(filterLower)) ||
          (p.players && Array.isArray(p.players) && p.players.some(player => player.toLowerCase().includes(filterLower)))
        );
      }

      // Apply sort
      result = [...result].sort((a, b) => {
        let compareResult = 0;

        if (this.sortBy === 'date') {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          compareResult = dateA - dateB;
        } else if (this.sortBy === 'gameName') {
          compareResult = (a.name || '').localeCompare(b.name || '');
        } else if (this.sortBy === 'players') {
          const aLength = a.players && Array.isArray(a.players) ? a.players.length : 0;
          const bLength = b.players && Array.isArray(b.players) ? b.players.length : 0;
          compareResult = aLength - bLength;
        } else if (this.sortBy === 'winner') {
          compareResult = (a.winner || '').localeCompare(b.winner || '');
        }

        // Apply sort direction
        return this.sortDirection === 'asc' ? compareResult : -compareResult;
      });

      return result;
    }
  });

  // ===== LAST PLAYED STORE =====
  Alpine.store('lastPlayed', {
    list: [],
    sortBy: 'elapsedDays',
    sortDirection: 'asc',

    /**
     * Load last played data from API
     */
    async load() {
      Alpine.store('app').setLoading(true, 'Loading last played data...');

      const response = await api.getLastPlayed();
      console.log('Last Played API response:', response);

      if (response.success && response.data) {
        // Calculate elapsed days for each game
        const now = new Date();
        const games = Array.isArray(response.data) ? response.data : (response.data.data || response.data.games || []);

        this.list = games.map(game => {
          const lastPlayedDate = game.lastPlayed ? new Date(game.lastPlayed) : null;
          const elapsedDays = lastPlayedDate
            ? Math.floor((now.getTime() - lastPlayedDate.getTime()) / (1000 * 60 * 60 * 24))
            : null;

          return {
            ...game,
            elapsedDays,
            timesPlayed: game.games || 0
          };
        });

        console.log('Loaded last played data:', this.list);
      } else {
        this.list = [];
        console.error('Failed to load last played data:', response);
        Alpine.store('app').setError(response.error || 'Failed to load last played data');
      }

      Alpine.store('app').setLoading(false);
    },

    /**
     * Set sort column and toggle direction
     * @param {string} column
     */
    setSortBy(column) {
      if (this.sortBy === column) {
        // Toggle direction if same column
        this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        // New column, default to ascending
        this.sortBy = column;
        this.sortDirection = 'asc';
      }
    },

    /**
     * Get sorted last played data
     * @returns {Array}
     */
    get sorted() {
      let result = [...this.list];

      // Apply sort
      result = result.sort((a, b) => {
        let compareResult = 0;

        if (this.sortBy === 'gameName') {
          compareResult = (a.gameName || '').localeCompare(b.gameName || '');
        } else if (this.sortBy === 'lastPlayed') {
          const dateA = a.lastPlayed ? new Date(a.lastPlayed).getTime() : 0;
          const dateB = b.lastPlayed ? new Date(b.lastPlayed).getTime() : 0;
          compareResult = dateA - dateB;
        } else if (this.sortBy === 'timesPlayed') {
          compareResult = (a.timesPlayed || 0) - (b.timesPlayed || 0);
        } else if (this.sortBy === 'elapsedDays') {
          const daysA = a.elapsedDays !== null ? a.elapsedDays : 999999;
          const daysB = b.elapsedDays !== null ? b.elapsedDays : 999999;
          compareResult = daysA - daysB;
        }

        // Apply sort direction
        return this.sortDirection === 'asc' ? compareResult : -compareResult;
      });

      return result;
    }
  });

  // ===== STATS STORE =====
  Alpine.store('stats', {
    winners: null,
    totals: null,
    recent: null,
    gamesSortBy: 'gameName',
    gamesSortDirection: 'asc',

    /**
     * Load all statistics
     */
    async loadAll() {
      await Promise.all([
        this.loadWinStats(),
        this.loadTotalStats()
      ]);
    },

    /**
     * Set sort column for game statistics and toggle direction
     * @param {string} column
     */
    setGamesSortBy(column) {
      if (this.gamesSortBy === column) {
        // Toggle direction if same column
        this.gamesSortDirection = this.gamesSortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        // New column, default to ascending
        this.gamesSortBy = column;
        this.gamesSortDirection = 'asc';
      }
    },

    /**
     * Get sorted game statistics
     * @returns {Array}
     */
    get sortedGames() {
      if (!Array.isArray(this.winners)) {
        return [];
      }

      let result = [...this.winners];

      // Apply sort
      result = result.sort((a, b) => {
        let compareResult = 0;

        if (this.gamesSortBy === 'gameName') {
          compareResult = a.gameName.localeCompare(b.gameName);
        } else if (this.gamesSortBy === 'totalPlays') {
          compareResult = a.totalPlays - b.totalPlays;
        } else if (this.gamesSortBy === 'andrewWins') {
          compareResult = a.wins.andrew - b.wins.andrew;
        } else if (this.gamesSortBy === 'trishWins') {
          compareResult = a.wins.trish - b.wins.trish;
        } else if (this.gamesSortBy === 'draws') {
          compareResult = a.wins.draw - b.wins.draw;
        } else if (this.gamesSortBy === 'andrewWinRate') {
          const rateA = a.wins.andrew / a.totalPlays;
          const rateB = b.wins.andrew / b.totalPlays;
          compareResult = rateA - rateB;
        }

        // Apply sort direction
        return this.gamesSortDirection === 'asc' ? compareResult : -compareResult;
      });

      return result;
    },

    /**
     * Load win statistics by game
     */
    async loadWinStats() {
      Alpine.store('app').setLoading(true, 'Loading win statistics...');

      const response = await api.getWinStats();

      if (response.success && response.data) {
        // The actual data is nested in response.data.data
        const games = response.data.data || [];
        // Transform to match the expected format for display
        this.winners = games.map(game => ({
          gameId: game.gameId,
          gameName: game.gameName,
          totalPlays: game.totalGames,
          wins: {
            andrew: game.andrew || 0,
            trish: game.trish || 0,
            draw: game.draw || 0
          }
        }));
        console.log('Loaded win stats:', this.winners);
      } else {
        this.winners = []; // Ensure always an array
        Alpine.store('app').setError(response.error || 'Failed to load win stats');
      }

      Alpine.store('app').setLoading(false);
    },

    /**
     * Load overall player totals
     */
    async loadTotalStats() {
      Alpine.store('app').setLoading(true, 'Loading total statistics...');

      const response = await api.getTotalStats();

      if (response.success && response.data) {
        const statsData = response.data.data || {};
        const totalGames = statsData.totalGames || 0;
        const players = statsData.players || {};

        // Transform player data into array format
        this.totals = Object.entries(players).map(([player, wins]) => ({
          player,
          wins,
          plays: totalGames,
          winRate: totalGames > 0 ? wins / totalGames : 0
        }));
        console.log('Loaded total stats:', this.totals);
      } else {
        this.totals = []; // Ensure always an array
        Alpine.store('app').setError(response.error || 'Failed to load total stats');
      }

      Alpine.store('app').setLoading(false);
    },

  });

  // ===== COMPONENT DEFINITIONS =====

  /**
   * Games list component
   */
  Alpine.data('gamesList', () => ({
    init() {
      if (this.$store.games.list.length === 0) {
        this.$store.games.load();
      }
    }
  }));

  /**
   * Add game form component
   */
  Alpine.data('addGameForm', () => ({
    bggId: '',
    submitting: false,
    error: null,

    async submit() {
      this.error = null;

      if (!this.bggId || isNaN(parseInt(this.bggId))) {
        this.error = 'Valid BGG ID is required';
        return;
      }

      this.submitting = true;
      const success = await this.$store.games.add(parseInt(this.bggId));
      this.submitting = false;

      if (success) {
        this.bggId = '';
      }
    }
  }));

  /**
   * Record play form component
   */
  Alpine.data('recordPlayForm', () => ({
    gameId: '',
    date: new Date().toISOString().split('T')[0],
    winner: '',
    scores: '',
    notes: '',
    submitting: false,
    error: null,

    async submit() {
      this.error = null;

      if (!this.gameId) {
        this.error = 'Game is required';
        return;
      }

      if (!this.date) {
        this.error = 'Date is required';
        return;
      }

      if (!this.winner) {
        this.error = 'Winner is required';
        return;
      }

      this.submitting = true;

      const playData = {
        game_id: parseInt(this.gameId),
        date: this.date,
        winner: this.winner === 'Draw' ? undefined : this.winner,
        scores: this.scores || undefined,
        comment: this.notes || undefined
      };

      console.log('Submitting play data:', JSON.stringify(playData, null, 2));

      const success = await this.$store.plays.record(playData);
      this.submitting = false;

      if (success) {
        // Reset form
        this.gameId = '';
        this.date = new Date().toISOString().split('T')[0];
        this.winner = '';
        this.scores = '';
        this.notes = '';
      }
    }
  }));
});

// Load initial data when the page loads
window.addEventListener('load', () => {
  console.log('Eurogames app loaded');
});
