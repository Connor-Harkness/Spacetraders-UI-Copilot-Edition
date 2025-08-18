import React, { useState, useEffect } from 'react';
import { spaceTraders } from '../services/api';
import { useTokens } from '../context/TokenContext';
import { Market, MarketTradeGood, Ship, System, Waypoint, Agent, TradeResult } from '../types/api';

interface BestSellOption {
  waypointSymbol: string;
  symbol: string;
  name: string;
  sellPrice: number;
  distance?: number;
}

export default function MarketScreen() {
  const { hasAgentToken } = useTokens();
  const [ships, setShips] = useState<Ship[]>([]);
  const [selectedShip, setSelectedShip] = useState<string>('');
  const [systems, setSystems] = useState<System[]>([]);
  const [selectedSystem, setSelectedSystem] = useState<string>('');
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [selectedWaypoint, setSelectedWaypoint] = useState<string>('');
  const [market, setMarket] = useState<Market | null>(null);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [bestSellOptions, setBestSellOptions] = useState<BestSellOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [trading, setTrading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tradeHistory, setTradeHistory] = useState<TradeResult[]>([]);

  useEffect(() => {
    if (hasAgentToken) {
      loadInitialData();
    }
  }, [hasAgentToken]);

  useEffect(() => {
    if (selectedSystem) {
      loadWaypoints();
    }
  }, [selectedSystem]);

  useEffect(() => {
    if (selectedSystem && selectedWaypoint) {
      loadMarket();
    }
  }, [selectedSystem, selectedWaypoint]);

  useEffect(() => {
    if (selectedShip) {
      calculateBestSellOptions();
    }
  }, [selectedShip, ships]);

  const loadInitialData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [agentData, shipsData, systemsData] = await Promise.all([
        spaceTraders.getAgent(),
        spaceTraders.getShips(),
        spaceTraders.getSystems(1, 20),
      ]);
      
      setAgent(agentData);
      setShips(shipsData);
      setSystems(systemsData.data);
      
      // Auto-select first ship with cargo
      const shipWithCargo = shipsData.find(ship => ship.cargo.units > 0);
      if (shipWithCargo) {
        setSelectedShip(shipWithCargo.symbol);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const loadWaypoints = async () => {
    if (!selectedSystem) return;
    
    setLoading(true);
    
    try {
      const response = await spaceTraders.getWaypoints(selectedSystem, 1, 100);
      // Filter waypoints that might have markets
      const potentialMarkets = response.data.filter(wp => 
        wp.traits.some(trait => 
          trait.symbol.includes('MARKETPLACE') || 
          wp.type === 'ORBITAL_STATION' ||
          wp.type === 'PLANET' ||
          wp.type === 'ASTEROID_BASE'
        )
      );
      setWaypoints(potentialMarkets);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load waypoints';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const loadMarket = async () => {
    if (!selectedSystem || !selectedWaypoint) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const marketData = await spaceTraders.getMarket(selectedSystem, selectedWaypoint);
      setMarket(marketData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load market data';
      setError(errorMessage);
      setMarket(null);
    } finally {
      setLoading(false);
    }
  };

  const calculateBestSellOptions = async () => {
    if (!selectedShip) return;
    
    const ship = ships.find(s => s.symbol === selectedShip);
    if (!ship || ship.cargo.inventory.length === 0) {
      setBestSellOptions([]);
      return;
    }

    const options: BestSellOption[] = [];
    
    // For each cargo item, we'd ideally check multiple markets
    // For now, we'll simulate with the current market if available
    ship.cargo.inventory.forEach(item => {
      if (market && market.tradeGoods) {
        const tradeGood = market.tradeGoods.find(tg => tg.symbol === item.symbol);
        if (tradeGood && tradeGood.sellPrice) {
          options.push({
            waypointSymbol: selectedWaypoint,
            symbol: item.symbol,
            name: item.name,
            sellPrice: tradeGood.sellPrice,
          });
        }
      }
    });

    setBestSellOptions(options);
  };

  const handleSellCargo = async (symbol: string, units: number, pricePerUnit: number) => {
    if (!selectedShip) return;
    
    if (!confirm(`Sell ${units} units of ${symbol} for ${(units * pricePerUnit).toLocaleString()} credits?`)) {
      return;
    }

    setTrading(true);
    setError(null);

    try {
      const result = await spaceTraders.sellCargo(selectedShip, symbol, units);
      
      // Update ship and agent data
      const updatedShips = ships.map(s => 
        s.symbol === selectedShip 
          ? { ...s, cargo: result.cargo }
          : s
      );
      setShips(updatedShips);
      setAgent(result.agent);
      
      // Add to trade history
      setTradeHistory(prev => [result.transaction, ...prev.slice(0, 19)]);
      
      alert(`Successfully sold ${units} units of ${symbol} for ${result.transaction.totalPrice.toLocaleString()} credits!`);
      
      // Refresh market and best sell options
      await loadMarket();
      calculateBestSellOptions();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sell cargo';
      setError(errorMessage);
    } finally {
      setTrading(false);
    }
  };

  const handleBuyCargo = async (symbol: string, units: number, pricePerUnit: number) => {
    if (!selectedShip) return;
    
    const totalCost = units * pricePerUnit;
    if (!agent || agent.credits < totalCost) {
      alert('Insufficient credits');
      return;
    }
    
    if (!confirm(`Buy ${units} units of ${symbol} for ${totalCost.toLocaleString()} credits?`)) {
      return;
    }

    setTrading(true);
    setError(null);

    try {
      const result = await spaceTraders.purchaseCargo(selectedShip, symbol, units);
      
      // Update ship and agent data
      const updatedShips = ships.map(s => 
        s.symbol === selectedShip 
          ? { ...s, cargo: result.cargo }
          : s
      );
      setShips(updatedShips);
      setAgent(result.agent);
      
      // Add to trade history
      setTradeHistory(prev => [result.transaction, ...prev.slice(0, 19)]);
      
      alert(`Successfully purchased ${units} units of ${symbol} for ${result.transaction.totalPrice.toLocaleString()} credits!`);
      
      // Refresh market
      await loadMarket();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to purchase cargo';
      setError(errorMessage);
    } finally {
      setTrading(false);
    }
  };

  const handleNavigateAndDock = async (waypointSymbol: string) => {
    if (!selectedShip) return;
    
    const ship = ships.find(s => s.symbol === selectedShip);
    if (!ship) return;
    
    if (ship.nav.waypointSymbol === waypointSymbol && ship.nav.status === 'DOCKED') {
      alert('Ship is already docked at this waypoint');
      return;
    }

    if (!confirm(`Navigate to ${waypointSymbol} and dock?`)) {
      return;
    }

    setTrading(true);
    setError(null);

    try {
      let updatedShip = ship;
      
      // Navigate if not at the waypoint
      if (ship.nav.waypointSymbol !== waypointSymbol) {
        updatedShip = await spaceTraders.navigateShip(selectedShip, waypointSymbol);
        alert(`Navigation to ${waypointSymbol} completed!`);
      }
      
      // Dock if not already docked
      if (updatedShip.nav.status !== 'DOCKED') {
        updatedShip = await spaceTraders.dockShip(selectedShip);
        alert('Ship docked successfully!');
      }
      
      // Update ships data
      const updatedShips = ships.map(s => 
        s.symbol === selectedShip ? updatedShip : s
      );
      setShips(updatedShips);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Navigation/docking failed';
      setError(errorMessage);
    } finally {
      setTrading(false);
    }
  };

  const getShipDetails = () => {
    return ships.find(s => s.symbol === selectedShip);
  };

  const ship = getShipDetails();

  if (!hasAgentToken) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Please set up your agent token to access markets</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* Header */}
      <div style={{ padding: '16px', backgroundColor: '#1F2937' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', textAlign: 'center', margin: 0 }}>
          Market Trading
        </h1>
        <p style={{ fontSize: '14px', color: '#9CA3AF', textAlign: 'center', margin: '4px 0 0' }}>
          M5: Buy and sell cargo at markets
        </p>
        {agent && (
          <p style={{ fontSize: '14px', color: '#10B981', textAlign: 'center', margin: '4px 0 0' }}>
            Credits: {agent.credits.toLocaleString()}
          </p>
        )}
      </div>

      {/* Ship Selection */}
      <div className="card" style={{ margin: '8px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 12px' }}>
          Select Trading Ship
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
              <div><strong>Cargo:</strong> {ship.cargo.units}/{ship.cargo.capacity} ({Math.round(ship.cargo.units/ship.cargo.capacity*100)}%)</div>
              <div><strong>Items:</strong> {ship.cargo.inventory.length} types</div>
            </div>
          </div>
        )}
      </div>

      {/* Best Sell Suggestions */}
      {bestSellOptions.length > 0 && (
        <div className="card" style={{ margin: '8px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 12px' }}>
            Best Sell Opportunities
          </h3>
          
          {bestSellOptions.map((option, index) => (
            <div key={`${option.symbol}-${index}`} style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '8px',
              backgroundColor: '#F0FDF4',
              borderRadius: '4px',
              marginBottom: '4px'
            }}>
              <div>
                <strong>{option.name}</strong> ({option.symbol})
                <br />
                <small style={{ color: '#6B7280' }}>at {option.waypointSymbol}</small>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 'bold', color: '#059669' }}>
                  {option.sellPrice.toLocaleString()} credits/unit
                </div>
                <button
                  className="button"
                  onClick={() => handleNavigateAndDock(option.waypointSymbol)}
                  disabled={trading}
                  style={{ padding: '4px 8px', fontSize: '12px', marginTop: '4px' }}
                >
                  Navigate & Dock
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Market Selection */}
      <div className="card" style={{ margin: '8px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 12px' }}>
          Browse Markets
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
              setMarket(null);
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
              Market Waypoint:
            </label>
            <select
              value={selectedWaypoint}
              onChange={(e) => {
                setSelectedWaypoint(e.target.value);
                setMarket(null);
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

      {/* Market Data */}
      {market && (
        <div style={{ margin: '8px 0' }}>
          <div className="card" style={{ margin: '8px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 8px' }}>
              Market at {selectedWaypoint}
            </h3>
            <p style={{ fontSize: '14px', color: '#6B7280' }}>
              {market.tradeGoods?.length || 0} trade goods available
            </p>
          </div>

          {/* Sell Opportunities (Ship's Cargo) */}
          {ship && ship.cargo.inventory.length > 0 && (
            <div className="card" style={{ margin: '8px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 'bold', margin: '0 0 8px', color: '#059669' }}>
                Sell Your Cargo
              </h4>
              
              {ship.cargo.inventory.map((item, index) => {
                const tradeGood = market.tradeGoods?.find(tg => tg.symbol === item.symbol);
                const canSell = tradeGood && tradeGood.sellPrice && ship.nav.status === 'DOCKED';
                
                return (
                  <div key={index} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '8px',
                    backgroundColor: canSell ? '#F0FDF4' : '#F9FAFB',
                    borderRadius: '4px',
                    marginBottom: '4px'
                  }}>
                    <div>
                      <strong>{item.name}</strong> ({item.symbol})
                      <br />
                      <small style={{ color: '#6B7280' }}>You have: {item.units} units</small>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {canSell ? (
                        <>
                          <div style={{ fontWeight: 'bold', color: '#059669' }}>
                            {tradeGood.sellPrice!.toLocaleString()}/unit
                          </div>
                          <div style={{ fontSize: '12px', color: '#6B7280' }}>
                            Total: {(tradeGood.sellPrice! * item.units).toLocaleString()}
                          </div>
                          <button
                            className="button"
                            onClick={() => handleSellCargo(item.symbol, item.units, tradeGood.sellPrice!)}
                            disabled={trading}
                            style={{ padding: '4px 8px', fontSize: '12px', marginTop: '4px', backgroundColor: '#10B981' }}
                          >
                            Sell All
                          </button>
                        </>
                      ) : (
                        <div style={{ fontSize: '12px', color: '#6B7280' }}>
                          {ship.nav.status !== 'DOCKED' ? 'Dock to trade' : 'Not available'}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Buy Opportunities */}
          {market.tradeGoods && market.tradeGoods.length > 0 && (
            <div className="card" style={{ margin: '8px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 'bold', margin: '0 0 8px', color: '#DC2626' }}>
                Purchase Cargo
              </h4>
              
              {market.tradeGoods.filter(tg => tg.purchasePrice && tg.purchasePrice > 0).map((tradeGood, index) => {
                const canBuy = ship && ship.nav.status === 'DOCKED' && ship.cargo.units < ship.cargo.capacity;
                const maxUnits = Math.min(
                  ship ? ship.cargo.capacity - ship.cargo.units : 0,
                  agent && tradeGood.purchasePrice ? Math.floor(agent.credits / tradeGood.purchasePrice) : 0
                );
                
                return (
                  <div key={index} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '8px',
                    backgroundColor: canBuy ? '#FEF2F2' : '#F9FAFB',
                    borderRadius: '4px',
                    marginBottom: '4px'
                  }}>
                    <div>
                      <strong>{tradeGood.name}</strong> ({tradeGood.symbol})
                      <br />
                      <small style={{ color: '#6B7280' }}>Supply: {tradeGood.supply || 'Unknown'}</small>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {canBuy && tradeGood.purchasePrice ? (
                        <>
                          <div style={{ fontWeight: 'bold', color: '#DC2626' }}>
                            {tradeGood.purchasePrice.toLocaleString()}/unit
                          </div>
                          <div style={{ fontSize: '12px', color: '#6B7280' }}>
                            Max: {maxUnits} units
                          </div>
                          <button
                            className="button"
                            onClick={() => handleBuyCargo(tradeGood.symbol, Math.min(10, maxUnits), tradeGood.purchasePrice!)}
                            disabled={trading || maxUnits === 0}
                            style={{ padding: '4px 8px', fontSize: '12px', marginTop: '4px', backgroundColor: '#EF4444' }}
                          >
                            Buy 10
                          </button>
                        </>
                      ) : (
                        <div style={{ fontSize: '12px', color: '#6B7280' }}>
                          {!ship || ship.nav.status !== 'DOCKED' ? 'Dock to trade' : 'N/A'}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Trade History */}
      {tradeHistory.length > 0 && (
        <div className="card" style={{ margin: '8px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 12px' }}>
            Recent Transactions
          </h3>
          
          {tradeHistory.slice(0, 5).map((transaction, index) => (
            <div key={index} style={{ 
              padding: '6px',
              backgroundColor: transaction.type === 'SELL' ? '#F0FDF4' : '#FEF2F2',
              borderRadius: '4px',
              marginBottom: '4px',
              fontSize: '14px'
            }}>
              <span style={{ 
                color: transaction.type === 'SELL' ? '#059669' : '#DC2626',
                fontWeight: 'bold'
              }}>
                {transaction.type}
              </span>
              {' '}
              {transaction.units} {transaction.tradeSymbol} for {transaction.totalPrice.toLocaleString()} credits
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