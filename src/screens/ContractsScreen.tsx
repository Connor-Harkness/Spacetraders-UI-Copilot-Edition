import React, { useState, useEffect } from 'react';
import { spaceTraders } from '../services/api';
import { useTokens } from '../context/TokenContext';
import { Contract } from '../types/api';
import { ContractCard } from '../components/ContractCard';

export default function ContractsScreen() {
  const { hasAgentToken } = useTokens();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadContracts = async () => {
    if (!hasAgentToken) return;

    setLoading(true);
    setError(null);

    try {
      const contractsData = await spaceTraders.getContracts();
      setContracts(contractsData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load contracts';
      setError(errorMessage);
      console.error('Contracts load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasAgentToken) {
      loadContracts();
    }
  }, [hasAgentToken]);

  const handleContractAccepted = (acceptedContract: Contract) => {
    setContracts(prev => 
      prev.map(contract => 
        contract.id === acceptedContract.id ? acceptedContract : contract
      )
    );
  };

  const handleRefresh = () => {
    loadContracts();
  };

  if (!hasAgentToken) {
    return (
      <div className="contracts-screen">
        <div className="no-token-message">
          <h2>Authentication Required</h2>
          <p>Please set up your agent token to view contracts.</p>
        </div>
      </div>
    );
  }

  const activeContracts = contracts.filter(c => c.accepted && !c.fulfilled);
  const availableContracts = contracts.filter(c => !c.accepted && new Date(c.expiration) > new Date());
  const completedContracts = contracts.filter(c => c.fulfilled);
  const expiredContracts = contracts.filter(c => !c.accepted && new Date(c.expiration) <= new Date());

  return (
    <div className="contracts-screen">
      <div className="screen-header">
        <h1>Contracts</h1>
        <button 
          onClick={handleRefresh}
          disabled={loading}
          className="refresh-button"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={handleRefresh}>Retry</button>
        </div>
      )}

      {loading && contracts.length === 0 ? (
        <div className="loading-message">
          <p>Loading contracts...</p>
        </div>
      ) : (
        <div className="contracts-content">
          {activeContracts.length > 0 && (
            <section className="contracts-section">
              <h2>Active Contracts ({activeContracts.length})</h2>
              <div className="contracts-grid">
                {activeContracts.map(contract => (
                  <ContractCard
                    key={contract.id}
                    contract={contract}
                    onContractAccepted={handleContractAccepted}
                  />
                ))}
              </div>
            </section>
          )}

          {availableContracts.length > 0 && (
            <section className="contracts-section">
              <h2>Available Contracts ({availableContracts.length})</h2>
              <div className="contracts-grid">
                {availableContracts.map(contract => (
                  <ContractCard
                    key={contract.id}
                    contract={contract}
                    onContractAccepted={handleContractAccepted}
                  />
                ))}
              </div>
            </section>
          )}

          {completedContracts.length > 0 && (
            <section className="contracts-section">
              <h2>Completed Contracts ({completedContracts.length})</h2>
              <div className="contracts-grid">
                {completedContracts.map(contract => (
                  <ContractCard
                    key={contract.id}
                    contract={contract}
                    onContractAccepted={handleContractAccepted}
                  />
                ))}
              </div>
            </section>
          )}

          {expiredContracts.length > 0 && (
            <section className="contracts-section">
              <h2>Expired Contracts ({expiredContracts.length})</h2>
              <div className="contracts-grid">
                {expiredContracts.map(contract => (
                  <ContractCard
                    key={contract.id}
                    contract={contract}
                    onContractAccepted={handleContractAccepted}
                  />
                ))}
              </div>
            </section>
          )}

          {contracts.length === 0 && !loading && (
            <div className="no-contracts-message">
              <h2>No Contracts Available</h2>
              <p>No contracts are currently available for your agent.</p>
              <button onClick={handleRefresh}>Refresh</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}