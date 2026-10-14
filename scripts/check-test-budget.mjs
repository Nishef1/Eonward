import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const maxTests = 20;
const dir = 'tests';
const files = readdirSync(dir).filter((name) => name.endsWith('.test.mjs'));
const names = [];
for (const file of files) {
  const content = readFileSync(join(dir, file), 'utf8');
  const matches = [...content.matchAll(/^\s*test\(\s*['"`]([^'"`]+)['"`]/gm)];
  names.push(...matches.map((match) => match[1]));
}
const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
if (names.length === 0 || names.length > maxTests || duplicates.length) {
  console.error(`Test budget: ${names.length}/${maxTests}. Duplicate names: ${[...new Set(duplicates)].join(', ') || 'none'}`);
  process.exitCode = 1;
} else {
  console.log(`Test budget: ${names.length}/${maxTests} focused tests, no duplicate names.`);
}
