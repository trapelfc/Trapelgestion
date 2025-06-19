
'use client';

import type { AppMember } from '@/config/member-constants';
import { getAppMembers } from '@/config/member-constants';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface AuthContextProps {
  currentUser: AppMember | null;
  isLoadingAuth: boolean;
  login: (loginInput: string, pass: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

const CURRENT_USER_STORAGE_KEY = 'TRAPEL_FC_CURRENT_USER';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AppMember | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const router = useRouter();

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem(CURRENT_USER_STORAGE_KEY);
      if (storedUser) {
        setCurrentUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Failed to load user from localStorage", error);
      localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
    }
    setIsLoadingAuth(false);
  }, []);

  const login = useCallback(async (loginInput: string, pass: string): Promise<boolean> => {
    setIsLoadingAuth(true);
    const members = getAppMembers();
    
    const foundMember = members.find((member) => {
      const loginMatch = member.nom.toLowerCase() === loginInput.toLowerCase();
      if (!loginMatch) {
        return false;
      }

      // Special handling for admin user with an empty password for development
      if (
        member.nom.toLowerCase() === 'admin' &&
        (member.password === '' || typeof member.password === 'undefined') &&
        pass === ''
      ) {
        return true;
      }

      // Standard password check for other users or admin with a set password
      return member.password === pass;
    });

    if (foundMember) {
      const userToStore = { ...foundMember };
      // Do not store the password in the currentUser state or localStorage for the session
      delete userToStore.password; 
      setCurrentUser(userToStore);
      localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(userToStore));
      setIsLoadingAuth(false);
      return true;
    } else {
      setCurrentUser(null);
      localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
      setIsLoadingAuth(false);
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider value={{ currentUser, isLoadingAuth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextProps {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
