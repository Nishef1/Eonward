import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { getFocusSession, beginFocusSession, pauseFocusSession, resumeFocusSession, stopFocusSession } from '../../storage/focus';
import type { FocusSession } from '../../domain/focus';

interface FocusContextValue {
  session: FocusSession | null;
  loading: boolean;
  busy: boolean;
  refresh: () => Promise<void>;
  begin: (blockId: string, replace?: boolean) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  finish: () => Promise<void>;
}
const FocusContext = createContext<FocusContextValue | null>(null);

export function FocusProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [session, setSession] = useState<FocusSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const blocked = useRef(false);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    const record = await getFocusSession(db);
    if (mounted.current) {
      setSession(record);
      setLoading(false);
    }
  }, [db]);

  useEffect(() => {
    mounted.current = true;
    void refresh().catch(() => { if (mounted.current) setLoading(false); });
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh().catch(() => {});
    });
    return () => { mounted.current = false; listener.remove(); };
  }, [refresh]);

  const perform = useCallback(async (action: () => Promise<FocusSession | null | void>) => {
    if (blocked.current) return;
    blocked.current = true;
    setBusy(true);
    try {
      await action();
      await refresh();
    } finally {
      blocked.current = false;
      if (mounted.current) setBusy(false);
    }
  }, [refresh]);

  const begin = useCallback((blockId: string, replace = false) =>
    perform(() => beginFocusSession(db, blockId, replace)), [db, perform]);
  const pause = useCallback(() => perform(() => pauseFocusSession(db)), [db, perform]);
  const resume = useCallback(() => perform(() => resumeFocusSession(db)), [db, perform]);
  const finish = useCallback(() => perform(() => stopFocusSession(db)), [db, perform]);

  const value = useMemo<FocusContextValue>(() => ({
    session, loading, busy, refresh, begin, pause, resume, finish,
  }), [session, loading, busy, refresh, begin, pause, resume, finish]);

  return <FocusContext.Provider value={value}>{children}</FocusContext.Provider>;
}
export function useFocusSession(): FocusContextValue {
  const result = useContext(FocusContext);
  if (!result) throw new Error('useFocusSession must be within FocusProvider.');
  return result;
}
