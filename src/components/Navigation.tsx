import React from 'react';

interface NavigationProps {
  currentScreen: string;
  onScreenChange: (screen: string) => void;
}

export function Navigation({ currentScreen, onScreenChange }: NavigationProps) {
  const screens = [
    { key: 'dashboard', label: 'Dashboard', icon: '🏠' },
    { key: 'contracts', label: 'Contracts', icon: '📋' },
    { key: 'map', label: 'Map', icon: '🗺️' },
  ];

  return (
    <nav className="navigation">
      <div className="nav-brand">
        <h2>SpaceTraders</h2>
      </div>
      <div className="nav-links">
        {screens.map(screen => (
          <button
            key={screen.key}
            className={`nav-link ${currentScreen === screen.key ? 'active' : ''}`}
            onClick={() => onScreenChange(screen.key)}
          >
            <span className="nav-icon">{screen.icon}</span>
            <span className="nav-label">{screen.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}