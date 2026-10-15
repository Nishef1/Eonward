import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Lightweight SSOT contract, not a snapshot of every styling decision.
const failures = [];
function scan(directory) {
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) { scan(path); continue; }
    if (!path.endsWith('.tsx')) continue;
    const source = readFileSync(path, 'utf8');
    if (/type\s+Palette\s*=\s*typeof\s+colors\./.test(source))
      failures.push(path + ': local Palette type duplicates theme/tokens.ts');
    if (/#(?:3F6C65|956C3F|66716E|9B5F30)\b/i.test(source))
      failures.push(path + ': inline schedule color duplicates semantic timeline tokens');
  }
}
scan('src/features');
const calendar = readFileSync('src/features/calendar/CalendarScreen.tsx', 'utf8');
if ((calendar.match(/listRangeBlocks\(db,/g) ?? []).length !== 1)
  failures.push('Calendar must load one canonical event collection for its Day/Week/Month views.');
if (/\bset(?:WeekBlocks|MonthBlocks|Blocks)\(/.test(calendar))
  failures.push('Calendar must derive its view slices rather than separately store three event lists.');
if (!calendar.includes('analyzeRangeLoad(') || !calendar.includes('blockOverlapsRange('))
  failures.push('Calendar must use shared interval accounting and selection.');
if (failures.length) {
  console.error('Design and Calendar SSOT contract:\n' + failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Design SSOT: shared palette, semantic schedule tokens and one Calendar event source.');
}
