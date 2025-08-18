import { Ship, Contract, Survey, Market, Waypoint, TradeResult } from '../types/api';
import { spaceTraders } from './api';

export interface AutomationPolicy {
  mining: {
    autoSellWhenFull: boolean;
    minFuelPercent: number;
    maxCredits: number;
    preferredMarkets: string[];
    stopConditions: {
      maxCargo: boolean;
      lowFuel: boolean;
      creditLimit: boolean;
    };
  };
  trading: {
    maxBuyPriceDeviation: number;
    minProfitMargin: number;
    reserveCredits: number;
    maxDistance: number;
  };
  contract: {
    autoAccept: boolean;
    priorityTypes: string[];
    maxDeadlineDays: number;
    minReward: number;
  };
}

export interface AutomationState {
  shipSymbol: string;
  behavior: 'mining' | 'trading' | 'contract' | 'idle';
  status: 'running' | 'paused' | 'stopped' | 'error';
  currentTask: string;
  progress: number;
  lastAction: Date;
  errorMessage?: string;
  policy: AutomationPolicy;
}

export interface ActionStep {
  type: 'navigate' | 'dock' | 'orbit' | 'refuel' | 'extract' | 'survey' | 'sell' | 'buy' | 'deliver';
  target?: string;
  payload?: any;
  retries: number;
  maxRetries: number;
}

export class AutomationOrchestrator {
  private automationStates: Map<string, AutomationState> = new Map();
  private actionQueues: Map<string, ActionStep[]> = new Map();
  private isRunning: boolean = false;
  private tickInterval: number = 5000; // 5 seconds
  private intervalId?: ReturnType<typeof setInterval>;

  constructor() {
    this.loadStates();
  }

  private loadStates() {
    try {
      const stored = localStorage.getItem('spacetraders_automation_states');
      if (stored) {
        const states = JSON.parse(stored);
        this.automationStates = new Map(states.map((s: AutomationState) => [s.shipSymbol, s]));
      }
    } catch (error) {
      console.error('Failed to load automation states:', error);
    }
  }

  private saveStates() {
    try {
      const states = Array.from(this.automationStates.values());
      localStorage.setItem('spacetraders_automation_states', JSON.stringify(states));
    } catch (error) {
      console.error('Failed to save automation states:', error);
    }
  }

  public startAutomation(shipSymbol: string, behavior: AutomationState['behavior'], policy?: Partial<AutomationPolicy>) {
    const defaultPolicy: AutomationPolicy = {
      mining: {
        autoSellWhenFull: true,
        minFuelPercent: 10,
        maxCredits: 1000000,
        preferredMarkets: [],
        stopConditions: {
          maxCargo: true,
          lowFuel: true,
          creditLimit: false
        }
      },
      trading: {
        maxBuyPriceDeviation: 10,
        minProfitMargin: 15,
        reserveCredits: 100000,
        maxDistance: 50
      },
      contract: {
        autoAccept: false,
        priorityTypes: ['PROCUREMENT', 'TRANSPORT'],
        maxDeadlineDays: 30,
        minReward: 50000
      }
    };

    const state: AutomationState = {
      shipSymbol,
      behavior,
      status: 'running',
      currentTask: 'Initializing automation',
      progress: 0,
      lastAction: new Date(),
      policy: { ...defaultPolicy, ...policy }
    };

    this.automationStates.set(shipSymbol, state);
    this.actionQueues.set(shipSymbol, []);
    this.saveStates();

    if (!this.isRunning) {
      this.start();
    }
  }

  public stopAutomation(shipSymbol: string) {
    const state = this.automationStates.get(shipSymbol);
    if (state) {
      state.status = 'stopped';
      state.currentTask = 'Stopped';
      this.saveStates();
    }
  }

  public pauseAutomation(shipSymbol: string) {
    const state = this.automationStates.get(shipSymbol);
    if (state) {
      state.status = 'paused';
      state.currentTask = 'Paused';
      this.saveStates();
    }
  }

  public resumeAutomation(shipSymbol: string) {
    const state = this.automationStates.get(shipSymbol);
    if (state && state.status === 'paused') {
      state.status = 'running';
      state.currentTask = 'Resuming';
      this.saveStates();
    }
  }

  public getAutomationState(shipSymbol: string): AutomationState | undefined {
    return this.automationStates.get(shipSymbol);
  }

  public getAllAutomationStates(): AutomationState[] {
    return Array.from(this.automationStates.values());
  }

  public start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.intervalId = setInterval(() => this.tick(), this.tickInterval);
    console.log('Automation orchestrator started');
  }

  public stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    console.log('Automation orchestrator stopped');
  }

  private async tick() {
    const activeAutomations = Array.from(this.automationStates.values())
      .filter(state => state.status === 'running');

    for (const state of activeAutomations) {
      try {
        await this.processShipAutomation(state);
      } catch (error) {
        console.error(`Automation error for ${state.shipSymbol}:`, error);
        state.status = 'error';
        state.errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.saveStates();
      }
    }
  }

  private async processShipAutomation(state: AutomationState) {
    const ship = await spaceTraders.getShip(state.shipSymbol);
    const queue = this.actionQueues.get(state.shipSymbol) || [];

    // Check if ship has active cooldown
    if (ship.cooldown && ship.cooldown.remainingSeconds > 0) {
      state.currentTask = `Waiting for cooldown (${ship.cooldown.remainingSeconds}s)`;
      this.saveStates();
      return;
    }

    // Process current action queue
    if (queue.length > 0) {
      const action = queue[0];
      const success = await this.executeAction(ship, action);
      
      if (success) {
        queue.shift(); // Remove completed action
        state.lastAction = new Date();
      } else {
        action.retries++;
        if (action.retries >= action.maxRetries) {
          queue.shift(); // Remove failed action
          state.errorMessage = `Action ${action.type} failed after ${action.maxRetries} retries`;
        }
      }
    }

    // Plan next actions based on behavior
    if (queue.length === 0) {
      await this.planNextActions(ship, state);
    }

    this.saveStates();
  }

  private async executeAction(ship: Ship, action: ActionStep): Promise<boolean> {
    try {
      switch (action.type) {
        case 'navigate':
          if (action.target) {
            await spaceTraders.navigateShip(ship.symbol, action.target);
            return true;
          }
          return false;

        case 'dock':
          if (ship.nav.status !== 'DOCKED') {
            await spaceTraders.dockShip(ship.symbol);
            return true;
          }
          return true;

        case 'orbit':
          if (ship.nav.status !== 'IN_ORBIT') {
            await spaceTraders.orbitShip(ship.symbol);
            return true;
          }
          return true;

        case 'refuel':
          if (ship.nav.status === 'DOCKED') {
            await spaceTraders.refuelShip(ship.symbol);
            return true;
          }
          return false;

        case 'extract':
          if (ship.nav.status === 'IN_ORBIT') {
            await spaceTraders.extractResources(ship.symbol);
            return true;
          }
          return false;

        case 'survey':
          if (ship.nav.status === 'IN_ORBIT') {
            await spaceTraders.createSurvey(ship.symbol);
            return true;
          }
          return false;

        case 'sell':
          if (ship.nav.status === 'DOCKED' && ship.cargo.units > 0) {
            // Sell all cargo items
            for (const item of ship.cargo.inventory) {
              await spaceTraders.sellCargo(ship.symbol, item.symbol, item.units);
            }
            return true;
          }
          return false;

        default:
          console.warn(`Unknown action type: ${action.type}`);
          return false;
      }
    } catch (error) {
      console.error(`Action ${action.type} failed:`, error);
      return false;
    }
  }

  private async planNextActions(ship: Ship, state: AutomationState) {
    const queue = this.actionQueues.get(state.shipSymbol) || [];

    switch (state.behavior) {
      case 'mining':
        await this.planMiningActions(ship, state, queue);
        break;
      case 'trading':
        await this.planTradingActions(ship, state, queue);
        break;
      case 'contract':
        await this.planContractActions(ship, state, queue);
        break;
    }

    this.actionQueues.set(state.shipSymbol, queue);
  }

  private async planMiningActions(ship: Ship, state: AutomationState, queue: ActionStep[]) {
    const policy = state.policy.mining;
    
    // Check stop conditions
    if (policy.stopConditions.maxCargo && ship.cargo.units >= ship.cargo.capacity * 0.9) {
      if (policy.autoSellWhenFull) {
        state.currentTask = 'Cargo full, finding market to sell';
        // Find nearest market and sell
        await this.planSellActions(ship, state, queue);
        return;
      } else {
        state.status = 'paused';
        state.currentTask = 'Cargo full, automation paused';
        return;
      }
    }

    if (policy.stopConditions.lowFuel && (ship.fuel.current / ship.fuel.capacity * 100) < policy.minFuelPercent) {
      state.currentTask = 'Low fuel, need to refuel';
      queue.push({ type: 'dock', retries: 0, maxRetries: 3 });
      queue.push({ type: 'refuel', retries: 0, maxRetries: 3 });
      queue.push({ type: 'orbit', retries: 0, maxRetries: 3 });
      return;
    }

    // Check if at mining location
    const currentWaypoint = ship.nav.waypointSymbol;
    const isAtAsteroid = currentWaypoint.includes('ASTEROID') || 
                        currentWaypoint.includes('ENGINEERED_ASTEROID');

    if (!isAtAsteroid) {
      // Find nearest asteroid field
      state.currentTask = 'Navigating to mining location';
      // For MVP, just assume we know of an asteroid field
      const asteroidSymbol = `${ship.nav.systemSymbol}-ASTEROID-1`;
      queue.push({ type: 'navigate', target: asteroidSymbol, retries: 0, maxRetries: 3 });
      queue.push({ type: 'orbit', retries: 0, maxRetries: 3 });
      return;
    }

    // Ensure in orbit for mining
    if (ship.nav.status !== 'IN_ORBIT') {
      queue.push({ type: 'orbit', retries: 0, maxRetries: 3 });
    }

    // Mining actions
    state.currentTask = 'Mining resources';
    state.progress = (ship.cargo.units / ship.cargo.capacity) * 100;

    // Survey if capable, then extract
    if (ship.mounts.some(mount => mount.symbol.includes('SURVEYOR'))) {
      queue.push({ type: 'survey', retries: 0, maxRetries: 2 });
    }
    queue.push({ type: 'extract', retries: 0, maxRetries: 3 });
  }

  private async planTradingActions(ship: Ship, state: AutomationState, queue: ActionStep[]) {
    // Basic trading logic - find profitable trade routes
    state.currentTask = 'Analyzing trade opportunities';
    
    // For MVP, just implement basic sell behavior
    if (ship.cargo.units > 0) {
      await this.planSellActions(ship, state, queue);
    } else {
      state.currentTask = 'No cargo to trade';
      state.status = 'paused';
    }
  }

  private async planContractActions(ship: Ship, state: AutomationState, queue: ActionStep[]) {
    // Contract fulfillment logic
    state.currentTask = 'Checking active contracts';
    
    try {
      const contracts = await spaceTraders.getContracts();
      const activeContract = contracts.find((c: any) => c.accepted && !c.fulfilled);
      
      if (!activeContract) {
        state.currentTask = 'No active contracts';
        state.status = 'paused';
        return;
      }

      // Plan actions to fulfill contract
      state.currentTask = `Working on contract: ${activeContract.type}`;
      
      for (const deliverable of activeContract.terms.deliver || []) {
        const needed = deliverable.unitsRequired - deliverable.unitsFulfilled;
        if (needed > 0) {
          // Check if we have the required goods in cargo
          const cargoItem = ship.cargo.inventory.find(item => item.symbol === deliverable.tradeSymbol);
          const availableUnits = cargoItem?.units || 0;
          
          if (availableUnits > 0) {
            // Navigate to delivery location and deliver
            queue.push({ type: 'navigate', target: deliverable.destinationSymbol, retries: 0, maxRetries: 3 });
            queue.push({ type: 'dock', retries: 0, maxRetries: 3 });
            queue.push({ type: 'deliver', payload: { contractId: activeContract.id, tradeSymbol: deliverable.tradeSymbol, units: Math.min(needed, availableUnits), destinationSymbol: deliverable.destinationSymbol }, retries: 0, maxRetries: 3 });
          } else {
            // Need to acquire the goods - either mine or buy
            state.currentTask = `Need to acquire ${deliverable.tradeSymbol} for contract`;
            // For MVP, pause and require manual intervention
            state.status = 'paused';
          }
        }
      }
    } catch (error) {
      console.error('Contract planning failed:', error);
      state.status = 'error';
      state.errorMessage = 'Failed to plan contract actions';
    }
  }

  private async planSellActions(ship: Ship, state: AutomationState, queue: ActionStep[]) {
    if (ship.cargo.units === 0) return;

    // Find best market to sell cargo
    // For MVP, just go to any nearby market
    const systemSymbol = ship.nav.systemSymbol;
    const marketSymbol = `${systemSymbol}-MARKETPLACE-1`; // Assume there's a marketplace
    
    state.currentTask = 'Navigating to market to sell cargo';
    queue.push({ type: 'navigate', target: marketSymbol, retries: 0, maxRetries: 3 });
    queue.push({ type: 'dock', retries: 0, maxRetries: 3 });
    queue.push({ type: 'sell', retries: 0, maxRetries: 3 });
  }
}

// Export singleton instance
export const automationOrchestrator = new AutomationOrchestrator();