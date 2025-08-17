import React from 'react';
import Dashboard from './src/screens/Dashboard';
import { TokenProvider } from './src/context/TokenContext';
import './App.css';

export default function App() {
  return (
    <TokenProvider>
      <div className="app-container">
        <Dashboard />
      </div>
    </TokenProvider>
  );
}