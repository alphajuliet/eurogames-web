/**
 * API Service - Handles communication with Eurogames backend API
 */
import type {
	Game,
	GamesListResponse,
	GameDetailsResponse,
	PlayRecord,
	PlaysListResponse,
	WinStatsResponse,
	TotalStatsResponse,
	LastPlayedResponse,
	RecentPlaysResponse,
	PlayerStats,
	GameStatsResponse,
	ExportData,
	QueryResponse,
} from './types';

export interface ApiOptions {
	baseUrl: string;
	timeout?: number;
	apiKey?: string;
	bearerToken?: string;
}

export interface ApiResponse<T = unknown> {
	success: boolean;
	data: T | undefined;
	error: string | undefined;
	status: number;
}

export class ApiClient {
	private baseUrl: string;
	private timeout: number;
	private defaultHeaders: Record<string, string>;

	constructor(options: ApiOptions) {
		this.baseUrl = options.baseUrl;
		this.timeout = options.timeout || 30000;
		this.defaultHeaders = {
			'Content-Type': 'application/json',
		};

		if (options.apiKey) {
			this.defaultHeaders['X-API-Key'] = options.apiKey;
		}
		if (options.bearerToken) {
			this.defaultHeaders['Authorization'] = `Bearer ${options.bearerToken}`;
		}
	}

	/**
	 * Make a GET request to the backend API
	 */
	async get<T = unknown>(endpoint: string, query?: Record<string, string>): Promise<ApiResponse<T>> {
		const url = new URL(endpoint, this.baseUrl);
		if (query) {
			Object.entries(query).forEach(([key, value]) => {
				url.searchParams.append(key, value);
			});
		}

		return this.request<T>('GET', url.toString());
	}

	/**
	 * Make a POST request to the backend API
	 */
	async post<T = unknown>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
		const url = new URL(endpoint, this.baseUrl);
		return this.request<T>('POST', url.toString(), body);
	}

	/**
	 * Make a PUT request to the backend API
	 */
	async put<T = unknown>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
		const url = new URL(endpoint, this.baseUrl);
		return this.request<T>('PUT', url.toString(), body);
	}

	/**
	 * Make a DELETE request to the backend API
	 */
	async delete<T = unknown>(endpoint: string): Promise<ApiResponse<T>> {
		const url = new URL(endpoint, this.baseUrl);
		return this.request<T>('DELETE', url.toString());
	}

	/**
	 * Core request method
	 */
	private async request<T = unknown>(
		method: string,
		url: string,
		body?: unknown
	): Promise<ApiResponse<T>> {
		try {
			const fetchOptions: RequestInit = {
				method,
				headers: this.defaultHeaders,
				signal: AbortSignal.timeout(this.timeout),
			};

			if (body) {
				fetchOptions.body = JSON.stringify(body);
			}

			const response = await fetch(url, fetchOptions);
			const data = (await response.json()) as T;

			return {
				success: response.ok,
				status: response.status,
				data: response.ok ? data : undefined,
				error: !response.ok ? `HTTP ${response.status}` : undefined,
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			return {
				success: false,
				status: 0,
				data: undefined,
				error: errorMessage,
			};
		}
	}

	/**
	 * Set a bearer token for authorization
	 */
	setBearerToken(token: string): void {
		this.defaultHeaders['Authorization'] = `Bearer ${token}`;
	}

	/**
	 * Set an API key for authorization
	 */
	setApiKey(key: string): void {
		this.defaultHeaders['X-API-Key'] = key;
	}

	/**
	 * Clear authorization headers
	 */
	clearAuth(): void {
		delete this.defaultHeaders['Authorization'];
		delete this.defaultHeaders['X-API-Key'];
	}

	// ==================== GAMES ====================

	/**
	 * List games with optional filtering
	 */
	async listGames(filter?: Record<string, string>): Promise<ApiResponse<GamesListResponse>> {
		return this.get<GamesListResponse>('/v1/games', filter);
	}

	/**
	 * Get game details
	 */
	async getGame(id: string): Promise<ApiResponse<GameDetailsResponse>> {
		return this.get<GameDetailsResponse>(`/v1/games/${id}`);
	}

	/**
	 * Add new game from BoardGameGeek
	 */
	async addGame(bggId: number): Promise<ApiResponse<Game>> {
		return this.post<Game>('/v1/games', { bggId });
	}

	/**
	 * Update game notes
	 */
	async updateGameNotes(id: string, notes: string): Promise<ApiResponse<Game>> {
		return this.patch<Game>(`/v1/games/${id}/notes`, { notes });
	}

	/**
	 * Update game BGG data
	 */
	async updateGameData(id: string, data: Record<string, unknown>): Promise<ApiResponse<Game>> {
		return this.patch<Game>(`/v1/games/${id}/data`, { data });
	}

	/**
	 * Sync game data from BoardGameGeek
	 */
	async syncGameData(id: string): Promise<ApiResponse<Game>> {
		return this.put<Game>(`/v1/games/${id}/sync`, {});
	}

	/**
	 * Get game play history
	 */
	async getGameHistory(id: string): Promise<ApiResponse<PlayRecord[]>> {
		return this.get<PlayRecord[]>(`/v1/games/${id}/history`);
	}

	// ==================== PLAYS ====================

	/**
	 * List game plays with filtering
	 */
	async listPlays(filter?: Record<string, string>): Promise<ApiResponse<PlaysListResponse>> {
		return this.get<PlaysListResponse>('/v1/plays', filter);
	}

	/**
	 * Record new game result
	 */
	async recordPlay(play: Omit<PlayRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<PlayRecord>> {
		return this.post<PlayRecord>('/v1/plays', play);
	}

	/**
	 * Get specific play record
	 */
	async getPlay(id: string): Promise<ApiResponse<PlayRecord>> {
		return this.get<PlayRecord>(`/v1/plays/${id}`);
	}

	/**
	 * Update play record
	 */
	async updatePlay(
		id: string,
		updates: Partial<Omit<PlayRecord, 'id' | 'createdAt' | 'updatedAt'>>
	): Promise<ApiResponse<PlayRecord>> {
		return this.put<PlayRecord>(`/v1/plays/${id}`, updates);
	}

	/**
	 * Delete play record
	 */
	async deletePlay(id: string): Promise<ApiResponse<void>> {
		return this.delete<void>(`/v1/plays/${id}`);
	}

	// ==================== STATISTICS ====================

	/**
	 * Get win statistics by game
	 */
	async getWinStats(): Promise<ApiResponse<WinStatsResponse>> {
		return this.get<WinStatsResponse>('/v1/stats/winners');
	}

	/**
	 * Get overall win totals
	 */
	async getTotalStats(): Promise<ApiResponse<TotalStatsResponse>> {
		return this.get<TotalStatsResponse>('/v1/stats/totals');
	}

	/**
	 * Get last played dates
	 */
	async getLastPlayed(): Promise<ApiResponse<LastPlayedResponse>> {
		return this.get<LastPlayedResponse>('/v1/stats/last-played');
	}

	/**
	 * Get recent game plays
	 */
	async getRecentPlays(limit?: number): Promise<ApiResponse<RecentPlaysResponse>> {
		const filter = limit ? { limit: limit.toString() } : undefined;
		return this.get<RecentPlaysResponse>('/v1/stats/recent', filter);
	}

	/**
	 * Get player-specific statistics
	 */
	async getPlayerStats(player: string): Promise<ApiResponse<PlayerStats>> {
		return this.get<PlayerStats>(`/v1/stats/players/${encodeURIComponent(player)}`);
	}

	/**
	 * Get game collection statistics
	 */
	async getGameStats(): Promise<ApiResponse<GameStatsResponse>> {
		return this.get<GameStatsResponse>('/v1/stats/games');
	}

	// ==================== UTILITIES ====================

	/**
	 * Export all data as JSON
	 */
	async exportData(): Promise<ApiResponse<ExportData>> {
		return this.get<ExportData>('/v1/export');
	}

	/**
	 * Execute custom SELECT query
	 */
	async query(sql: string): Promise<ApiResponse<QueryResponse>> {
		return this.post<QueryResponse>('/v1/query', { sql });
	}

	// ==================== HELPER METHODS ====================

	/**
	 * Make a PATCH request
	 */
	private async patch<T = unknown>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
		const url = new URL(endpoint, this.baseUrl);
		return this.request<T>('PATCH', url.toString(), body);
	}
}
