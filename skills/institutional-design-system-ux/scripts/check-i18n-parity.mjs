#!/usr/bin/env node
// Validador de paridad de diccionarios i18n (Node.js soportado y parcheado, cero dependencias).
// Soporta simultáneamente diccionarios raíz (<dir>/es.json, <dir>/en.json) y scopes anidados
// (<dir>/<scope>/es.json, <dir>/<scope>/en.json).
//
// Comprueba:
//   1. Existencia de todos los idiomas requeridos en cada scope.
//   2. Sintaxis JSON válida.
//   3. Paridad exacta de árbol de claves entre idiomas (cero claves faltantes o huérfanas).
//   4. Ausencia de traducciones vacías o de solo espacios.
//   5. Paridad exacta de variables interpoladas (`{{param}}` y `{param}`).
//
// Uso:
//   node check-i18n-parity.mjs [--root .] [--i18n public/i18n] [--langs es,en]

import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const args = { root: process.cwd(), i18n: 'public/i18n', langs: ['es', 'en'] };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--root' && argv[i + 1]) args.root = argv[++i];
    else if (argv[i] === '--i18n' && argv[i + 1]) args.i18n = argv[++i];
    else if (argv[i] === '--langs' && argv[i + 1]) {
      args.langs = argv[++i]
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (argv[i] === '--help' || argv[i] === '-h') {
      console.log('Uso: node check-i18n-parity.mjs [--root .] [--i18n public/i18n] [--langs es,en]');
      process.exit(0);
    }
  }
  return args;
}

function collectScopeDirs(dir, langs, buckets = []) {
  if (!fs.existsSync(dir)) return buckets;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const hasAnyLangFile = entries.some((e) => e.isFile() && langs.some((l) => e.name === `${l}.json`));
  if (hasAnyLangFile) buckets.push(dir);

  for (const entry of entries) {
    if (entry.isDirectory()) collectScopeDirs(path.join(dir, entry.name), langs, buckets);
  }
  return buckets;
}

function flattenEntries(obj, prefix = '', out = new Map()) {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    out.set(prefix, obj);
    return out;
  }
  for (const [k, v] of Object.entries(obj)) {
    const nextKey = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      flattenEntries(v, nextKey, out);
    } else {
      out.set(nextKey, v);
    }
  }
  return out;
}

function extractPlaceholders(text) {
  const set = new Set();
  for (const m of text.matchAll(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}|\{\s*([a-zA-Z0-9_.-]+)\s*\}/g)) {
    set.add(m[1] ?? m[2]);
  }
  return [...set].sort();
}

function main() {
  const args = parseArgs(process.argv);
  const rootDir = path.resolve(args.root);
  const i18nDir = path.resolve(rootDir, args.i18n);

  if (!fs.existsSync(i18nDir)) {
    console.error(`✗ No existe el directorio i18n: ${i18nDir}`);
    process.exit(1);
  }
  if (args.langs.length < 2) {
    console.error('✗ Especifica al menos 2 idiomas en --langs (ej. es,en).');
    process.exit(1);
  }

  const buckets = collectScopeDirs(i18nDir, args.langs);
  if (buckets.length === 0) {
    console.error(`✗ No se encontraron archivos JSON para [${args.langs.join(', ')}] en ${i18nDir}`);
    process.exit(1);
  }

  const violations = [];
  const baseLang = args.langs[0];

  for (const bucketDir of buckets) {
    const relBucket = path.relative(rootDir, bucketDir).split(path.sep).join('/') || '.';
    const parsedByLang = new Map();

    for (const lang of args.langs) {
      const file = path.join(bucketDir, `${lang}.json`);
      const relFile = path.relative(rootDir, file).split(path.sep).join('/');
      if (!fs.existsSync(file)) {
        violations.push(`[missing-lang-file] ${relBucket} -> Falta el archivo '${lang}.json'.`);
        continue;
      }
      try {
        const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
        const flat = flattenEntries(raw);
        for (const [k, v] of flat.entries()) {
          if (typeof v === 'string' && v.trim().length === 0) {
            violations.push(`[empty-translation] ${relFile} -> La clave '${k}' está vacía.`);
          }
        }
        parsedByLang.set(lang, { relFile, flat });
      } catch (err) {
        violations.push(`[invalid-json] ${relFile} -> JSON inválido: ${err.message}`);
      }
    }

    const baseData = parsedByLang.get(baseLang);
    if (!baseData) continue;

    for (const lang of args.langs.slice(1)) {
      const targetData = parsedByLang.get(lang);
      if (!targetData) continue;

      for (const [key, baseVal] of baseData.flat.entries()) {
        if (!targetData.flat.has(key)) {
          violations.push(`[missing-i18n-key] ${targetData.relFile} -> Falta la clave '${key}' (definida en ${baseData.relFile}).`);
          continue;
        }
        const targetVal = targetData.flat.get(key);
        if (typeof baseVal !== typeof targetVal) {
          violations.push(`[type-mismatch] ${targetData.relFile} -> Tipo distinto en '${key}' respecto a ${baseLang}.`);
          continue;
        }
        if (typeof baseVal === 'string' && typeof targetVal === 'string') {
          const basePh = extractPlaceholders(baseVal);
          const targetPh = extractPlaceholders(targetVal);
          if (basePh.join(',') !== targetPh.join(',')) {
            violations.push(
              `[placeholder-mismatch] ${targetData.relFile} -> Variables distintas en '${key}': ${baseLang}=[${basePh.join(', ')}] vs ${lang}=[${targetPh.join(', ')}].`
            );
          }
        }
      }

      for (const key of targetData.flat.keys()) {
        if (!baseData.flat.has(key)) {
          violations.push(`[extra-i18n-key] ${targetData.relFile} -> Clave huérfana '${key}' no existe en ${baseData.relFile}.`);
        }
      }
    }
  }

  if (violations.length > 0) {
    console.error(`Se detectaron ${violations.length} errores de paridad i18n:\n`);
    for (const v of violations) console.error(`  ✗ ${v}`);
    process.exit(1);
  }

  console.log(`✓ Paridad i18n verificada en ${buckets.length} scopes para [${args.langs.join(', ')}].`);
}

main();
