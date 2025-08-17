import { Agent, Ship, Contract, ApiResponse, ApiError, TokenStore, AgentTokenEntry } from '../types/api';
import { Storage, RateLimiter } from '../utils';

const API_BASE_URL = 'https://api.spacetraders.io/v2';
const TOKENS_STORAGE_KEY = 'spacetraders_tokens';

export class SpaceTradersAPI {
  private rateLimiter = new RateLimiter();
  private tokenStore: TokenStore = { agents: [] };

  constructor() {
    this.loadTokens();
  }

  // Token management
  private async loadTokens(): Promise<void> {
    try {
      const stored = await Storage.getItem(TOKENS_STORAGE_KEY);
      if (stored) {
        this.tokenStore = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load tokens:', error);
    }
  }

  private async saveTokens(): Promise<void> {
    try {
      await Storage.setItem(TOKENS_STORAGE_KEY, JSON.stringify(this.tokenStore));
    } catch (error) {
      console.error('Failed to save tokens:', error);
    }
  }

  public async setAccountToken(token: string): Promise<void> {
    this.tokenStore.accountToken = token;
    await this.saveTokens();
  }

  public async addAgentToken(agent: AgentTokenEntry): Promise<void> {
    const existingIndex = this.tokenStore.agents.findIndex(a => a.symbol === agent.symbol);
    if (existingIndex >= 0) {
      this.tokenStore.agents[existingIndex] = agent;
    } else {
      this.tokenStore.agents.push(agent);
    }
    await this.saveTokens();
  }

  public async setCurrentAgent(symbol: string): Promise<void> {
    this.tokenStore.currentAgentSymbol = symbol;
    await this.saveTokens();
  }

  public getCurrentAgentToken(): string | null {
    if (!this.tokenStore.currentAgentSymbol) return null;
    const agent = this.tokenStore.agents.find(a => a.symbol === this.tokenStore.currentAgentSymbol);
    return agent?.token || null;
  }

  public getTokenStore(): TokenStore {
    return this.tokenStore;
  }

  // HTTP request wrapper with rate limiting and auth
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    useAgentToken: boolean = true
  ): Promise<T> {
    await this.rateLimiter.waitForSlot();

    const headers = new Headers({
      'Content-Type': 'application/json',
      ...options.headers,
    });

    // Add appropriate authorization header
    if (useAgentToken) {
      const agentToken = this.getCurrentAgentToken();
      if (agentToken) {
        headers.set('Authorization', `Bearer ${agentToken}`);
      }
    } else if (this.tokenStore.accountToken) {
      headers.set('Authorization', `Bearer ${this.tokenStore.accountToken}`);
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Agent endpoints
  public async getAgent(): Promise<Agent> {
    const response = await this.request<ApiResponse<Agent>>('/my/agent');
    return response.data;
  }

  public async registerAgent(symbol: string, faction: string): Promise<{
    agent: Agent;
    token: string;
    contract: Contract;
    ships: Ship[];
  }> {
    const response = await this.request<ApiResponse<any>>('/register', {
      method: 'POST',
      body: JSON.stringify({ symbol, faction }),
    }, false); // Use account token for registration

    return response.data;
  }

  // Ships endpoints
  public async getShips(): Promise<Ship[]> {
    const response = await this.request<ApiResponse<Ship[]>>('/my/ships');
    return response.data;
  }

  public async getShip(shipSymbol: string): Promise<Ship> {
    const response = await this.request<ApiResponse<Ship>>(`/my/ships/${shipSymbol}`);
    return response.data;
  }

  // Contracts endpoints
  public async getContracts(): Promise<Contract[]> {
    const response = await this.request<ApiResponse<Contract[]>>('/my/contracts');
    return response.data;
  }

  // Basic ship actions
  public async dockShip(shipSymbol: string): Promise<Ship> {
    const response = await this.request<ApiResponse<{ nav: Ship['nav'] }>>(`/my/ships/${shipSymbol}/dock`, {
      method: 'POST',
    });
    
    // Return updated ship data by refetching
    return this.getShip(shipSymbol);
  }

  public async orbitShip(shipSymbol: string): Promise<Ship> {
    const response = await this.request<ApiResponse<{ nav: Ship['nav'] }>>(`/my/ships/${shipSymbol}/orbit`, {
      method: 'POST',
    });
    
    return this.getShip(shipSymbol);
  }

  public async refuelShip(shipSymbol: string): Promise<Ship> {
    const response = await this.request<ApiResponse<any>>(`/my/ships/${shipSymbol}/refuel`, {
      method: 'POST',
    });
    
    return this.getShip(shipSymbol);
  }
}

// Export singleton instance
export const spaceTraders = new SpaceTradersAPI();