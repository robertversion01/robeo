/**
 * Második pass — pasztell alert/success háttér → sötét Vinted variáns.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(import.meta.dirname, '..', 'src');

const REPLACEMENTS = [
  ['bg-amber-50/90', 'bg-amber-950/35'],
  ['bg-amber-50/80', 'bg-amber-950/35'],
  ['bg-amber-50/60', 'bg-amber-950/35'],
  ['bg-amber-50/50', 'bg-amber-950/30'],
  ['bg-amber-50', 'bg-amber-950/40'],
  ['border-amber-400/30', 'border-amber-700/40'],
  ['border-amber-300', 'border-amber-900/45'],
  ['border-amber-200/80', 'border-amber-900/40'],
  ['border-amber-200', 'border-amber-900/45'],
  ['text-amber-950', 'text-amber-200'],
  ['text-amber-900', 'text-amber-200'],
  ['text-amber-800', 'text-amber-300'],
  ['text-amber-700', 'text-amber-300'],
  ['hover:bg-amber-100', 'hover:bg-amber-950/50'],

  ['bg-emerald-50/80', 'bg-emerald-950/35'],
  ['bg-emerald-50/60', 'bg-emerald-950/35'],
  ['border-emerald-500/30', 'border-emerald-700/45'],
  ['border-emerald-300', 'border-emerald-900/45'],
  ['border-emerald-200/80', 'border-emerald-900/40'],
  ['border-emerald-200', 'border-emerald-900/45'],
  ['text-emerald-900', 'text-emerald-200'],
  ['text-emerald-800', 'text-emerald-300'],
  ['text-emerald-700', 'text-emerald-300'],

  ['bg-red-50/90', 'bg-red-950/35'],
  ['bg-red-50/80', 'bg-red-950/35'],
  ['bg-red-50/60', 'bg-red-950/35'],
  ['bg-red-50', 'bg-red-950/40'],
  ['border-red-200', 'border-red-900/45'],
  ['hover:bg-red-50', 'hover:bg-red-950/35'],
  ['hover:bg-red-100', 'hover:bg-red-950/50'],
  ['text-red-700', 'text-red-300'],

  ['bg-violet-50/90', 'bg-violet-950/30'],
  ['border-violet-200/80', 'border-violet-900/40'],
  ['border-violet-100', 'border-violet-900/35'],

  ['from-white', 'from-[#141d21]'],
  ['via-white', 'via-[#1a2328]'],
  ['to-white', 'to-[#141d21]'],
  ['to-amber-50/40', 'to-amber-950/20'],
  ['to-amber-50/50', 'to-amber-950/20'],

  ['text-gray-300', 'text-[#6b7d85]'],
  ['text-gray-200', 'text-[#b2c0c6]'],
  ['hover:border-gray-400', 'hover:border-[#3d4f58]'],
];

function walk(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) {
      if (name !== 'node_modules') walk(full, files);
    } else if (/\.(tsx|ts)$/.test(name)) {
      files.push(full);
    }
  }
  return files;
}

let total = 0;
for (const file of walk(ROOT)) {
  let content = fs.readFileSync(file, 'utf8');
  let n = 0;
  for (const [from, to] of REPLACEMENTS) {
    const parts = content.split(from);
    if (parts.length > 1) {
      n += parts.length - 1;
      content = parts.join(to);
    }
  }
  if (n > 0) {
    fs.writeFileSync(file, content, 'utf8');
    total += n;
  }
}
console.log(`Pass 2: ${total} replacements.`);
