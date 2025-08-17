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

export interface System {
  symbol: string;
  sectorSymbol: string;
  type: string;
  x: number;
  y: number;
  waypoints: WaypointInfo[];
  factions: { symbol: string }[];
}

export interface WaypointInfo {
  symbol: string;
  type: string;
  x: number;
  y: number;
}

export interface Waypoint {
  symbol: string;
  type: 'PLANET' | 'GAS_GIANT' | 'MOON' | 'ORBITAL_STATION' | 'JUMP_GATE' | 'ASTEROID_FIELD' | 'ASTEROID' | 'ENGINEERED_ASTEROID' | 'ASTEROID_BASE' | 'NEBULA' | 'DEBRIS_FIELD' | 'GRAVITY_WELL' | 'ARTIFICIAL_GRAVITY_WELL' | 'FUEL_STATION';
  systemSymbol: string;
  x: number;
  y: number;
  orbitals: WaypointInfo[];
  traits: WaypointTrait[];
  modifiers?: WaypointModifier[];
  chart?: {
    waypointSymbol: string;
    submittedBy: string;
    submittedOn: string;
  };
  faction?: {
    symbol: string;
  };
}

export interface WaypointTrait {
  symbol: string;
  name: string;
  description: string;
}

export interface WaypointModifier {
  symbol: string;
  name: string;
  description: string;
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