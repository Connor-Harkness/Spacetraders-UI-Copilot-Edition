import React, { useState } from 'react';
import Dashboard from './src/screens/Dashboard';
import ContractsScreen from './src/screens/ContractsScreen';
import MapScreen from './src/screens/MapScreen';
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