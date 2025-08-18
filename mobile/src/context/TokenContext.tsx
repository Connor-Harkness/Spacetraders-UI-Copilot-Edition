import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { MobileStorage } from '../utils/mobileUtils';
import { spaceTraders } from '../services/api';
import { TokenStore } from '../types/api';

interface TokenContextType {
  tokenStore: TokenStore;
  hasAgentToken: boolean;
  currentAgentSymbol?: string;
  setAccountToken: (token: string) => Promise<void>;
  addAgentToken: (symbol: string, name: string, token: string) => Promise<void>;
  setCurrentAgent: (symbol: string) => Promise<void>;
  clearTokens: () => Promise<void>;
}

const TokenContext = createContext<TokenContextType | undefined>(undefined);

export const useTokens = () => {
  const context = useContext(TokenContext);
  if (context === undefined) {
    throw new Error('useTokens must be used within a TokenProvider');
  }
  return context;
};

interface TokenProviderProps {
  children: ReactNode;
}

export const TokenProvider: React.FC<TokenProviderProps> = ({ children }) => {
  const [tokenStore, setTokenStore] = useState<TokenStore>({ agents: [] });

  useEffect(() => {
    // Load initial token store using mobile storage
    const loadTokens = async () => {
      try {
        const storedTokens = await MobileStorage.getItem('spacetraders_tokens');
        if (storedTokens) {
          const parsed = JSON.parse(storedTokens);
          setTokenStore(parsed);
          
          // Set the current agent in the API client
          if (parsed.currentAgentSymbol) {
            const agent = parsed.agents.find((a: any) => a.symbol === parsed.currentAgentSymbol);
            if (agent) {
              spaceTraders.setCurrentAgent(agent.symbol);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load tokens from mobile storage:', error);
      }
    };

    loadTokens();
  }, []);

  const hasAgentToken = tokenStore.currentAgentSymbol 
    ? tokenStore.agents.some(a => a.symbol === tokenStore.currentAgentSymbol)
    : false;

  const setAccountToken = async (token: string) => {
    const updatedStore = { ...tokenStore, accountToken: token };
    setTokenStore(updatedStore);
    await MobileStorage.setItem('spacetraders_tokens', JSON.stringify(updatedStore));
    await spaceTraders.setAccountToken(token);
  };

  const addAgentToken = async (symbol: string, name: string, token: string) => {
    const agent = { symbol, name, token };
    const existingIndex = tokenStore.agents.findIndex(a => a.symbol === symbol);
    let updatedAgents;
    
    if (existingIndex >= 0) {
      updatedAgents = [...tokenStore.agents];
      updatedAgents[existingIndex] = agent;
    } else {
      updatedAgents = [...tokenStore.agents, agent];
    }
    
    const updatedStore = { 
      ...tokenStore, 
      agents: updatedAgents,
      currentAgentSymbol: symbol
    };
    
    setTokenStore(updatedStore);
    await MobileStorage.setItem('spacetraders_tokens', JSON.stringify(updatedStore));
    await spaceTraders.addAgentToken(agent);
    await spaceTraders.setCurrentAgent(symbol);
  };

  const setCurrentAgent = async (symbol: string) => {
    const updatedStore = { ...tokenStore, currentAgentSymbol: symbol };
    setTokenStore(updatedStore);
    await MobileStorage.setItem('spacetraders_tokens', JSON.stringify(updatedStore));
    await spaceTraders.setCurrentAgent(symbol);
  };

  const clearTokens = async () => {
    const clearedStore = { agents: [] };
    setTokenStore(clearedStore);
    await MobileStorage.removeItem('spacetraders_tokens');
    // Don't call spaceTraders.clearTokens() as it might not exist
  };

  return (
    <TokenContext.Provider value={{
      tokenStore,
      hasAgentToken,
      currentAgentSymbol: tokenStore.currentAgentSymbol,
      setAccountToken,
      addAgentToken,
      setCurrentAgent,
      clearTokens
    }}>
      {children}
    </TokenContext.Provider>
  );
};