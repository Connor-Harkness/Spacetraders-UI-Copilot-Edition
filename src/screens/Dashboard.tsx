import React, { useState, useEffect } from 'react';
import { spaceTraders } from '../services/api';
import { useTokens } from '../context/TokenContext';
import { AgentInfo } from '../components/AgentInfo';
import { ShipCard } from '../components/ShipCard';
import { TokenSetup } from '../components/TokenSetup';
import { Agent, Ship } from '../types/api';

export default function Dashboard() {
  const { hasAgentToken } = useTokens();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [ships, setShips] = useState<Ship[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (!hasAgentToken) return;

    setLoading(true);
    setError(null);

    try {
      const [agentData, shipsData] = await Promise.all([
        spaceTraders.getAgent(),
        spaceTraders.getShips(),
      ]);
      
      setAgent(agentData);
      setShips(shipsData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
      setError(errorMessage);
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasAgentToken) {
      loadData();
    }
  }, [hasAgentToken]);

  const handleShipAction = async (ship: Ship, action: 'dock' | 'orbit' | 'refuel') => {
    if (!confirm(`${action.toUpperCase()} ${ship.registration.name}?`)) return;

    try {
      setLoading(true);
      let updatedShip: Ship;

      switch (action) {
        case 'dock':
          if (ship.nav.status !== 'DOCKED') {
            updatedShip = await spaceTraders.dockShip(ship.symbol);
            alert(`Success: ${ship.registration.name} is now docked`);
          } else {
            alert('Ship is already docked');
            return;
          }
          break;
        case 'orbit':
          if (ship.nav.status !== 'IN_ORBIT') {
            updatedShip = await spaceTraders.orbitShip(ship.symbol);
            alert(`Success: ${ship.registration.name} is now in orbit`);
          } else {
            alert('Ship is already in orbit');
            return;
          }
          break;
        case 'refuel':
          if (ship.nav.status === 'DOCKED') {
            updatedShip = await spaceTraders.refuelShip(ship.symbol);
            alert(`Success: ${ship.registration.name} has been refueled`);
          } else {
            alert('Error: Ship must be docked to refuel');
            return;
          }
          break;
        default:
          return;
      }

      // Update ships list with the updated ship
      setShips(prev => prev.map(s => s.symbol === ship.symbol ? updatedShip : s));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Action failed';
      alert(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = () => {
    loadData();
  };

  if (!hasAgentToken) {
    return <TokenSetup onComplete={() => {}} />;
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <div style={{ padding: '16px', backgroundColor: '#1F2937' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', textAlign: 'center', margin: 0 }}>
          SpaceTraders Dashboard
        </h1>
        <p style={{ fontSize: '14px', color: '#9CA3AF', textAlign: 'center', margin: '4px 0 0' }}>
          Milestone M1: Basic Dashboard
        </p>
      </div>

      <AgentInfo agent={agent} loading={loading && !agent} error={error} />

      <div style={{ margin: '8px 0' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1F2937', margin: '8px 16px' }}>
          Fleet ({ships.length} ships)
        </h2>
        
        {loading && ships.length === 0 && (
          <div className="card">
            <p>Loading ships...</p>
          </div>
        )}

        {ships.length === 0 && !loading && (
          <div className="card">
            <p style={{ textAlign: 'center', color: '#6B7280', padding: '20px' }}>
              No ships found
            </p>
          </div>
        )}

        {ships.map((ship) => (
          <ShipCard
            key={ship.symbol}
            ship={ship}
            onAction={(action) => handleShipAction(ship, action)}
          />
        ))}
      </div>

      <div style={{ padding: '20px', textAlign: 'center', marginTop: '20px' }}>
        <p style={{ fontSize: '12px', color: '#9CA3AF' }}>
          SpaceTraders UI - Built with React & Vite
        </p>
        <button 
          className="button" 
          onClick={onRefresh}
          disabled={loading}
          style={{ marginTop: '10px' }}
        >
          {loading ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>
    </div>
  );
}