import { useMemo } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { serializeDatabase } from './serialized';

/** Share the same guarded native handle across every Eonward screen and Focus. */
export function useEonwardDatabase() {
  const raw = useSQLiteContext();
  return useMemo(() => serializeDatabase(raw), [raw]);
}
