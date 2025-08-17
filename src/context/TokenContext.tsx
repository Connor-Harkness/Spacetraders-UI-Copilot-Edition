import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
    // Load initial token store
    const loadTokens = () => {
      const store = spaceTraders.getTokenStore();
      setTokenStore(store);
    };

    loadTokens();
    
    // Set up polling to sync with API changes
    const interval = setInterval(loadTokens, 1000);
    return () => clearInterval(interval);
  }, []);

  const hasAgentToken = tokenStore.currentAgentSymbol 
    ? tokenStore.agents.some(a => a.symbol === tokenStore.currentAgentSymbol)
    : false;

  const setAccountToken = async (token: string) => {
    await spaceTraders.setAccountToken(token);
    setTokenStore(spaceTraders.getTokenStore());
  };

  const addAgentToken = async (symbol: string, name: string, token: string) => {
    await spaceTraders.addAgentToken({ symbol, name, token });
    setTokenStore(spaceTraders.getTokenStore());
  };

  const setCurrentAgent = async (symbol: string) => {
    await spaceTraders.setCurrentAgent(symbol);
    setTokenStore(spaceTraders.getTokenStore());
  };

  const clearTokens = async () => {
    // This would clear all tokens - implement if needed
    console.log('Clear tokens not implemented');
  };

  return (
    <TokenContext.Provider
      value={{
        tokenStore,
        hasAgentToken,
        currentAgentSymbol: tokenStore.currentAgentSymbol,
        setAccountToken,
        addAgentToken,
        setCurrentAgent,
        clearTokens,
      }}
    >
      {children}
    </TokenContext.Provider>
  );
};