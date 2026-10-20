import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from './api.js';

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined: đang tải
  const [meta, setMeta] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const res = await api.get('/auth/me');
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
    api.get('/meta').then(setMeta).catch(() => setMeta(null));
  }, [refresh]);

  return (
    <SessionContext.Provider value={{ user, setUser, refresh, logout, meta, loading: user === undefined }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}

export const isStaff = (user) => user && (user.role === 'RECEPTIONIST' || user.role === 'ADMIN');
export const isAdmin = (user) => user?.role === 'ADMIN';
