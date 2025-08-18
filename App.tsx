import React, { useState } from 'react';
import Dashboard from './src/screens/Dashboard';
import ContractsScreen from './src/screens/ContractsScreen';
import MapScreen from './src/screens/MapScreen';
import ShipyardScreen from './src/screens/ShipyardScreen';
import MiningScreen from './src/screens/MiningScreen';
import MarketScreen from './src/screens/MarketScreen';
import OperationsScreen from './src/screens/OperationsScreen';
import { Navigation } from './src/components/Navigation';
import { TokenProvider } from './src/context/TokenContext';
import './App.css';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('dashboard');

  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case 'contracts':
        return <ContractsScreen />;
      case 'map':
        return <MapScreen />;
      case 'shipyard':
        return <ShipyardScreen />;
      case 'mining':
        return <MiningScreen />;
      case 'market':
        return <MarketScreen />;
      case 'missions':
        return <div className="screen-container"><h2>Mission Wizard</h2><p>Mission system coming soon!</p></div>;
      case 'operations':
        return <OperationsScreen />;
      case 'dashboard':
      default:
        return <Dashboard />;
    }
  };

  return (
    <TokenProvider>
      <div className="app-container">
        <Navigation 
          currentScreen={currentScreen}
          onScreenChange={setCurrentScreen}
        />
        <main className="main-content">
          {renderCurrentScreen()}
        </main>
      </div>
    </TokenProvider>
  );
}