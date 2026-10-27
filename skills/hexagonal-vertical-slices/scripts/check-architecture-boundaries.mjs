#!/usr/bin/env node
/**
 * Validador universal y agnóstico de fronteras arquitectónicas (Hexagonal + Vertical Slices).
 * Sin dependencias externas (Node.js >= 18). Soporta JS/TS, Python, Go, C#, Java/Kotlin y Rust.
 *
 * Uso:
 *   node check-architecture-boundaries.mjs --config ./boundaries.config.json [--root .]
 */

import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const args = { config: 'boundaries.config.json', root: process.cwd() };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--config' && argv[i + 1]) args.config = argv[++i];
    else if (argv[i] === '--root' && argv[i + 1]) args.root = argv[++i];
    else if (argv[i] === '--help' || argv[i] === '-h') {
      console.log('Uso: node check-architecture-boundaries.mjs --config <archivo.json> [--root <directorio>]');
      process.exit(0);
    }
  }
  return args;
}

const DEFAULT_CONFIG = {
  scanRoots: ['src'],
  extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py', '.go', '.cs', '.java', '.kt', '.rs'],
  ignorePatterns: [
    '\\.spec\\.',
    '\\.test\\.',
    '_test\\.go$',
    'Tests?\\.cs$',
    '/node_modules/',
    '/dist/',
    '/build/',
    '/bin/',
    '/obj/',
    '/target/'
  ],
  featuresSegment: '/features/',
  coreSegments: ['/core/', '/common/'],
  compositionSegments: ['/composition/'],
  layers: ['domain', 'application', 'infrastructure', 'ui', 'api'],
  allowedUiInfrastructureRegex: '(?:^|/|\\.)composition(?:/|\\.)[^/]+tokens',
  featureImportPrefixes: ['@features/', '@app/features/', 'features/', 'features.'],
  compositionImportPrefixes: ['@app/composition/', 'composition/', 'composition.'],
  forbidDeepRelativeImports: true,
  forbidLateImportsInJsTs: true
};

function toPosix(p) {
  return p.split(path.sep).join('/');
}

function walkFiles(dir, extensions, ignoreRegexes, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const posix = toPosix(full);
    if (ignoreRegexes.some((rx) => rx.test(posix))) continue;
    if (entry.isDirectory()) {
      walkFiles(full, extensions, ignoreRegexes, acc);
    } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
      acc.push(full);
    }
  }
  return acc;
}

function stripCommentsKeepLines(content, ext) {
  let cleaned = content;
  if (ext === '.py') {
    cleaned = cleaned.replace(/^[ \t]*#.*$/gm, (m) => ' '.repeat(m.length));
  } else {
    cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
    cleaned = cleaned.replace(/^[ \t]*\/\/.*$/gm, (m) => ' '.repeat(m.length));
  }
  return cleaned;
}

function lineNumberAt(text, index) {
  let line = 1;
  for (let i = 0; i < index; i++) {
    if (text.charCodeAt(i) === 10) line++;
  }
  return line;
}

function extractImports(rawContent, ext) {
  const cleaned = stripCommentsKeepLines(rawContent, ext);
  const results = [];

  if (['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'].includes(ext)) {
    const staticRx = /\b(?:import|export)\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g;
    const dynamicRx = /\b(?:import|require)\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    for (const m of cleaned.matchAll(staticRx)) {
      results.push({ specifier: m[1], line: lineNumberAt(cleaned, m.index), kind: 'static', index: m.index });
    }
    for (const m of cleaned.matchAll(dynamicRx)) {
      results.push({ specifier: m[1], line: lineNumberAt(cleaned, m.index), kind: 'dynamic', index: m.index });
    }
  } else if (ext === '.py') {
    const pyRx = /^[ \t]*(?:from\s+([A-Za-z0-9_.]+)\s+import|import\s+([A-Za-z0-9_.]+))/gm;
    for (const m of cleaned.matchAll(pyRx)) {
      results.push({ specifier: m[1] || m[2], line: lineNumberAt(cleaned, m.index), kind: 'static', index: m.index });
    }
  } else if (ext === '.cs') {
    const csRx = /^[ \t]*using\s+(?:static\s+)?(?:[A-Za-z0-9_]+\s*=\s*)?([A-Za-z0-9_.]+)\s*;/gm;
    for (const m of cleaned.matchAll(csRx)) {
      results.push({ specifier: m[1], line: lineNumberAt(cleaned, m.index), kind: 'static', index: m.index });
    }
  } else if (ext === '.java' || ext === '.kt') {
    const jvmRx = /^[ \t]*import\s+(?:static\s+)?([A-Za-z0-9_.*]+)\s*;?/gm;
    for (const m of cleaned.matchAll(jvmRx)) {
      results.push({ specifier: m[1], line: lineNumberAt(cleaned, m.index), kind: 'static', index: m.index });
    }
  } else if (ext === '.go') {
    const singleRx = /\bimport\s+"([^"]+)"/g;
    const blockRx = /\bimport\s*\(([\s\S]*?)\)/g;
    for (const m of cleaned.matchAll(singleRx)) {
      results.push({ specifier: m[1], line: lineNumberAt(cleaned, m.index), kind: 'static', index: m.index });
    }
    for (const block of cleaned.matchAll(blockRx)) {
      const strRx = /"([^"]+)"/g;
      for (const s of block[1].matchAll(strRx)) {
        results.push({
          specifier: s[1],
          line: lineNumberAt(cleaned, block.index + s.index),
          kind: 'static',
          index: block.index + s.index
        });
      }
    }
  } else if (ext === '.rs') {
    const rsRx = /^[ \t]*use\s+([A-Za-z0-9_:{}*,\s]+);/gm;
    for (const m of cleaned.matchAll(rsRx)) {
      results.push({ specifier: m[1].trim(), line: lineNumberAt(cleaned, m.index), kind: 'static', index: m.index });
    }
  }

  return { cleaned, imports: results };
}

function detectFileContext(posixFile, cfg) {
  const escapedFeatures = cfg.featuresSegment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const featureMatch = posixFile.match(new RegExp(`${escapedFeatures}([^/]+)(?:/([^/]+))?/`));
  const feature = featureMatch ? featureMatch[1] : null;
  const candidateLayer = featureMatch && featureMatch[2] ? featureMatch[2].toLowerCase() : null;
  let layer = candidateLayer && cfg.layers.includes(candidateLayer) ? candidateLayer : null;

  if (!layer) {
    for (const l of cfg.layers) {
      if (new RegExp(`/${l}/`, 'i').test(posixFile)) {
        layer = l;
        break;
      }
    }
  }

  const inCore = cfg.coreSegments.some((seg) => posixFile.toLowerCase().includes(seg.toLowerCase()));
  return { feature, layer, inCore };
}

function normalizeSpecifierToPath(specifier) {
  if (specifier.includes('/')) return specifier;
  return specifier.replace(/::/g, '/').replace(/\./g, '/');
}

function parseTargetFromSpecifier(specifier, cfg) {
  for (const prefix of cfg.featureImportPrefixes) {
    if (specifier.startsWith(prefix)) {
      const rest = normalizeSpecifierToPath(specifier.slice(prefix.length));
      const parts = rest.split('/').filter(Boolean);
      const feature = parts[0] || null;
      const maybeLayer = parts[1] ? parts[1].toLowerCase() : null;
      const layer = maybeLayer && cfg.layers.includes(maybeLayer) ? maybeLayer : null;
      const remainder = layer ? parts.slice(2).join('/') : parts.slice(1).join('/');
      return { feature, layer, remainder };
    }
  }

  const norm = '/' + normalizeSpecifierToPath(specifier);
  const featIdx = norm.toLowerCase().indexOf(cfg.featuresSegment.toLowerCase());
  if (featIdx !== -1) {
    const after = norm.slice(featIdx + cfg.featuresSegment.length);
    const parts = after.split('/').filter(Boolean);
    const feature = parts[0] || null;
    const maybeLayer = parts[1] ? parts[1].toLowerCase() : null;
    const layer = maybeLayer && cfg.layers.includes(maybeLayer) ? maybeLayer : null;
    const remainder = layer ? parts.slice(2).join('/') : parts.slice(1).join('/');
    return { feature, layer, remainder };
  }

  for (const l of cfg.layers) {
    if (new RegExp(`(?:^|/)${l}(?:/|$)`, 'i').test(norm)) {
      return { feature: null, layer: l, remainder: norm };
    }
  }

  return { feature: null, layer: null, remainder: '' };
}

function checkLateJsTsImports(cleaned, ext, relFile, errors) {
  if (!['.ts', '.tsx', '.js', '.jsx', '.mjs'].includes(ext)) return;
  const lines = cleaned.split('\n');
  let seenCode = false;
  let inMultilineImport = false;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;

    if (inMultilineImport) {
      if (/from\s+['"][^'"]+['"]\s*;?$/.test(trimmed) || trimmed.endsWith(';')) {
        inMultilineImport = false;
      }
      continue;
    }

    if (/^import\b/.test(trimmed) && !/^import\s*\(/.test(trimmed)) {
      if (seenCode) {
        errors.push(`[late-import] ${relFile}:${i + 1} — Todos los imports estáticos deben ubicarse en la cabecera del archivo.`);
      }
      if (!/['"][^'"]+['"]/.test(trimmed)) {
        inMultilineImport = true;
      }
    } else if (!/^['"]use strict['"]/.test(trimmed)) {
      seenCode = true;
    }
  }
}

function main() {
  const args = parseArgs(process.argv);
  const rootDir = path.resolve(args.root);
  const configPath = path.resolve(rootDir, args.config);

  let userCfg = {};
  if (fs.existsSync(configPath)) {
    userCfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
  const cfg = { ...DEFAULT_CONFIG, ...userCfg };
  const ignoreRegexes = cfg.ignorePatterns.map((p) => new RegExp(p));
  const allowedUiInfraRx = new RegExp(cfg.allowedUiInfrastructureRegex);

  const files = [];
  for (const scanRoot of cfg.scanRoots) {
    walkFiles(path.resolve(rootDir, scanRoot), cfg.extensions, ignoreRegexes, files);
  }

  const errors = [];

  for (const file of files) {
    const posixFile = toPosix(file);
    const relFile = toPosix(path.relative(rootDir, file));
    const ext = path.extname(file);
    const raw = fs.readFileSync(file, 'utf8');
    const { cleaned, imports } = extractImports(raw, ext);
    const ctx = detectFileContext(posixFile, cfg);

    if (cfg.forbidLateImportsInJsTs) {
      checkLateJsTsImports(cleaned, ext, relFile, errors);
    }

    for (const imp of imports) {
      const spec = imp.specifier;

      if (
        cfg.forbidDeepRelativeImports &&
        ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'].includes(ext) &&
        (spec.startsWith('../') || /^\.\/[^/]+\//.test(spec))
      ) {
        errors.push(
          `[relative-import] ${relFile}:${imp.line} — Import relativo "${spec}" no permitido entre carpetas; usa alias de módulo y reserva "./sibling" al mismo directorio.`
        );
      }

      if (
        (ctx.inCore || ctx.feature) &&
        cfg.compositionImportPrefixes.some((p) => spec.startsWith(p))
      ) {
        errors.push(
          `[composition-leak] ${relFile}:${imp.line} — La raíz de composición ("${spec}") no puede importarse desde core/common ni desde features.`
        );
      }

      const target = parseTargetFromSpecifier(spec, cfg);

      if (ctx.inCore && target.feature) {
        errors.push(
          `[core-to-feature] ${relFile}:${imp.line} — El kernel compartido (core/common) no puede importar la feature "${target.feature}" ("${spec}").`
        );
      }

      if (ctx.feature && target.feature && ctx.feature !== target.feature) {
        errors.push(
          `[cross-feature] ${relFile}:${imp.line} — La feature "${ctx.feature}" no puede importar otra feature "${target.feature}" ("${spec}").`
        );
      }

      const sameScopeOrLayerCheck = !target.feature || target.feature === ctx.feature;
      if (ctx.layer && target.layer && sameScopeOrLayerCheck) {
        if (ctx.layer === 'domain' && target.layer !== 'domain') {
          errors.push(
            `[domain-isolation] ${relFile}:${imp.line} — La capa domain no puede depender de "${target.layer}" ("${spec}").`
          );
        } else if (
          ctx.layer === 'application' &&
          ['infrastructure', 'ui', 'api'].includes(target.layer)
        ) {
          errors.push(
            `[application-isolation] ${relFile}:${imp.line} — La capa application no puede depender de "${target.layer}" ("${spec}").`
          );
        } else if (
          ctx.layer === 'ui' &&
          target.layer === 'infrastructure' &&
          !allowedUiInfraRx.test(target.remainder || spec)
        ) {
          errors.push(
            `[ui-to-adapter] ${relFile}:${imp.line} — La capa ui no puede importar adaptadores concretos de infrastructure ("${spec}"); inyecta únicamente tokens de composición y casos de uso.`
          );
        }
      }
    }
  }

  if (errors.length > 0) {
    console.error(`Se detectaron ${errors.length} violaciones de fronteras arquitectónicas:\n`);
    for (const err of errors) console.error(`  ✗ ${err}`);
    process.exit(1);
  }

  console.log(`✓ Fronteras arquitectónicas verificadas sin violaciones (${files.length} archivos inspeccionados).`);
}

main();
