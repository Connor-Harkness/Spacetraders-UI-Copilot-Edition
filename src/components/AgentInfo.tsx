import React from 'react';
import { Agent } from '../types/api';
import { formatCredits } from '../utils';

interface AgentInfoProps {
  agent: Agent | null;
  loading: boolean;
  error: string | null;
}

export const AgentInfo: React.FC<AgentInfoProps> = ({ agent, loading, error }) => {
  if (loading) {
    return (
      <div className="card">
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1F2937', marginBottom: '16px' }}>
          Agent Information
        </h2>
        <p style={{ fontSize: '14px', color: '#6B7280', textAlign: 'center', padding: '20px' }}>
          Loading agent data...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1F2937', marginBottom: '16px' }}>
          Agent Information
        </h2>
        <p style={{ fontSize: '14px', color: '#EF4444', textAlign: 'center', padding: '20px' }}>
          Error: {error}
        </p>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="card">
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1F2937', marginBottom: '16px' }}>
          Agent Information
        </h2>
        <p style={{ fontSize: '14px', color: '#6B7280', textAlign: 'center', padding: '20px' }}>
          No agent data available
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1F2937', marginBottom: '16px' }}>
        Agent Information
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px', paddingBottom: '4px' }}>
          <span style={{ fontSize: '14px', color: '#6B7280', fontWeight: '500' }}>Symbol</span>
          <span style={{ fontSize: '14px', color: '#1F2937', fontWeight: '600' }}>{agent.symbol}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px', paddingBottom: '4px' }}>
          <span style={{ fontSize: '14px', color: '#6B7280', fontWeight: '500' }}>Credits</span>
          <span style={{ fontSize: '14px', color: '#1F2937', fontWeight: '600' }}>{formatCredits(agent.credits)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px', paddingBottom: '4px' }}>
          <span style={{ fontSize: '14px', color: '#6B7280', fontWeight: '500' }}>Headquarters</span>
          <span style={{ fontSize: '14px', color: '#1F2937', fontWeight: '600' }}>{agent.headquarters}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px', paddingBottom: '4px' }}>
          <span style={{ fontSize: '14px', color: '#6B7280', fontWeight: '500' }}>Faction</span>
          <span style={{ fontSize: '14px', color: '#1F2937', fontWeight: '600' }}>{agent.startingFaction}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px', paddingBottom: '4px' }}>
          <span style={{ fontSize: '14px', color: '#6B7280', fontWeight: '500' }}>Ship Count</span>
          <span style={{ fontSize: '14px', color: '#1F2937', fontWeight: '600' }}>{agent.shipCount}</span>
        </div>
      </div>
    </div>
  );
};