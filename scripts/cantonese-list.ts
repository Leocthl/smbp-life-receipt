// Regenerates the "Cantonese for Leo to check" section of PROGRESS.md from the zh locale files,
// so the list can never fall out of date. Run: npm run cantonese-list
import { readFileSync, writeFileSync } from 'node:fs';
import { zh } from '../src/i18n/zh';

const START = '<!-- cantonese:start -->';
const END = '<!-- cantonese:end -->';
const path = new URL('../PROGRESS.md', import.meta.url);
const lines = Object.entries(zh)
  .filter(([, v]) => v.trim() !== '')
  .map(([k, v]) => `- \`${k}\` — ${v.replace(/\n/g, ' ')}`);
const block = `${START}\n${lines.length} lines, all written by the builder and not yet checked by Leo.\n\n${lines.join('\n')}\n${END}`;
const doc = readFileSync(path, 'utf8');
const next = doc.includes(START)
  ? doc.replace(new RegExp(`${START}[\\s\\S]*${END}`), block)
  : `${doc.trimEnd()}\n\n## Cantonese for Leo to check\n\n${block}\n`;
writeFileSync(path, next);
console.log(`wrote ${lines.length} Cantonese lines to PROGRESS.md`);
