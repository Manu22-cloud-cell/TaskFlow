'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';

import type { User } from '@/lib/types';
import { getCurrentUser } from '@/services/client/auth.service';
import { bindPushOwner } from '@/features/realtime/firebase-push';
import { useRealtimeNotificationStore } from '@/features/realtime/stores/realtime-notification-store';

type SessionContextValue = {
  user: User | null;
  isLoading: boolean;
  refreshUser: () => Promise<User | null>;
  clearUser: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

function isProtectedPath(pathname: string) {
  return (
    pathname.startsWith('/projects') ||
    pathname.startsWith('/tasks') ||
    pathname.startsWith('/admin')
  );
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const hasLoadedUser = useRef(false);
  const sessionUserId = useRef<number | null>(null);

  const refreshUser = useCallback(async () => {
    setIsLoading(true);

    try {
      const currentUser = await getCurrentUser();

      if (sessionUserId.current !== currentUser.id) {
        useRealtimeNotificationStore.getState().clearAll();
      }
      sessionUserId.current = currentUser.id;

      setUser(currentUser);
      hasLoadedUser.current = true;
      return currentUser;
    } catch {
      void bindPushOwner(null).catch(() => undefined);
      useRealtimeNotificationStore.getState().clearAll();
      sessionUserId.current = null;
      setUser(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isProtectedPath(pathname) || hasLoadedUser.current) return;

    void refreshUser();
  }, [pathname, refreshUser]);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      refreshUser,
      clearUser: () => {
        void bindPushOwner(null).catch(() => undefined);
        useRealtimeNotificationStore.getState().clearAll();
        sessionUserId.current = null;
        hasLoadedUser.current = false;
        setUser(null);
      },
    }),
    [isLoading, refreshUser, user],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error('useSession must be used within SessionProvider');
  }

  return context;
}
