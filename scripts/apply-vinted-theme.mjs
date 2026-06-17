/**
 * Egységes Vinted-sötét paletta — világos Tailwind osztályok cseréje.
 * Futtatás: node scripts/apply-vinted-theme.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(import.meta.dirname, '..', 'src');
const SKIP_DIRS = new Set(['node_modules', '.next']);

/** Hosszabb minták előbb — opacity variánsok. */
const REPLACEMENTS = [
  ['bg-white/95', 'bg-[#11171a]/95'],
  ['bg-white/90', 'bg-[#11171a]/90'],
  ['bg-white/80', 'bg-[#141d21]/90'],
  ['bg-white/20', 'bg-[#e7edf0]/20'],
  ['bg-white/15', 'bg-[#e7edf0]/15'],
  ['bg-white/10', 'bg-[#e7edf0]/10'],
  ['hover:bg-gray-50', 'hover:bg-[#1f2a30]'],
  ['hover:bg-gray-100', 'hover:bg-[#243038]'],
  ['active:bg-gray-100', 'active:bg-[#243038]'],
  ['active:bg-white/15', 'active:bg-[#e7edf0]/15'],
  ['divide-gray-100', 'divide-[#2a3941]'],
  ['divide-gray-200', 'divide-[#2a3941]'],
  ['border-gray-300', 'border-[#2a3941]'],
  ['border-gray-200', 'border-[#2a3941]'],
  ['border-gray-100', 'border-[#27363d]'],
  ['text-gray-900', 'text-[#e7edf0]'],
  ['text-gray-800', 'text-[#e7edf0]'],
  ['hover:text-gray-900', 'hover:text-[#e7edf0]'],
  ['hover:text-gray-800', 'hover:text-[#e7edf0]'],
  ['text-gray-700', 'text-[#b2c0c6]'],
  ['text-gray-600', 'text-[#8fa3ad]'],
  ['text-gray-500', 'text-[#8fa3ad]'],
  ['text-gray-400', 'text-[#6b7d85]'],
  ['bg-gray-50', 'bg-[#141d21]'],
  ['bg-gray-100', 'bg-[#1a2328]'],
  ['bg-white', 'bg-[#1a2328]'],
];

function walk(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (!SKIP_DIRS.has(name)) walk(full, files);
    } else if (/\.(tsx|ts|css)$/.test(name)) {
      files.push(full);
    }
  }
  return files;
}

let totalFiles = 0;
let totalReplacements = 0;

for (const file of walk(ROOT)) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = 0;
  for (const [from, to] of REPLACEMENTS) {
    const parts = content.split(from);
    if (parts.length > 1) {
      changed += parts.length - 1;
      content = parts.join(to);
    }
  }
  if (changed > 0) {
    fs.writeFileSync(file, content, 'utf8');
    totalFiles += 1;
    totalReplacements += changed;
    console.log(`${path.relative(ROOT, file)}: ${changed}`);
  }
}

console.log(`\nDone: ${totalReplacements} replacements in ${totalFiles} files.`);
