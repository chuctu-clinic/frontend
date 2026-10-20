import { createContext, useCallback, useContext, useEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import type { Meta, User } from '../types.ts';
import { api } from './api.ts';

interface Session {
  /** undefined: đang tải; null: chưa đăng nhập. */
  user: User | null | undefined;
  setUser: Dispatch<SetStateAction<User | null | undefined>>;
  refresh: () => Promise<User | null>;
  logout: () => Promise<void>;
  meta: Meta | null;
  loading: boolean;
}

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined); // undefined: đang tải
  const [meta, setMeta] = useState<Meta | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await api.get<{ user: User | null }>('/auth/me');
      setUser(res.user);
      return res.user;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  const logout = useCallback(async () => {
    await api.post('/auth/logout').catch(() => {});
    setUser(null);
  }, []);

  useEffect(() => {
    refresh();
    api
      .get<Meta>('/meta')
      .then(setMeta)
      .catch(() => setMeta(null));
  }, [refresh]);

  return (
    <SessionContext.Provider value={{ user, setUser, refresh, logout, meta, loading: user === undefined }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error('useSession phải dùng bên trong SessionProvider');
  return session;
}

export const isStaff = (user: User | null | undefined): user is User => !!user && (user.role === 'RECEPTIONIST' || user.role === 'ADMIN');
export const isAdmin = (user: User | null | undefined) => user?.role === 'ADMIN';
