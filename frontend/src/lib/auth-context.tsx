'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useSyncExternalStore } from 'react';
import { api } from './api-client';
import { clearTokens, getAccessToken } from './auth-storage';
import type { User } from './types';

interface AuthContextValue {
  user: User | undefined;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => void;
  notifyLogin: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// localStorage is an external store, so token-presence is read via useSyncExternalStore
// rather than useEffect+setState — this avoids a hydration mismatch (server always renders
// as "no token") by rendering the server snapshot on the first client pass, then reconciling.
const listeners = new Set<() => void>();

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

/** Call after code in this tab mutates the stored tokens (login/logout), to trigger a re-check. */
function emitTokenChange(): void {
  listeners.forEach((listener) => listener());
}

function getSnapshot(): boolean {
  return Boolean(getAccessToken());
}

function getServerSnapshot(): boolean {
  return false;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const hasToken = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const queryClient = useQueryClient();

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get<User>('/users/me'),
    enabled: hasToken,
    retry: false,
  });

  const logout = () => {
    clearTokens();
    queryClient.clear();
    emitTokenChange();
    if (typeof window !== 'undefined') window.location.href = '/login';
  };

  /** Call right after a login/register mutation stores fresh tokens, so the context picks them up immediately. */
  const notifyLogin = () => {
    emitTokenChange();
    queryClient.invalidateQueries({ queryKey: ['me'] });
  };

  const isLoading = hasToken && userLoading;

  return (
    <AuthContext.Provider
      value={{ user, isLoading, isAuthenticated: hasToken && Boolean(user), logout, notifyLogin }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
