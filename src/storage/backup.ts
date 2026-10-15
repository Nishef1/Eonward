import type { SQLiteDatabase } from 'expo-sqlite';
import { BACKUP_COLUMNS, parseBackup, type Backup, type BackupRow, type BackupTable } from '../domain/backup';

export async function exportBackup(db: SQLiteDatabase): Promise<Backup> {
  const tables = {} as Backup['tables'];
  await db.withExclusiveTransactionAsync(async (tx) => {
    for (const name of Object.keys(BACKUP_COLUMNS) as BackupTable[]) {
      tables[name] = await tx.getAllAsync<BackupRow>(`SELECT ${BACKUP_COLUMNS[name].join(', ')} FROM ${name}`);
    }
  });
  return parseBackup(JSON.stringify({ format: 'eonward-backup', version: 1, schemaVersion: 7,
    createdAt: new Date().toISOString(), tables }));
}

/** Add missing records atomically; existing IDs always keep their current local values. */
export async function restoreBackup(db: SQLiteDatabase, text: string): Promise<number> {
  const backup = parseBackup(text);
  let added = 0;
  await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.execAsync('PRAGMA defer_foreign_keys = ON;');
    for (const name of Object.keys(BACKUP_COLUMNS) as BackupTable[]) {
      const columns = BACKUP_COLUMNS[name];
      for (const row of backup.tables[name]) {
        const where = name === 'board_goals' ? 'board_id = ? AND goal_id = ?' : 'id = ?';
        const values = name === 'board_goals' ? [row.board_id, row.goal_id] : [row.id];
        if (await tx.getFirstAsync(`SELECT 1 FROM ${name} WHERE ${where}`, values)) continue;
        // Do not use OR IGNORE: it would silently skip corrupt/conflicting records.
        const result = await tx.runAsync(`INSERT INTO ${name} (${columns.join(', ')})
          VALUES (${columns.map(() => '?').join(', ')})`, columns.map((key) => row[key]));
        added += result.changes;
      }
    }
    const broken = await tx.getAllAsync('PRAGMA foreign_key_check');
    if (broken.length) throw new Error('Backup relationships could not be restored. Nothing was changed.');
    // Validate the merged graph as well: individually valid backups may create a cycle through local IDs.
    const tables = {} as Backup['tables'];
    for (const name of Object.keys(BACKUP_COLUMNS) as BackupTable[]) {
      tables[name] = await tx.getAllAsync<BackupRow>(`SELECT ${BACKUP_COLUMNS[name].join(', ')} FROM ${name}`);
    }
    parseBackup(JSON.stringify({ ...backup, tables }));
  });
  return added;
}
