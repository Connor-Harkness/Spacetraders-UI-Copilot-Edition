import React, { useState, useEffect } from 'react';
import { useTokens } from '../context/TokenContext';
import { spaceTraders } from '../services/api';
import { automationOrchestrator } from '../services/automation';
import { Ship, Contract, Waypoint, System } from '../types/api';

interface MissionStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  action?: () => Promise<void>;
  validation?: () => Promise<boolean>;
}

interface Mission {
  id: string;
  title: string;
  description: string;
  type: 'contract' | 'mining' | 'exploration' | 'trading';
  steps: MissionStep[];
  reward?: {
    credits: number;
    experience?: number;
  };
  estimatedTime?: number; // in minutes
}

export default function MissionWizard() {
  const { hasAgentToken } = useTokens();
  const [ships, setShips] = useState<Ship[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [currentMission, setCurrentMission] = useState<Mission | null>(null);
  const [selectedShip, setSelectedShip] = useState<Ship | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (hasAgentToken) {
      loadData();
      generateAvailableMissions();
    }
  }, [hasAgentToken]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [shipsData, contractsData] = await Promise.all([
        spaceTraders.getMyShips(),
        spaceTraders.getMyContracts()
      ]);
      
      setShips(shipsData);
      setContracts(contractsData);
    } catch (err) {
      console.error('Mission wizard data load error:', err);
      setError('Failed to load mission data');
    } finally {
      setLoading(false);
    }
  };

  const generateAvailableMissions = () => {
    const availableMissions: Mission[] = [
      // Basic Mining Mission
      {
        id: 'basic-mining',
        title: 'Basic Mining Operations',
        description: 'Learn the fundamentals of asteroid mining and resource extraction',
        type: 'mining',
        estimatedTime: 15,
        reward: { credits: 25000 },
        steps: [
          {
            id: 'select-ship',
            title: 'Select Mining Ship',
            description: 'Choose a ship with mining capabilities',
            status: 'pending',
            validation: async () => {
              return selectedShip?.mounts.some(mount => 
                mount.symbol.includes('MINING_LASER') || 
                mount.symbol.includes('SURVEYOR')
              ) || false;
            }
          },
          {
            id: 'navigate-asteroid',
            title: 'Navigate to Asteroid Field',
            description: 'Travel to the nearest asteroid field',
            status: 'pending',
            action: async () => {
              if (!selectedShip) throw new Error('No ship selected');
              // Find nearest asteroid field
              const systemSymbol = selectedShip.nav.systemSymbol;
              const waypoints = await spaceTraders.getWaypoints(systemSymbol);
              const asteroidField = waypoints.data.find(wp => 
                wp.type === 'ASTEROID_FIELD' || wp.symbol.includes('ASTEROID')
              );
              
              if (!asteroidField) throw new Error('No asteroid field found');
              
              await spaceTraders.navigateShip(selectedShip.symbol, asteroidField.symbol);
            }
          },
          {
            id: 'orbit-extract',
            title: 'Orbit and Extract',
            description: 'Orbit the asteroid and extract resources',
            status: 'pending',
            action: async () => {
              if (!selectedShip) throw new Error('No ship selected');
              
              await spaceTraders.orbitShip(selectedShip.symbol);
              await spaceTraders.extractResources(selectedShip.symbol);
            }
          },
          {
            id: 'sell-cargo',
            title: 'Sell Extracted Resources',
            description: 'Find a market and sell your mined resources',
            status: 'pending',
            action: async () => {
              if (!selectedShip) throw new Error('No ship selected');
              
              // Find nearest marketplace
              const systemSymbol = selectedShip.nav.systemSymbol;
              const waypoints = await spaceTraders.getWaypoints(systemSymbol);
              const marketplace = waypoints.data.find(wp => 
                wp.traits.some(trait => trait.symbol === 'MARKETPLACE')
              );
              
              if (!marketplace) throw new Error('No marketplace found');
              
              await spaceTraders.navigateShip(selectedShip.symbol, marketplace.symbol);
              await spaceTraders.dockShip(selectedShip.symbol);
              
              // Sell all cargo
              const ship = await spaceTraders.getShip(selectedShip.symbol);
              for (const item of ship.cargo.inventory) {
                await spaceTraders.sellCargo(selectedShip.symbol, item.symbol, item.units);
              }
            }
          }
        ]
      },
      
      // Contract Mission
      {
        id: 'first-contract',
        title: 'Complete Your First Contract',
        description: 'Accept and fulfill a delivery contract',
        type: 'contract',
        estimatedTime: 30,
        reward: { credits: 50000 },
        steps: [
          {
            id: 'accept-contract',
            title: 'Accept a Contract',
            description: 'Choose and accept an available contract',
            status: 'pending',
            action: async () => {
              const availableContracts = contracts.filter(c => !c.accepted);
              if (availableContracts.length === 0) throw new Error('No contracts available');
              
              const contract = availableContracts[0];
              await spaceTraders.acceptContract(contract.id);
            }
          },
          {
            id: 'acquire-goods',
            title: 'Acquire Required Goods',
            description: 'Mine or purchase the goods needed for delivery',
            status: 'pending'
          },
          {
            id: 'deliver-goods',
            title: 'Deliver to Destination',
            description: 'Navigate to the delivery location and complete the contract',
            status: 'pending'
          }
        ]
      },

      // Exploration Mission
      {
        id: 'system-exploration',
        title: 'System Exploration',
        description: 'Explore and map your local system',
        type: 'exploration',
        estimatedTime: 20,
        reward: { credits: 15000, experience: 500 },
        steps: [
          {
            id: 'scan-waypoints',
            title: 'Scan All Waypoints',
            description: 'Visit and scan each waypoint in your system',
            status: 'pending'
          },
          {
            id: 'create-bookmarks',
            title: 'Create Strategic Bookmarks',
            description: 'Bookmark important locations like markets and shipyards',
            status: 'pending'
          }
        ]
      }
    ];

    setMissions(availableMissions);
  };

  const startMission = async (mission: Mission) => {
    if (!selectedShip) {
      setError('Please select a ship before starting the mission');
      return;
    }

    setCurrentMission(mission);
    setError(null);

    // Start the first step
    const firstStep = mission.steps[0];
    if (firstStep) {
      firstStep.status = 'in_progress';
      setMissions(prev => prev.map(m => 
        m.id === mission.id ? { ...mission, steps: [...mission.steps] } : m
      ));
    }
  };

  const executeStep = async (stepId: string) => {
    if (!currentMission) return;

    const step = currentMission.steps.find(s => s.id === stepId);
    if (!step || !step.action) return;

    setLoading(true);
    setError(null);

    try {
      step.status = 'in_progress';
      await step.action();
      step.status = 'completed';
      
      // Start next step
      const currentIndex = currentMission.steps.indexOf(step);
      const nextStep = currentMission.steps[currentIndex + 1];
      if (nextStep) {
        nextStep.status = 'in_progress';
      }

      // Check if mission is complete
      const allCompleted = currentMission.steps.every(s => s.status === 'completed');
      if (allCompleted) {
        setCurrentMission(null);
        // Award rewards, etc.
      }

      setMissions(prev => prev.map(m => 
        m.id === currentMission.id ? { ...currentMission } : m
      ));
    } catch (err) {
      console.error('Step execution failed:', err);
      step.status = 'failed';
      setError(err instanceof Error ? err.message : 'Step failed');
    } finally {
      setLoading(false);
    }
  };

  const startAutomatedMission = (mission: Mission) => {
    if (!selectedShip) {
      setError('Please select a ship first');
      return;
    }

    // Start automation based on mission type
    switch (mission.type) {
      case 'mining':
        automationOrchestrator.startAutomation(selectedShip.symbol, 'mining');
        break;
      case 'contract':
        automationOrchestrator.startAutomation(selectedShip.symbol, 'contract');
        break;
      case 'trading':
        automationOrchestrator.startAutomation(selectedShip.symbol, 'trading');
        break;
      default:
        setError('Automation not available for this mission type');
        return;
    }

    setCurrentMission(mission);
  };

  if (!hasAgentToken) {
    return (
      <div className="screen-container">
        <div className="no-token-message">
          <h2>Mission Wizard</h2>
          <p>Please configure your agent token to access missions.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="screen-container">
      <div className="screen-header">
        <h2>Mission Wizard</h2>
        <p>Guided missions to help you learn SpaceTraders</p>
      </div>

      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {!currentMission ? (
        <div className="mission-selection">
          <div className="ship-selection">
            <h3>Select Your Ship</h3>
            <div className="ships-grid">
              {ships.map(ship => (
                <div 
                  key={ship.symbol} 
                  className={`ship-card ${selectedShip?.symbol === ship.symbol ? 'selected' : ''}`}
                  onClick={() => setSelectedShip(ship)}
                >
                  <h4>{ship.registration.name}</h4>
                  <p>{ship.symbol}</p>
                  <span className={`status ${ship.nav.status.toLowerCase()}`}>
                    {ship.nav.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="available-missions">
            <h3>Available Missions</h3>
            <div className="missions-grid">
              {missions.map(mission => (
                <div key={mission.id} className={`mission-card ${mission.type}`}>
                  <div className="mission-header">
                    <h4>{mission.title}</h4>
                    <span className="mission-type">{mission.type.toUpperCase()}</span>
                  </div>
                  <p className="mission-description">{mission.description}</p>
                  <div className="mission-details">
                    {mission.estimatedTime && (
                      <span className="estimated-time">⏱️ {mission.estimatedTime} min</span>
                    )}
                    {mission.reward && (
                      <span className="reward">💰 {mission.reward.credits.toLocaleString()}</span>
                    )}
                  </div>
                  <div className="mission-progress">
                    <span>{mission.steps.filter(s => s.status === 'completed').length} / {mission.steps.length} steps</span>
                  </div>
                  <div className="mission-actions">
                    <button onClick={() => startMission(mission)} disabled={!selectedShip}>
                      Start Mission
                    </button>
                    {(mission.type === 'mining' || mission.type === 'contract' || mission.type === 'trading') && (
                      <button onClick={() => startAutomatedMission(mission)} disabled={!selectedShip}>
                        Auto Complete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="active-mission">
          <div className="mission-header">
            <h3>{currentMission.title}</h3>
            <button onClick={() => setCurrentMission(null)}>Exit Mission</button>
          </div>
          
          <div className="mission-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ 
                  width: `${(currentMission.steps.filter(s => s.status === 'completed').length / currentMission.steps.length) * 100}%` 
                }}
              ></div>
            </div>
            <span>{currentMission.steps.filter(s => s.status === 'completed').length} / {currentMission.steps.length} completed</span>
          </div>

          <div className="mission-steps">
            {currentMission.steps.map((step, index) => (
              <div key={step.id} className={`step ${step.status}`}>
                <div className="step-number">{index + 1}</div>
                <div className="step-content">
                  <h4>{step.title}</h4>
                  <p>{step.description}</p>
                  {step.status === 'in_progress' && step.action && (
                    <button 
                      onClick={() => executeStep(step.id)}
                      disabled={loading}
                    >
                      {loading ? 'Executing...' : 'Execute Step'}
                    </button>
                  )}
                </div>
                <div className="step-status">
                  {step.status === 'completed' && '✅'}
                  {step.status === 'in_progress' && '⏳'}
                  {step.status === 'failed' && '❌'}
                  {step.status === 'pending' && '⏸️'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}