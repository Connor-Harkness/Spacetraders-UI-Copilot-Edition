import { Agent, Ship, Contract, System, Waypoint, ApiResponse, ApiError, TokenStore, AgentTokenEntry, Shipyard, ShipyardShip, Survey, Extraction, Market, TradeResult } from '../types/api';
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
      body: JSON.stringify({}),
    });
    
    // Return updated ship data by refetching
    return this.getShip(shipSymbol);
  }

  public async orbitShip(shipSymbol: string): Promise<Ship> {
    const response = await this.request<ApiResponse<{ nav: Ship['nav'] }>>(`/my/ships/${shipSymbol}/orbit`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    
    return this.getShip(shipSymbol);
  }

  public async refuelShip(shipSymbol: string): Promise<Ship> {
    const response = await this.request<ApiResponse<any>>(`/my/ships/${shipSymbol}/refuel`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    
    return this.getShip(shipSymbol);
  }

  // Contract actions
  public async acceptContract(contractId: string): Promise<Contract> {
    const response = await this.request<ApiResponse<{ contract: Contract }>>(`/my/contracts/${contractId}/accept`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    return response.data.contract;
  }

  // Ship navigation
  public async navigateShip(shipSymbol: string, waypointSymbol: string): Promise<Ship> {
    const response = await this.request<ApiResponse<{ nav: Ship['nav'], fuel: Ship['fuel'] }>>(`/my/ships/${shipSymbol}/navigate`, {
      method: 'POST',
      body: JSON.stringify({ waypointSymbol }),
    });
    
    return this.getShip(shipSymbol);
  }

  // Systems and waypoints
  public async getSystems(page: number = 1, limit: number = 20): Promise<{ data: System[], meta: { total: number; page: number; limit: number } }> {
    const response = await this.request<ApiResponse<System[]>>(`/systems?page=${page}&limit=${limit}`);
    return {
      data: response.data,
      meta: response.meta || { total: 0, page, limit }
    };
  }

  public async getSystem(systemSymbol: string): Promise<System> {
    const response = await this.request<ApiResponse<System>>(`/systems/${systemSymbol}`);
    return response.data;
  }

  public async getWaypoints(systemSymbol: string, page: number = 1, limit: number = 20): Promise<{ data: Waypoint[], meta: { total: number; page: number; limit: number } }> {
    const response = await this.request<ApiResponse<Waypoint[]>>(`/systems/${systemSymbol}/waypoints?page=${page}&limit=${limit}`);
    return {
      data: response.data,
      meta: response.meta || { total: 0, page, limit }
    };
  }

  public async getWaypoint(systemSymbol: string, waypointSymbol: string): Promise<Waypoint> {
    const response = await this.request<ApiResponse<Waypoint>>(`/systems/${systemSymbol}/waypoints/${waypointSymbol}`);
    return response.data;
  }

  // M3: Shipyard endpoints
  public async getShipyard(systemSymbol: string, waypointSymbol: string): Promise<Shipyard> {
    const response = await this.request<ApiResponse<Shipyard>>(`/systems/${systemSymbol}/waypoints/${waypointSymbol}/shipyard`);
    return response.data;
  }

  public async purchaseShip(shipType: string, waypointSymbol: string): Promise<{ ship: Ship; transaction: any }> {
    const response = await this.request<ApiResponse<{ ship: Ship; transaction: any }>>('/my/ships', {
      method: 'POST',
      body: JSON.stringify({ shipType, waypointSymbol }),
    });
    return response.data;
  }

  // M4: Mining endpoints
  public async extractResources(shipSymbol: string, survey?: Survey): Promise<{ extraction: Extraction; cooldown: Ship['cooldown']; cargo: Ship['cargo'] }> {
    const body = survey ? { survey } : {};
    const response = await this.request<ApiResponse<{ extraction: Extraction; cooldown: Ship['cooldown']; cargo: Ship['cargo'] }>>(`/my/ships/${shipSymbol}/extract`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return response.data;
  }

  public async createSurvey(shipSymbol: string): Promise<{ surveys: Survey[]; cooldown: Ship['cooldown'] }> {
    const response = await this.request<ApiResponse<{ surveys: Survey[]; cooldown: Ship['cooldown'] }>>(`/my/ships/${shipSymbol}/survey`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    return response.data;
  }

  public async jettison(shipSymbol: string, symbol: string, units: number): Promise<{ cargo: Ship['cargo'] }> {
    const response = await this.request<ApiResponse<{ cargo: Ship['cargo'] }>>(`/my/ships/${shipSymbol}/jettison`, {
      method: 'POST',
      body: JSON.stringify({ symbol, units }),
    });
    return response.data;
  }

  // M5: Market endpoints
  public async getMarket(systemSymbol: string, waypointSymbol: string): Promise<Market> {
    const response = await this.request<ApiResponse<Market>>(`/systems/${systemSymbol}/waypoints/${waypointSymbol}/market`);
    return response.data;
  }

  public async sellCargo(shipSymbol: string, symbol: string, units: number): Promise<{ transaction: TradeResult; cargo: Ship['cargo']; agent: Agent }> {
    const response = await this.request<ApiResponse<{ transaction: TradeResult; cargo: Ship['cargo']; agent: Agent }>>(`/my/ships/${shipSymbol}/sell`, {
      method: 'POST',
      body: JSON.stringify({ symbol, units }),
    });
    return response.data;
  }

  public async purchaseCargo(shipSymbol: string, symbol: string, units: number): Promise<{ transaction: TradeResult; cargo: Ship['cargo']; agent: Agent }> {
    const response = await this.request<ApiResponse<{ transaction: TradeResult; cargo: Ship['cargo']; agent: Agent }>>(`/my/ships/${shipSymbol}/purchase`, {
      method: 'POST',
      body: JSON.stringify({ symbol, units }),
    });
    return response.data;
  }
}

// Export singleton instance
export const spaceTraders = new SpaceTradersAPI();