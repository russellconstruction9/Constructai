import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User } from '../types';
import { USERS } from '../constants';

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  switchUser: (userId: number) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(USERS[0]); // Default to Admin

  const switchUser = (userId: number) => {
    const newUser = USERS.find(u => u.id === userId);
    setUser(newUser || null);
  };

  return React.createElement(
    UserContext.Provider,
    { value: { user, setUser, switchUser } },
    children
  );
};

export const useCurrentUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useCurrentUser must be used within a UserProvider');
  }
  return context;
};
