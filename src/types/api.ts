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

// M3: Shipyard types
export interface Shipyard {
  symbol: string;
  shipTypes: ShipType[];
  transactions?: ShipyardTransaction[];
  ships?: ShipyardShip[];
  modificationsFee: number;
}

export interface ShipType {
  type: string;
}

export interface ShipyardTransaction {
  waypointSymbol: string;
  shipSymbol: string;
  price: number;
  agentSymbol: string;
  timestamp: string;
}

export interface ShipyardShip {
  type: string;
  name: string;
  description: string;
  supply: 'SCARCE' | 'LIMITED' | 'MODERATE' | 'HIGH' | 'ABUNDANT';
  purchasePrice: number;
  frame: ShipFrame;
  reactor: ShipReactor;
  engine: ShipEngine;
  modules: ShipModule[];
  mounts: ShipMount[];
}

export interface ShipFrame {
  symbol: string;
  name: string;
  description: string;
  condition?: number;
  moduleSlots: number;
  mountingPoints: number;
  fuelCapacity: number;
  requirements: ShipRequirements;
}

export interface ShipReactor {
  symbol: string;
  name: string;
  description: string;
  condition?: number;
  powerOutput: number;
  requirements: ShipRequirements;
}

export interface ShipEngine {
  symbol: string;
  name: string;
  description: string;
  condition?: number;
  speed: number;
  requirements: ShipRequirements;
}

export interface ShipModule {
  symbol: string;
  capacity?: number;
  range?: number;
  name: string;
  description: string;
  requirements: ShipRequirements;
}

export interface ShipMount {
  symbol: string;
  name: string;
  description: string;
  strength?: number;
  deposits?: string[];
  requirements: ShipRequirements;
}

export interface ShipRequirements {
  power?: number;
  crew?: number;
  slots?: number;
}

// M4: Mining types
export interface Survey {
  signature: string;
  symbol: string;
  deposits: SurveyDeposit[];
  expiration: string;
  size: 'SMALL' | 'MODERATE' | 'LARGE';
}

export interface SurveyDeposit {
  symbol: string;
}

export interface Extraction {
  shipSymbol: string;
  yield: {
    symbol: string;
    units: number;
  };
}

// M5: Market types
export interface Market {
  symbol: string;
  exports: MarketTradeGood[];
  imports: MarketTradeGood[];
  exchange: MarketTradeGood[];
  transactions?: MarketTransaction[];
  tradeGoods?: MarketTradeGood[];
}

export interface MarketTradeGood {
  symbol: string;
  name: string;
  description: string;
  type?: 'EXPORT' | 'IMPORT' | 'EXCHANGE';
  tradeVolume?: number;
  supply?: 'SCARCE' | 'LIMITED' | 'MODERATE' | 'HIGH' | 'ABUNDANT';
  purchasePrice?: number;
  sellPrice?: number;
}

export interface MarketTransaction {
  waypointSymbol: string;
  shipSymbol: string;
  tradeSymbol: string;
  type: 'PURCHASE' | 'SELL';
  units: number;
  pricePerUnit: number;
  totalPrice: number;
  timestamp: string;
}

export interface TradeResult {
  waypointSymbol: string;
  tradeSymbol: string;
  type: 'PURCHASE' | 'SELL';
  units: number;
  pricePerUnit: number;
  totalPrice: number;
  timestamp: string;
}