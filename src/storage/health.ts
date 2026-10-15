import type { SQLiteDatabase } from 'expo-sqlite';

export interface LocalHealth {
  structureOkay: boolean;
  foreignKeysOkay: boolean;
  structuralProblems: number;
  orphanRelations: number;
}

/**
 * Optional, read-only health probe. quick_check skips some index checks and
 * cannot predict platform crashes. FK inspection is separate in SQLite.
 */
export async function checkLocalHealth(db: SQLiteDatabase): Promise<LocalHealth> {
  const quick = await db.getAllAsync<{ quick_check: string }>('PRAGMA quick_check');
  const relations = await db.getAllAsync<Record<string, unknown>>('PRAGMA foreign_key_check');
  const failures = quick.filter((row) => row.quick_check !== 'ok');
  return {
    structureOkay: quick.length === 1 && failures.length === 0,
    foreignKeysOkay: relations.length === 0,
    structuralProblems: failures.length || (quick.length === 1 ? 0 : 1),
    orphanRelations: relations.length,
  };
}
