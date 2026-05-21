/**
 * Next.js 16.2.x: /_global-error static prerender workStore hiba (vercel/next.js#87719).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const PATCHES = [
  {
    file: 'node_modules/next/dist/server/request/search-params.js',
    old: `function createPrerenderSearchParamsForClientPage() {
    const workStore = _workasyncstorageexternal.workAsyncStorage.getStore();
    if (!workStore) {
        throw Object.defineProperty(new _invarianterror.InvariantError('Expected workStore to be initialized'), "__NEXT_ERROR_CODE", {
            value: "E1068",
            enumerable: false,
            configurable: true
        });
    }`,
    neu: `function createPrerenderSearchParamsForClientPage() {
    const workStore = _workasyncstorageexternal.workAsyncStorage.getStore();
    if (!workStore) {
        return Promise.resolve({});
    }`,
  },
  {
    file: 'node_modules/next/dist/server/request/params.js',
    old: `function createPrerenderParamsForClientSegment(underlyingParams) {
    const workStore = _workasyncstorageexternal.workAsyncStorage.getStore();
    if (!workStore) {
        throw Object.defineProperty(new _invarianterror.InvariantError('Missing workStore in createPrerenderParamsForClientSegment'), "__NEXT_ERROR_CODE", {
            value: "E773",
            enumerable: false,
            configurable: true
        });
    }`,
    neu: `function createPrerenderParamsForClientSegment(underlyingParams) {
    const workStore = _workasyncstorageexternal.workAsyncStorage.getStore();
    if (!workStore) {
        return Promise.resolve(underlyingParams);
    }`,
  },
  {
    file: 'node_modules/next/dist/server/request/pathname.js',
    old: `function createServerPathnameForMetadata(underlyingPathname) {
    const workStore = _workasyncstorageexternal.workAsyncStorage.getStore();
    if (!workStore) {
        throw Object.defineProperty(new _invarianterror.InvariantError('Expected workStore to be initialized'), "__NEXT_ERROR_CODE", {
            value: "E1068",
            enumerable: false,
            configurable: true
        });
    }`,
    neu: `function createServerPathnameForMetadata(underlyingPathname) {
    const workStore = _workasyncstorageexternal.workAsyncStorage.getStore();
    if (!workStore) {
        return Promise.resolve(underlyingPathname);
    }`,
  },
];

let ok = 0;
for (const { file, old, neu } of PATCHES) {
  const abs = path.join(root, file);
  if (!fs.existsSync(abs)) {
    console.warn('[patch-next-workstore] missing', file);
    continue;
  }
  const src = fs.readFileSync(abs, 'utf8');
  if (src.includes(neu)) {
    console.log('[patch-next-workstore] ok', file);
    ok += 1;
    continue;
  }
  if (!src.includes(old)) {
    console.warn('[patch-next-workstore] pattern mismatch', file);
    continue;
  }
  fs.writeFileSync(abs, src.replace(old, neu));
  console.log('[patch-next-workstore] patched', file);
  ok += 1;
}

if (ok < PATCHES.length) {
  console.warn(`[patch-next-workstore] only ${ok}/${PATCHES.length} files ready (postinstall continues)`);
}
