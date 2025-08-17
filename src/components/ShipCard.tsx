import React from 'react';
import { Ship } from '../types/api';
import { getShipStatusColor, getShipStatusText } from '../utils';

interface ShipCardProps {
  ship: Ship;
  onAction?: (action: 'dock' | 'orbit' | 'refuel') => void;
}

export const ShipCard: React.FC<ShipCardProps> = ({ ship, onAction }) => {
  const statusColor = getShipStatusColor(ship.nav.status);
  const statusText = getShipStatusText(ship.nav.status);

  const handleActionClick = (action: 'dock' | 'orbit' | 'refuel') => {
    if (onAction) {
      onAction(action);
    }
  };

  return (
    <div className="card" style={{ cursor: 'default' }}>
      <div className="card-header">
        <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1F2937', margin: 0, flex: 1 }}>
          {ship.registration.name}
        </h3>
        <span 
          className="status-badge"
          style={{ 
            padding: '4px 8px', 
            borderRadius: '12px', 
            fontSize: '12px', 
            fontWeight: '600', 
            color: 'white',
            backgroundColor: statusColor
          }}
        >
          {statusText}
        </span>
      </div>
      
      <div style={{ marginBottom: '12px' }}>
        <p style={{ fontSize: '14px', color: '#6B7280', margin: '4px 0' }}>
          <strong>Symbol:</strong> {ship.symbol}
        </p>
        <p style={{ fontSize: '14px', color: '#6B7280', margin: '4px 0' }}>
          <strong>Role:</strong> {ship.registration.role}
        </p>
        <p style={{ fontSize: '14px', color: '#6B7280', margin: '4px 0' }}>
          <strong>Location:</strong> {ship.nav.waypointSymbol}
        </p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '0 0 2px' }}>Fuel</p>
          <p style={{ fontSize: '14px', fontWeight: '600', color: '#374151', margin: 0 }}>
            {ship.fuel.current}/{ship.fuel.capacity}
          </p>
        </div>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '0 0 2px' }}>Cargo</p>
          <p style={{ fontSize: '14px', fontWeight: '600', color: '#374151', margin: 0 }}>
            {ship.cargo.units}/{ship.cargo.capacity}
          </p>
        </div>
      </div>

      {ship.cooldown && ship.cooldown.remainingSeconds > 0 && (
        <div style={{ 
          marginBottom: '12px', 
          padding: '8px', 
          backgroundColor: '#FEF3C7', 
          borderRadius: '6px' 
        }}>
          <p style={{ fontSize: '12px', color: '#D97706', textAlign: 'center', margin: 0 }}>
            Cooldown: {Math.ceil(ship.cooldown.remainingSeconds)}s
          </p>
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {ship.nav.status !== 'DOCKED' && (
          <button 
            className="button"
            style={{ 
              flex: 1, 
              fontSize: '14px', 
              padding: '8px 12px', 
              backgroundColor: '#10B981' 
            }}
            onClick={() => handleActionClick('dock')}
          >
            Dock
          </button>
        )}
        
        {ship.nav.status !== 'IN_ORBIT' && (
          <button 
            className="button"
            style={{ 
              flex: 1, 
              fontSize: '14px', 
              padding: '8px 12px', 
              backgroundColor: '#F59E0B' 
            }}
            onClick={() => handleActionClick('orbit')}
          >
            Orbit
          </button>
        )}
        
        {ship.nav.status === 'DOCKED' && (
          <button 
            className="button"
            style={{ 
              flex: 1, 
              fontSize: '14px', 
              padding: '8px 12px', 
              backgroundColor: '#8B5CF6' 
            }}
            onClick={() => handleActionClick('refuel')}
          >
            Refuel
          </button>
        )}
      </div>
    </div>
  );
};