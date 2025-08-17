// SpaceTraders API Types based on OpenAPI spec
export interface Agent {
  accountId?: string;
  symbol: string;
  headquarters: string;
  credits: number;
  startingFaction: string;
  shipCount: number;
}

export interface Ship {
  symbol: string;
  registration: {
    name: string;
    factionSymbol: string;
    role: string;
  };
  nav: {
    systemSymbol: string;
    waypointSymbol: string;
    status: 'IN_TRANSIT' | 'IN_ORBIT' | 'DOCKED';
    flightMode: 'DRIFT' | 'STEALTH' | 'CRUISE' | 'BURN';
  };
  crew: {
    current: number;
    required: number;
    capacity: number;
    rotation: 'STRICT' | 'RELAXED';
    morale: number;
    wages: number;
  };
  cargo: {
    capacity: number;
    units: number;
    inventory: CargoItem[];
  };
  fuel: {
    current: number;
    capacity: number;
  };
  cooldown?: {
    shipSymbol: string;
    totalSeconds: number;
    remainingSeconds: number;
    expiration?: string;
  };
}

export interface CargoItem {
  symbol: string;
  name: string;
  description: string;
  units: number;
}

export interface Contract {
  id: string;
  factionSymbol: string;
  type: 'PROCUREMENT' | 'TRANSPORT' | 'SHUTTLE';
  accepted: boolean;
  fulfilled: boolean;
  expiration: string;
  terms: {
    deadline: string;
    payment: {
      onAccepted: number;
      onFulfilled: number;
    };
    deliver?: ContractDeliverGood[];
  };
}

export interface ContractDeliverGood {
  tradeSymbol: string;
  destinationSymbol: string;
  unitsRequired: number;
  unitsFulfilled: number;
}

export interface ApiResponse<T> {
  data: T;
  meta?: {
    total: number;
    page: number;
    limit: number;
  };
}

// Token management types
export interface TokenStore {
  accountToken?: string;
  agents: AgentTokenEntry[];
  currentAgentSymbol?: string;
}

export interface AgentTokenEntry {
  symbol: string;
  name: string;
  token: string;
}

export interface ApiError {
  error: {
    message: string;
    code: number;
    data?: any;
  };
}