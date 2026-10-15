import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { getFocusSession, beginFocusSession, pauseFocusSession, resumeFocusSession, stopFocusSession } from '../../storage/focus';
import type { FocusSession } from '../../domain/focus';
import { askForFocusNotificationPermission, reconcileFocusNotification } from './notifications';

interface FocusContextValue {
  session: FocusSession | null;
  loading: boolean;
  busy: boolean;
  error: string | null;
  notificationNotice: string | null;
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
  const [error, setError] = useState<string | null>(null);
  const [notificationNotice, setNotificationNotice] = useState<string | null>(null);
  const blocked = useRef(false);
  const mounted = useRef(true);
  const refreshSequence = useRef(0);

  const refresh = useCallback(async () => {
    const sequence = ++refreshSequence.current;
    try {
      const record = await getFocusSession(db);
      if (mounted.current && sequence === refreshSequence.current) {
        setSession(record);
        setLoading(false);
        setError(null);
        // Native reminders survive app restarts. Reconcile against SQLite,
        // including deleted/paused/expired sessions.
        void reconcileFocusNotification(db).then((notice) => {
          if (mounted.current && sequence === refreshSequence.current) setNotificationNotice(notice);
        }).catch(() => {
          if (mounted.current && sequence === refreshSequence.current) {
            setNotificationNotice('Focus still runs, but its background alert could not be scheduled. Check notification and alarm permissions.');
          }
        });
      }
    } catch (reason) {
      if (mounted.current && sequence === refreshSequence.current) {
        setError(reason instanceof Error ? reason.message : 'Could not read the focus timer.');
        setLoading(false);
      }
      throw reason;
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
    if (blocked.current) throw new Error('A focus action is already in progress.');
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
    perform(async () => {
      // Permission prompts happen only after a Start action; denial is not fatal.
      try { await askForFocusNotificationPermission(); }
      catch { setNotificationNotice('Focus will run without a background alert.'); }
      return beginFocusSession(db, blockId, replace);
    }), [db, perform]);
  const pause = useCallback(() => perform(() => pauseFocusSession(db)), [db, perform]);
  const resume = useCallback(() => perform(() => resumeFocusSession(db)), [db, perform]);
  const finish = useCallback(() => perform(() => stopFocusSession(db)), [db, perform]);

  const value = useMemo<FocusContextValue>(() => ({
    session, loading, busy, error, notificationNotice, refresh, begin, pause, resume, finish,
  }), [session, loading, busy, error, notificationNotice, refresh, begin, pause, resume, finish]);

  return <FocusContext.Provider value={value}>{children}</FocusContext.Provider>;
}
export function useFocusSession(): FocusContextValue {
  const result = useContext(FocusContext);
  if (!result) throw new Error('useFocusSession must be within FocusProvider.');
  return result;
}
