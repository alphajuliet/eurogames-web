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
      } else if (view === 'plays' && Alpine.store('plays').list.length === 0) {
        Alpine.store('plays').load();
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

      const response = await api.getPlays({ limit: '50' });
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

      const response = await api.deletePlay(id);

      if (response.success) {
        await this.load(); // Reload list
        return true;
      } else {
        Alpine.store('app').setError(response.error || 'Failed to delete play');
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

  // ===== STATS STORE =====
  Alpine.store('stats', {
    winners: null,
    totals: null,
    lastPlayed: null,
    recent: null,

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
     * Load win statistics by game
     */
    async loadWinStats() {
      Alpine.store('app').setLoading(true, 'Loading win statistics...');

      const response = await api.getWinStats();

      if (response.success && response.data) {
        this.winners = response.data.stats || [];
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
        this.totals = response.data.totals || [];
        console.log('Loaded total stats:', this.totals);
      } else {
        this.totals = []; // Ensure always an array
        Alpine.store('app').setError(response.error || 'Failed to load total stats');
      }

      Alpine.store('app').setLoading(false);
    },

    /**
     * Load last played dates
     */
    async loadLastPlayed() {
      const response = await api.getLastPlayed();

      if (response.success && response.data) {
        this.lastPlayed = response.data.games || [];
        console.log('Loaded last played:', this.lastPlayed);
      } else {
        this.lastPlayed = []; // Ensure always an array
        Alpine.store('app').setError(response.error || 'Failed to load last played');
      }
    },

    /**
     * Load recent plays
     * @param {number} [limit]
     */
    async loadRecent(limit = 10) {
      const response = await api.getRecentPlays(limit);

      if (response.success && response.data) {
        this.recent = response.data.plays || [];
        console.log('Loaded recent plays:', this.recent);
      } else {
        this.recent = []; // Ensure always an array
        Alpine.store('app').setError(response.error || 'Failed to load recent plays');
      }
    }
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
    players: '',
    winner: '',
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

      if (!this.players) {
        this.error = 'Players are required';
        return;
      }

      const playersArray = this.players.split(',').map(p => p.trim()).filter(p => p);

      if (playersArray.length === 0) {
        this.error = 'At least one player is required';
        return;
      }

      this.submitting = true;

      const playData = {
        gameId: this.gameId,
        date: this.date,
        players: playersArray,
        winner: this.winner || undefined,
        notes: this.notes || undefined
      };

      const success = await this.$store.plays.record(playData);
      this.submitting = false;

      if (success) {
        // Reset form
        this.gameId = '';
        this.date = new Date().toISOString().split('T')[0];
        this.players = '';
        this.winner = '';
        this.notes = '';
      }
    }
  }));
});

// Load initial data when the page loads
window.addEventListener('load', () => {
  console.log('Eurogames app loaded');
});
