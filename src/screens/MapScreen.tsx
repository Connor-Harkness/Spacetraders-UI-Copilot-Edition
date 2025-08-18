import React, { useState, useEffect } from 'react';
import { spaceTraders } from '../services/api';
import { useTokens } from '../context/TokenContext';
import { Ship, System, Waypoint } from '../types/api';
import { calculateDistance } from '../utils';

export default function MapScreen() {
  const { hasAgentToken } = useTokens();
  const [ships, setShips] = useState<Ship[]>([]);
  const [selectedShip, setSelectedShip] = useState<Ship | null>(null);
  const [currentSystem, setCurrentSystem] = useState<System | null>(null);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (!hasAgentToken) return;

    setLoading(true);
    setError(null);

    try {
      const shipsData = await spaceTraders.getShips();
      setShips(shipsData);

      if (shipsData.length > 0 && !selectedShip) {
        setSelectedShip(shipsData[0]);
        await loadSystemData(shipsData[0].nav.systemSymbol);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load map data';
      setError(errorMessage);
      console.error('Map data load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSystemData = async (systemSymbol: string) => {
    try {
      const [systemData, waypointsData] = await Promise.all([
        spaceTraders.getSystem(systemSymbol),
        spaceTraders.getWaypoints(systemSymbol, 1, 20)
      ]);

      setCurrentSystem(systemData);
      
      // Sort waypoints by distance to selected ship if available
      let sortedWaypoints = waypointsData.data;
      if (selectedShip) {
        const selectedShipWaypoint = waypointsData.data.find(wp => wp.symbol === selectedShip.nav.waypointSymbol);
        if (selectedShipWaypoint) {
          sortedWaypoints = waypointsData.data.sort((a, b) => {
            const distanceA = calculateDistance(
              { x: a.x, y: a.y }, 
              { x: selectedShipWaypoint.x, y: selectedShipWaypoint.y }
            );
            const distanceB = calculateDistance(
              { x: b.x, y: b.y }, 
              { x: selectedShipWaypoint.x, y: selectedShipWaypoint.y }
            );
            return distanceA - distanceB;
          });
        }
      }
      
      setWaypoints(sortedWaypoints);
    } catch (err) {
      console.error('System data load error:', err);
    }
  };

  useEffect(() => {
    if (hasAgentToken) {
      loadData();
    }
  }, [hasAgentToken]);

  const handleShipSelect = async (ship: Ship) => {
    setSelectedShip(ship);
    if (ship.nav.systemSymbol !== currentSystem?.symbol) {
      await loadSystemData(ship.nav.systemSymbol);
    } else {
      // Re-sort waypoints based on new selected ship
      const selectedShipWaypoint = waypoints.find(wp => wp.symbol === ship.nav.waypointSymbol);
      if (selectedShipWaypoint) {
        const sortedWaypoints = waypoints.sort((a, b) => {
          const distanceA = calculateDistance(
            { x: a.x, y: a.y }, 
            { x: selectedShipWaypoint.x, y: selectedShipWaypoint.y }
          );
          const distanceB = calculateDistance(
            { x: b.x, y: b.y }, 
            { x: selectedShipWaypoint.x, y: selectedShipWaypoint.y }
          );
          return distanceA - distanceB;
        });
        setWaypoints([...sortedWaypoints]);
      }
    }
  };

  const handleNavigate = async (waypointSymbol: string) => {
    if (!selectedShip) return;

    const confirmed = confirm(`Navigate ${selectedShip.registration.name} to ${waypointSymbol}?`);
    if (!confirmed) return;

    setLoading(true);
    setError(null);

    try {
      const updatedShip = await spaceTraders.navigateShip(selectedShip.symbol, waypointSymbol);
      setSelectedShip(updatedShip);
      
      // Update the ship in the ships list
      setShips(prev => 
        prev.map(ship => 
          ship.symbol === updatedShip.symbol ? updatedShip : ship
        )
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to navigate ship';
      setError(errorMessage);
      console.error('Navigation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateWaypointDistance = (waypoint: Waypoint) => {
    if (!currentSystem || !selectedShip) return 0;
    
    const currentWaypoint = waypoints.find(w => w.symbol === selectedShip.nav.waypointSymbol);
    if (!currentWaypoint) return 0;

    return calculateDistance({ x: waypoint.x, y: waypoint.y }, { x: currentWaypoint.x, y: currentWaypoint.y });
  };

  const estimateFuelCost = (waypoint: Waypoint) => {
    const distance = calculateWaypointDistance(waypoint);
    // Rough estimate: 1 fuel per unit distance, minimum 1
    return Math.max(1, Math.round(distance));
  };

  if (!hasAgentToken) {
    return (
      <div className="map-screen">
        <div className="no-token-message">
          <h2>Authentication Required</h2>
          <p>Please set up your agent token to view the map.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="map-screen">
      <div className="screen-header">
        <h1>Navigation Map</h1>
        <button 
          onClick={loadData}
          disabled={loading}
          className="refresh-button"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={loadData}>Retry</button>
        </div>
      )}

      <div className="map-content">
        <div className="map-sidebar">
          <section className="ship-selector">
            <h3>Ships</h3>
            {ships.map(ship => (
              <div
                key={ship.symbol}
                className={`ship-item ${selectedShip?.symbol === ship.symbol ? 'selected' : ''}`}
                onClick={() => handleShipSelect(ship)}
              >
                <div className="ship-name">{ship.registration.name}</div>
                <div className="ship-status">
                  <span className={`status ${ship.nav.status.toLowerCase().replace('_', '-')}`}>
                    {ship.nav.status}
                  </span>
                  <span className="location">{ship.nav.waypointSymbol}</span>
                </div>
                <div className="ship-fuel">
                  Fuel: {ship.fuel.current}/{ship.fuel.capacity}
                </div>
              </div>
            ))}
          </section>

          {selectedShip && (
            <section className="ship-details">
              <h3>Ship Details</h3>
              <div className="detail-item">
                <span>Ship:</span>
                <span>{selectedShip.registration.name}</span>
              </div>
              <div className="detail-item">
                <span>Status:</span>
                <span className={`status ${selectedShip.nav.status.toLowerCase().replace('_', '-')}`}>
                  {selectedShip.nav.status}
                </span>
              </div>
              <div className="detail-item">
                <span>Location:</span>
                <span>{selectedShip.nav.waypointSymbol}</span>
              </div>
              <div className="detail-item">
                <span>System:</span>
                <span>{selectedShip.nav.systemSymbol}</span>
              </div>
              <div className="detail-item">
                <span>Fuel:</span>
                <span>{selectedShip.fuel.current}/{selectedShip.fuel.capacity}</span>
              </div>
              <div className="detail-item">
                <span>Cargo:</span>
                <span>{selectedShip.cargo.units}/{selectedShip.cargo.capacity}</span>
              </div>
            </section>
          )}
        </div>

        <div className="map-main">
          {currentSystem && (
            <section className="system-info">
              <h2>{currentSystem.symbol}</h2>
              <div className="system-details">
                <span>Type: {currentSystem.type}</span>
                <span>Sector: {currentSystem.sectorSymbol}</span>
                <span>Waypoints: {waypoints.length}</span>
              </div>
            </section>
          )}

          <section className="waypoints-list">
            <h3>Waypoints in System</h3>
            {waypoints.length === 0 ? (
              <p>Loading waypoints...</p>
            ) : (
              <div className="waypoints-grid">
                {waypoints.map(waypoint => {
                  const isCurrentLocation = selectedShip?.nav.waypointSymbol === waypoint.symbol;
                  const distance = calculateWaypointDistance(waypoint);
                  const fuelCost = estimateFuelCost(waypoint);
                  const canNavigate = selectedShip && 
                    selectedShip.nav.status === 'IN_ORBIT' && 
                    !isCurrentLocation &&
                    selectedShip.fuel.current >= fuelCost;

                  return (
                    <div
                      key={waypoint.symbol}
                      className={`waypoint-item ${isCurrentLocation ? 'current' : ''}`}
                    >
                      <div className="waypoint-header">
                        <h4>{waypoint.symbol}</h4>
                        <span className={`waypoint-type ${waypoint.type.toLowerCase().replace('_', '-')}`}>
                          {waypoint.type.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="waypoint-details">
                        <div className="detail-row">
                          <span>Distance:</span>
                          <span>{calculateWaypointDistance(waypoint).toFixed(1)} units</span>
                        </div>
                        <div className="detail-row">
                          <span>Est. Fuel:</span>
                          <span>{fuelCost} units</span>
                        </div>
                      </div>

                      {waypoint.traits.length > 0 && (
                        <div className="waypoint-traits">
                          {waypoint.traits.slice(0, 3).map((trait, idx) => (
                            <span key={idx} className="trait-badge">
                              {trait.name}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="waypoint-actions">
                        {isCurrentLocation ? (
                          <span className="current-location-badge">Current Location</span>
                        ) : (
                          <button
                            onClick={() => handleNavigate(waypoint.symbol)}
                            disabled={!canNavigate || loading}
                            className="navigate-button"
                          >
                            {loading ? 'Navigating...' : 'Navigate'}
                          </button>
                        )}
                      </div>

                      {!canNavigate && !isCurrentLocation && selectedShip && (
                        <div className="navigation-warning">
                          {selectedShip.nav.status !== 'IN_ORBIT' && 'Ship must be in orbit'}
                          {selectedShip.fuel.current < fuelCost && 'Insufficient fuel'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}