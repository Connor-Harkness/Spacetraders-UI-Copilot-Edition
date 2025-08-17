import React, { useState, useEffect, useCallback } from 'react';
import { spaceTraders } from '../services/api';
import { useTokens } from '../context/TokenContext';
import { Ship, Survey, Extraction, Agent } from '../types/api';

export default function MiningScreen() {
  const { hasAgentToken } = useTokens();
  const [ships, setShips] = useState<Ship[]>([]);
  const [selectedShip, setSelectedShip] = useState<string>('');
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [selectedSurvey, setSelectedSurvey] = useState<string>('');
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(false);
  const [mining, setMining] = useState(false);
  const [surveying, setSurveying] = useState(false);
  const [autoMining, setAutoMining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [miningHistory, setMiningHistory] = useState<Extraction[]>([]);
  const [autoMiningSettings, setAutoMiningSettings] = useState({
    stopOnFullCargo: true,
    stopOnLowFuel: true,
    fuelThreshold: 20, // percentage
    cargoThreshold: 90 // percentage
  });

  useEffect(() => {
    if (hasAgentToken) {
      loadData();
    }
  }, [hasAgentToken]);

  // Auto-mining interval
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (autoMining && selectedShip) {
      interval = setInterval(() => {
        const ship = ships.find(s => s.symbol === selectedShip);
        if (ship && !ship.cooldown && canAutoMine(ship)) {
          handleExtract(true); // Auto-extract
        }
      }, 2000); // Check every 2 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoMining, selectedShip, ships]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [agentData, shipsData] = await Promise.all([
        spaceTraders.getAgent(),
        spaceTraders.getShips(),
      ]);
      
      setAgent(agentData);
      setShips(shipsData);
      
      // Select first mining-capable ship
      const miningShip = shipsData.find(ship => 
        ship.registration.role === 'EXCAVATOR' || 
        ship.mounts?.some((mount: any) => mount.symbol.includes('MINING'))
      );
      if (miningShip) {
        setSelectedShip(miningShip.symbol);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const canAutoMine = (ship: Ship): boolean => {
    if (autoMiningSettings.stopOnFullCargo) {
      const cargoPercent = (ship.cargo.units / ship.cargo.capacity) * 100;
      if (cargoPercent >= autoMiningSettings.cargoThreshold) {
        return false;
      }
    }
    
    if (autoMiningSettings.stopOnLowFuel) {
      const fuelPercent = (ship.fuel.current / ship.fuel.capacity) * 100;
      if (fuelPercent <= autoMiningSettings.fuelThreshold) {
        return false;
      }
    }
    
    return true;
  };

  const handleSurvey = async () => {
    if (!selectedShip) return;
    
    const ship = ships.find(s => s.symbol === selectedShip);
    if (!ship) return;

    if (ship.nav.status !== 'IN_ORBIT') {
      setError('Ship must be in orbit at an asteroid field to survey');
      return;
    }

    setSurveying(true);
    setError(null);

    try {
      const result = await spaceTraders.createSurvey(selectedShip);
      setSurveys(prev => [...prev, ...result.surveys]);
      
      // Update ship data to reflect cooldown
      const updatedShips = ships.map(s => 
        s.symbol === selectedShip 
          ? { ...s, cooldown: result.cooldown }
          : s
      );
      setShips(updatedShips);
      
      alert(`Survey completed! Found ${result.surveys.length} deposits`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Survey failed';
      setError(errorMessage);
    } finally {
      setSurveying(false);
    }
  };

  const handleExtract = async (isAuto = false) => {
    if (!selectedShip) return;
    
    const ship = ships.find(s => s.symbol === selectedShip);
    if (!ship) return;

    if (ship.nav.status !== 'IN_ORBIT') {
      if (!isAuto) setError('Ship must be in orbit at an asteroid field to extract');
      return;
    }

    if (ship.cargo.units >= ship.cargo.capacity) {
      if (!isAuto) setError('Ship cargo is full');
      if (autoMining) setAutoMining(false); // Stop auto-mining
      return;
    }

    setMining(true);
    if (!isAuto) setError(null);

    try {
      const survey = selectedSurvey ? surveys.find(s => s.signature === selectedSurvey) : undefined;
      const result = await spaceTraders.extractResources(selectedShip, survey);
      
      // Update mining history
      setMiningHistory(prev => [result.extraction, ...prev.slice(0, 19)]); // Keep last 20
      
      // Update ship data
      const updatedShips = ships.map(s => 
        s.symbol === selectedShip 
          ? { ...s, cooldown: result.cooldown, cargo: result.cargo }
          : s
      );
      setShips(updatedShips);
      
      // Remove used survey
      if (survey) {
        setSurveys(prev => prev.filter(s => s.signature !== survey.signature));
        setSelectedSurvey('');
      }
      
      if (!isAuto) {
        alert(`Extracted ${result.extraction.yield.units} units of ${result.extraction.yield.symbol}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Extraction failed';
      if (!isAuto) setError(errorMessage);
      if (autoMining && !isAuto) setAutoMining(false); // Stop auto-mining on error
    } finally {
      setMining(false);
    }
  };

  const handleJettison = async (symbol: string, units: number) => {
    if (!selectedShip) return;
    
    if (!confirm(`Jettison ${units} units of ${symbol}?`)) return;

    try {
      const result = await spaceTraders.jettison(selectedShip, symbol, units);
      
      // Update ship data
      const updatedShips = ships.map(s => 
        s.symbol === selectedShip 
          ? { ...s, cargo: result.cargo }
          : s
      );
      setShips(updatedShips);
      
      alert(`Jettisoned ${units} units of ${symbol}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Jettison failed';
      setError(errorMessage);
    }
  };

  const getShipDetails = () => {
    return ships.find(s => s.symbol === selectedShip);
  };

  const ship = getShipDetails();
  const validSurveys = surveys.filter(survey => {
    const expiration = new Date(survey.expiration);
    return expiration > new Date();
  });

  if (!hasAgentToken) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Please set up your agent token to access mining operations</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* Header */}
      <div style={{ padding: '16px', backgroundColor: '#1F2937' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', textAlign: 'center', margin: 0 }}>
          Mining Operations
        </h1>
        <p style={{ fontSize: '14px', color: '#9CA3AF', textAlign: 'center', margin: '4px 0 0' }}>
          M4: Extract resources with survey optimization
        </p>
      </div>

      {/* Ship Selection */}
      <div className="card" style={{ margin: '8px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 12px' }}>
          Select Mining Ship
        </h3>
        
        <select
          value={selectedShip}
          onChange={(e) => setSelectedShip(e.target.value)}
          style={{ 
            width: '100%', 
            padding: '8px', 
            border: '1px solid #D1D5DB', 
            borderRadius: '6px',
            backgroundColor: 'white',
            marginBottom: '12px'
          }}
        >
          <option value="">Select a ship...</option>
          {ships.map(ship => (
            <option key={ship.symbol} value={ship.symbol}>
              {ship.registration.name} ({ship.symbol}) - {ship.nav.waypointSymbol}
            </option>
          ))}
        </select>

        {ship && (
          <div style={{ fontSize: '14px', color: '#374151' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px' }}>
              <div><strong>Status:</strong> {ship.nav.status}</div>
              <div><strong>Location:</strong> {ship.nav.waypointSymbol}</div>
              <div><strong>Fuel:</strong> {ship.fuel.current}/{ship.fuel.capacity} ({Math.round(ship.fuel.current/ship.fuel.capacity*100)}%)</div>
              <div><strong>Cargo:</strong> {ship.cargo.units}/{ship.cargo.capacity} ({Math.round(ship.cargo.units/ship.cargo.capacity*100)}%)</div>
            </div>
            {ship.cooldown && ship.cooldown.remainingSeconds > 0 && (
              <div style={{ marginTop: '8px', padding: '6px', backgroundColor: '#FEF3C7', borderRadius: '4px', textAlign: 'center' }}>
                <span style={{ color: '#D97706' }}>Cooldown: {Math.ceil(ship.cooldown.remainingSeconds)}s</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Auto-Mining Controls */}
      {ship && (
        <div className="card" style={{ margin: '8px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 12px' }}>
            Auto-Mining Settings
          </h3>
          
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', fontSize: '14px', marginBottom: '8px' }}>
              <input
                type="checkbox"
                checked={autoMining}
                onChange={(e) => setAutoMining(e.target.checked)}
                style={{ marginRight: '8px' }}
                disabled={!ship || ship.nav.status !== 'IN_ORBIT'}
              />
              Enable Auto-Mining
            </label>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px' }}>
              <label>
                <input
                  type="checkbox"
                  checked={autoMiningSettings.stopOnFullCargo}
                  onChange={(e) => setAutoMiningSettings(prev => ({ ...prev, stopOnFullCargo: e.target.checked }))}
                  style={{ marginRight: '8px' }}
                />
                Stop at {autoMiningSettings.cargoThreshold}% cargo
              </label>
              
              <label>
                <input
                  type="checkbox"
                  checked={autoMiningSettings.stopOnLowFuel}
                  onChange={(e) => setAutoMiningSettings(prev => ({ ...prev, stopOnLowFuel: e.target.checked }))}
                  style={{ marginRight: '8px' }}
                />
                Stop at {autoMiningSettings.fuelThreshold}% fuel
              </label>
            </div>
          </div>
          
          {autoMining && (
            <div style={{ padding: '8px', backgroundColor: '#DBEAFE', borderRadius: '4px', fontSize: '14px', color: '#1D4ED8' }}>
              🤖 Auto-mining active - will extract when cooldown expires and conditions are met
            </div>
          )}
        </div>
      )}

      {/* Mining Actions */}
      {ship && (
        <div className="card" style={{ margin: '8px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 12px' }}>
            Mining Actions
          </h3>
          
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
            <button
              className="button"
              onClick={handleSurvey}
              disabled={surveying || ship.nav.status !== 'IN_ORBIT' || (ship.cooldown && ship.cooldown.remainingSeconds > 0)}
              style={{ backgroundColor: '#8B5CF6' }}
            >
              {surveying ? 'Surveying...' : 'Create Survey'}
            </button>
            
            <button
              className="button"
              onClick={() => handleExtract()}
              disabled={mining || ship.nav.status !== 'IN_ORBIT' || (ship.cooldown && ship.cooldown.remainingSeconds > 0) || ship.cargo.units >= ship.cargo.capacity}
              style={{ backgroundColor: '#F59E0B' }}
            >
              {mining ? 'Extracting...' : 'Extract Resources'}
            </button>
          </div>

          {validSurveys.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '14px', fontWeight: '500', display: 'block', marginBottom: '4px' }}>
                Use Survey (optional):
              </label>
              <select
                value={selectedSurvey}
                onChange={(e) => setSelectedSurvey(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '6px', 
                  border: '1px solid #D1D5DB', 
                  borderRadius: '4px',
                  backgroundColor: 'white'
                }}
              >
                <option value="">No survey</option>
                {validSurveys.map(survey => (
                  <option key={survey.signature} value={survey.signature}>
                    {survey.size} - {survey.deposits.map(d => d.symbol).join(', ')}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Cargo Management */}
      {ship && ship.cargo.inventory.length > 0 && (
        <div className="card" style={{ margin: '8px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 12px' }}>
            Cargo Management
          </h3>
          
          {ship.cargo.inventory.map((item, index) => (
            <div key={index} style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '8px',
              backgroundColor: '#F9FAFB',
              borderRadius: '4px',
              marginBottom: '4px'
            }}>
              <div>
                <strong>{item.name}</strong> ({item.symbol})
                <br />
                <small style={{ color: '#6B7280' }}>Units: {item.units}</small>
              </div>
              <button
                className="button"
                onClick={() => handleJettison(item.symbol, item.units)}
                style={{ padding: '4px 8px', fontSize: '12px', backgroundColor: '#EF4444' }}
              >
                Jettison
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Mining History */}
      {miningHistory.length > 0 && (
        <div className="card" style={{ margin: '8px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 12px' }}>
            Recent Extractions
          </h3>
          
          {miningHistory.slice(0, 5).map((extraction, index) => (
            <div key={index} style={{ 
              padding: '6px',
              backgroundColor: '#F0FDF4',
              borderRadius: '4px',
              marginBottom: '4px',
              fontSize: '14px'
            }}>
              +{extraction.yield.units} {extraction.yield.symbol}
            </div>
          ))}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="card" style={{ margin: '8px', backgroundColor: '#FEE2E2' }}>
          <p style={{ color: '#DC2626', fontSize: '14px' }}>Error: {error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="card" style={{ margin: '8px' }}>
          <p style={{ textAlign: 'center', color: '#6B7280' }}>Loading...</p>
        </div>
      )}
    </div>
  );
}