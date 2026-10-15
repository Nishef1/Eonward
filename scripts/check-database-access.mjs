import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * Architecture guard: the direct Expo SQLite hook is allowed only in the
 * database wrapper. Every screen, dock and Focus consumer uses one serial gate.
 * Root SQLiteProvider owns startup and is intentionally not restricted here.
 */
const allowed = new Set(['src/storage/use-database.ts']);
const violations = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) { walk(full); continue; }
    if (!/\.(ts|tsx)$/.test(name)) continue;
    const file = relative('.', full).replaceAll('\\', '/');
    const source = readFileSync(full, 'utf8');
    if (!allowed.has(file) && /\buseSQLiteContext\b/.test(source)) violations.push(file);
  }
}
walk('src');
if (violations.length) {
  console.error('Direct SQLite context hook bypasses the serialized boundary:\n' + violations.join('\n'));
  process.exitCode = 1;
} else {
  console.log('SQLite access boundary: all feature consumers use the guarded connection.');
}
