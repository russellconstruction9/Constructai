import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

// Mock the aistudio object for environments where it might not exist
if (typeof window.aistudio === 'undefined') {
  console.warn('window.aistudio is not defined. Using mock for API key selection.');
  (window as any).aistudio = {
    hasSelectedApiKey: async () => false,
    openSelectKey: async () => { console.log('Mock openSelectKey called'); },
  };
}

interface ApiKeyContextType {
  isKeySelected: boolean;
  selectKey: () => Promise<void>;
  checkKey: () => Promise<void>;
  resetKeyState: () => void;
}

const ApiKeyContext = createContext<ApiKeyContextType | undefined>(undefined);

export const ApiKeyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isKeySelected, setIsKeySelected] = useState(false);

  const checkKey = useCallback(async () => {
    try {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      setIsKeySelected(hasKey);
    } catch (e) {
      console.error("Error checking for API key:", e);
      setIsKeySelected(false);
    }
  }, []);

  useEffect(() => {
    checkKey();
  }, [checkKey]);
  
  const selectKey = async () => {
    try {
      await window.aistudio.openSelectKey();
      // Assume success to handle race condition, as per docs
      setIsKeySelected(true); 
    } catch (e) {
      console.error("Error opening select key dialog:", e);
    }
  };
  
  const resetKeyState = () => {
    setIsKeySelected(false);
  };

  return React.createElement(
    ApiKeyContext.Provider,
    { value: { isKeySelected, selectKey, checkKey, resetKeyState } },
    children
  );
};

export const useApiKey = (): ApiKeyContextType => {
  const context = useContext(ApiKeyContext);
  if (!context) {
    throw new Error('useApiKey must be used within an ApiKeyProvider');
  }
  return context;
};
