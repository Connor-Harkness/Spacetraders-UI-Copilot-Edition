import React, { useState, useEffect } from 'react';
import { spaceTraders } from '../services/api';
import { useTokens } from '../context/TokenContext';
import { Shipyard, ShipyardShip, System, Waypoint, Agent } from '../types/api';

export default function ShipyardScreen() {
  const { hasAgentToken } = useTokens();
  const [systems, setSystems] = useState<System[]>([]);
  const [selectedSystem, setSelectedSystem] = useState<string>('');
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [selectedWaypoint, setSelectedWaypoint] = useState<string>('');
  const [shipyard, setShipyard] = useState<Shipyard | null>(null);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  // Load systems on mount
  useEffect(() => {
    if (hasAgentToken) {
      loadSystems();
      loadAgent();
    }
  }, [hasAgentToken]);

  // Load waypoints when system changes
  useEffect(() => {
    if (selectedSystem) {
      loadWaypoints();
    }
  }, [selectedSystem]);

  // Load shipyard when waypoint changes
  useEffect(() => {
    if (selectedSystem && selectedWaypoint) {
      loadShipyard();
    }
  }, [selectedSystem, selectedWaypoint]);

  const loadAgent = async () => {
    try {
      const agentData = await spaceTraders.getAgent();
      setAgent(agentData);
    } catch (err) {
      console.error('Failed to load agent:', err);
    }
  };

  const loadSystems = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await spaceTraders.getSystems(1, 50);
      setSystems(response.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load systems';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const loadWaypoints = async () => {
    if (!selectedSystem) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await spaceTraders.getWaypoints(selectedSystem, 1, 100);
      // Filter waypoints that might have shipyards
      const potentialShipyards = response.data.filter(wp => 
        wp.traits.some(trait => 
          trait.symbol.includes('SHIPYARD') || 
          wp.type === 'ORBITAL_STATION' ||
          wp.type === 'ASTEROID_BASE'
        )
      );
      setWaypoints(potentialShipyards);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load waypoints';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const loadShipyard = async () => {
    if (!selectedSystem || !selectedWaypoint) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const shipyardData = await spaceTraders.getShipyard(selectedSystem, selectedWaypoint);
      setShipyard(shipyardData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load shipyard data';
      setError(errorMessage);
      setShipyard(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchaseShip = async (ship: ShipyardShip) => {
    if (!agent || !selectedWaypoint) return;
    
    if (agent.credits < ship.purchasePrice) {
      alert('Insufficient credits to purchase this ship');
      return;
    }

    if (!confirm(`Purchase ${ship.name} for ${ship.purchasePrice.toLocaleString()} credits?`)) {
      return;
    }

    setPurchasing(ship.type);
    
    try {
      const result = await spaceTraders.purchaseShip(ship.type, selectedWaypoint);
      alert(`Successfully purchased ${ship.name}! New ship: ${result.ship.symbol}`);
      
      // Refresh agent data to show updated credits
      await loadAgent();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to purchase ship';
      alert(`Error: ${errorMessage}`);
    } finally {
      setPurchasing(null);
    }
  };

  if (!hasAgentToken) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Please set up your agent token to access shipyards</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* Header */}
      <div style={{ padding: '16px', backgroundColor: '#1F2937' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', textAlign: 'center', margin: 0 }}>
          Shipyards
        </h1>
        <p style={{ fontSize: '14px', color: '#9CA3AF', textAlign: 'center', margin: '4px 0 0' }}>
          M3: Browse and purchase ships
        </p>
        {agent && (
          <p style={{ fontSize: '14px', color: '#10B981', textAlign: 'center', margin: '4px 0 0' }}>
            Credits: {agent.credits.toLocaleString()}
          </p>
        )}
      </div>

      {/* Controls */}
      <div className="card" style={{ margin: '8px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 12px' }}>
          Select Shipyard Location
        </h3>
        
        <div style={{ marginBottom: '12px' }}>
          <label style={{ fontSize: '14px', fontWeight: '500', display: 'block', marginBottom: '4px' }}>
            System:
          </label>
          <select
            value={selectedSystem}
            onChange={(e) => {
              setSelectedSystem(e.target.value);
              setSelectedWaypoint('');
              setShipyard(null);
            }}
            style={{ 
              width: '100%', 
              padding: '8px', 
              border: '1px solid #D1D5DB', 
              borderRadius: '6px',
              backgroundColor: 'white'
            }}
          >
            <option value="">Select a system...</option>
            {systems.map(system => (
              <option key={system.symbol} value={system.symbol}>
                {system.symbol} ({system.type})
              </option>
            ))}
          </select>
        </div>

        {selectedSystem && (
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '14px', fontWeight: '500', display: 'block', marginBottom: '4px' }}>
              Waypoint with Shipyard:
            </label>
            <select
              value={selectedWaypoint}
              onChange={(e) => {
                setSelectedWaypoint(e.target.value);
                setShipyard(null);
              }}
              style={{ 
                width: '100%', 
                padding: '8px', 
                border: '1px solid #D1D5DB', 
                borderRadius: '6px',
                backgroundColor: 'white'
              }}
            >
              <option value="">Select a waypoint...</option>
              {waypoints.map(waypoint => (
                <option key={waypoint.symbol} value={waypoint.symbol}>
                  {waypoint.symbol} ({waypoint.type})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Loading/Error States */}
      {loading && (
        <div className="card" style={{ margin: '8px' }}>
          <p style={{ textAlign: 'center', color: '#6B7280' }}>Loading...</p>
        </div>
      )}

      {error && (
        <div className="card" style={{ margin: '8px', backgroundColor: '#FEE2E2' }}>
          <p style={{ color: '#DC2626', fontSize: '14px' }}>Error: {error}</p>
        </div>
      )}

      {/* Shipyard Display */}
      {shipyard && (
        <div style={{ margin: '8px 0' }}>
          <div className="card" style={{ margin: '8px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 8px' }}>
              Shipyard at {selectedWaypoint}
            </h3>
            <p style={{ fontSize: '14px', color: '#6B7280', margin: '0 0 12px' }}>
              Modifications Fee: {shipyard.modificationsFee.toLocaleString()} credits
            </p>
            <p style={{ fontSize: '14px', color: '#6B7280' }}>
              {shipyard.ships?.length || 0} ships available for purchase
            </p>
          </div>

          {/* Available Ships */}
          {shipyard.ships?.map((ship, index) => (
            <div key={`${ship.type}-${index}`} className="card" style={{ margin: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 4px', color: '#1F2937' }}>
                    {ship.name}
                  </h4>
                  <p style={{ fontSize: '14px', color: '#6B7280', margin: '0 0 8px' }}>
                    {ship.description}
                  </p>
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '12px', color: '#374151' }}>
                    <span>Type: {ship.type}</span>
                    <span>Supply: {ship.supply}</span>
                    <span>Cargo: {ship.frame.moduleSlots} slots</span>
                    <span>Fuel: {ship.frame.fuelCapacity}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', minWidth: '120px' }}>
                  <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#059669', margin: '0 0 8px' }}>
                    {ship.purchasePrice.toLocaleString()}
                  </p>
                  <p style={{ fontSize: '12px', color: '#6B7280', margin: '0 0 8px' }}>
                    credits
                  </p>
                  <button
                    className="button"
                    onClick={() => handlePurchaseShip(ship)}
                    disabled={purchasing === ship.type || !agent || agent.credits < ship.purchasePrice}
                    style={{
                      padding: '6px 12px',
                      fontSize: '14px',
                      backgroundColor: agent && agent.credits >= ship.purchasePrice ? '#10B981' : '#9CA3AF'
                    }}
                  >
                    {purchasing === ship.type ? 'Purchasing...' : 'Purchase'}
                  </button>
                </div>
              </div>
              
              {/* Ship specifications */}
              <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '12px', fontSize: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px' }}>
                  <div>
                    <strong>Frame:</strong> {ship.frame.name}
                  </div>
                  <div>
                    <strong>Engine:</strong> {ship.engine.name}
                  </div>
                  <div>
                    <strong>Reactor:</strong> {ship.reactor.name}
                  </div>
                  <div>
                    <strong>Speed:</strong> {ship.engine.speed}
                  </div>
                  <div>
                    <strong>Power:</strong> {ship.reactor.powerOutput}
                  </div>
                  <div>
                    <strong>Mounts:</strong> {ship.mounts.length}
                  </div>
                </div>
              </div>
            </div>
          )) || (
            <div className="card" style={{ margin: '8px' }}>
              <p style={{ textAlign: 'center', color: '#6B7280', padding: '20px' }}>
                No ships available at this shipyard
              </p>
            </div>
          )}
        </div>
      )}

      {!loading && !shipyard && selectedSystem && selectedWaypoint && (
        <div className="card" style={{ margin: '8px' }}>
          <p style={{ textAlign: 'center', color: '#6B7280', padding: '20px' }}>
            No shipyard data available for this location
          </p>
        </div>
      )}
    </div>
  );
}