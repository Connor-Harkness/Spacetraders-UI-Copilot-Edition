import React, { useState } from 'react';
import { useTokens } from '../context/TokenContext';

interface TokenSetupProps {
  onComplete: () => void;
}

export const TokenSetup: React.FC<TokenSetupProps> = ({ onComplete }) => {
  const [agentToken, setAgentToken] = useState('');
  const [loading, setLoading] = useState(false);
  const { addAgentToken, setCurrentAgent } = useTokens();

  // // Check for testing agent token from environment variables
  // React.useEffect(() => {
  //   const checkForTestingToken = () => {
  //     // Check for Testing_agent repository secret
  //     const testingToken = process.env.TESTING_AGENT || 
  //                         process.env.REACT_APP_TESTING_AGENT ||
  //                         (window as any).__TESTING_AGENT__;
      
  //     if (testingToken) {
  //       setAgentToken(testingToken);
  //       console.log('Using Testing_agent repository secret for testing');
  //     }
  //   };

  //   checkForTestingToken();
  // }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!agentToken.trim()) {
      alert('Please enter an agent token');
      return;
    }

    setLoading(true);
    try {
      // For now, we'll use a placeholder agent name and symbol
      // In a full implementation, we'd validate the token and get agent info
      const agentSymbol = 'AGENT-' + Date.now();
      const agentName = 'My Agent';
      
      await addAgentToken(agentSymbol, agentName, agentToken.trim());
      await setCurrentAgent(agentSymbol);
      
      onComplete();
    } catch (error) {
      alert('Failed to save token. Please check your token and try again.');
      console.error('Token setup error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#f5f5f5',
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '24px',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
      }}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#1F2937',
          textAlign: 'center',
          marginBottom: '8px'
        }}>
          SpaceTraders Setup
        </h1>
        <p style={{
          fontSize: '16px',
          color: '#6B7280',
          textAlign: 'center',
          marginBottom: '24px'
        }}>
          Enter your SpaceTraders agent token to get started
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '8px',
              display: 'block'
            }}>
              Agent Token
            </label>
            <input
              type="password"
              className="input"
              value={agentToken}
              onChange={(e) => setAgentToken(e.target.value)}
              placeholder="Enter your agent token..."
              autoCapitalize="none"
              autoCorrect="off"
              style={{ width: '100%' }}
            />
            <p style={{
              fontSize: '12px',
              color: '#9CA3AF',
              marginTop: '6px'
            }}>
              Get your token from spacetraders.io after registering an agent
            </p>
          </div>

          <button
            type="submit"
            className="button"
            disabled={loading}
            style={{
              width: '100%',
              marginBottom: '16px',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? 'Setting up...' : 'Continue'}
          </button>
        </form>

        <div style={{
          padding: '16px',
          backgroundColor: '#F3F4F6',
          borderRadius: '8px'
        }}>
          <p style={{
            fontSize: '12px',
            color: '#6B7280',
            textAlign: 'center'
          }}>
            Need help? Visit spacetraders.io to create an account and get your agent token.
          </p>
        </div>
      </div>
    </div>
  );
};