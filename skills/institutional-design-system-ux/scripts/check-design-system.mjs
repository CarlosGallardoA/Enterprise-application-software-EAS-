#!/usr/bin/env node
// Validador estático del Sistema de Diseño e Internacionalización (Node.js >= 18, cero dependencias).
// Verifica:
//   1. [no-hex-color]         Cero colores hex literales fuera del archivo de tokens.
//   2. [no-primitive-token]   Cero consumo directo de primitivos (--brand-*) fuera del archivo de tokens.
//   3. [no-transition-all]    Prohibido `transition: all`.
//   4. [focus-visible-parity] Prohibido `outline: none` / `outline: 0` sin indicador `:focus-visible` o `:focus-within`.
//   5. [no-hardcoded-ui-text] Detecta textos literales sin traducir en plantillas HTML (opcional con --skip-i18n).
//   6. [unused-allow-marker]  Falla si un comentario `design-system-allow` ya no suprime ninguna regla real.
//
// Excepciones auditables junto al código:
//   CSS/JS: /* design-system-allow: <check> — razón técnica */
//   HTML:   <!-- design-system-allow: <check> — razón técnica -->
//   Archivo completo: design-system-allow-file: <check> — razón técnica
//
// Uso:
//   node check-design-system.mjs --root . --styles src/styles --app src/app --tokens src/styles/tokens.css

import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const args = {
    root: process.cwd(),
    styles: 'src/styles',
    app: 'src/app',
    tokens: 'src/styles/tokens.css',
    primitivePrefix: '--brand-',
    skipI18n: false,
    allowedLiterals: ['ID', 'Esc', 'OK', 'PDF', 'CSV', 'JSON', 'UTC']
  };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--root' && argv[i + 1]) args.root = argv[++i];
    else if (argv[i] === '--styles' && argv[i + 1]) args.styles = argv[++i];
    else if (argv[i] === '--app' && argv[i + 1]) args.app = argv[++i];
    else if (argv[i] === '--tokens' && argv[i + 1]) args.tokens = argv[++i];
    else if (argv[i] === '--primitive-prefix' && argv[i + 1]) args.primitivePrefix = argv[++i];
    else if (argv[i] === '--skip-i18n') args.skipI18n = true;
    else if (argv[i] === '--allow-literals' && argv[i + 1]) {
      args.allowedLiterals.push(...argv[++i].split(',').map((s) => s.trim()));
    } else if (argv[i] === '--help' || argv[i] === '-h') {
      console.log(
        'Uso: node check-design-system.mjs [--root .] [--styles src/styles] [--app src/app] [--tokens src/styles/tokens.css] [--primitive-prefix --brand-] [--skip-i18n]'
      );
      process.exit(0);
    }
  }
  return args;
}

const MARKER_RX = /design-system-allow(-file)?:\s*([\w-]+)\s*(?:—|--|:)\s*\S+/g;

function toPosix(p) {
  return p.split(path.sep).join('/');
}

function walk(dir, pred, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', 'dist', 'build', '.git', 'coverage'].includes(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, pred, acc);
    else if (pred(full)) acc.push(full);
  }
  return acc;
}

function stripBlockCommentsPreserveLines(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
}

function stripCodeCommentsPreserveLines(text) {
  return stripBlockCommentsPreserveLines(text).replace(/^[ \t]*\/\/.*$/gm, (m) => ' '.repeat(m.length));
}

function lineAt(text, index) {
  let l = 1;
  for (let i = 0; i < index; i++) {
    if (text.charCodeAt(i) === 10) l++;
  }
  return l;
}

function main() {
  const args = parseArgs(process.argv);
  const rootDir = path.resolve(args.root);
  const stylesRoot = path.resolve(rootDir, args.styles);
  const appRoot = path.resolve(rootDir, args.app);
  const tokensFile = path.resolve(rootDir, args.tokens);
  const allowedSet = new Set(args.allowedLiterals);

  const lineMarkers = new Map();
  const fileMarkers = new Map();
  const rawCache = new Map();
  const errors = [];

  function relPath(file) {
    return toPosix(path.relative(rootDir, file));
  }

  function loadFile(file) {
    if (rawCache.has(file)) return rawCache.get(file);
    const raw = fs.readFileSync(file, 'utf8');
    const lines = raw.split('\n');
    lines.forEach((txt, idx) => {
      for (const m of txt.matchAll(MARKER_RX)) {
        const entry = { rel: relPath(file), line: idx + 1, check: m[2], used: false };
        if (m[1]) fileMarkers.set(`${file}:${m[2]}`, entry);
        else lineMarkers.set(`${file}:${idx + 1}:${m[2]}`, entry);
      }
    });
    rawCache.set(file, raw);
    return raw;
  }

  function isAllowed(file, check, line, startLine = line) {
    const fm = fileMarkers.get(`${file}:${check}`);
    if (fm) {
      fm.used = true;
      return true;
    }
    for (let c = line; c >= Math.max(1, startLine - 1); c--) {
      const lm = lineMarkers.get(`${file}:${c}:${check}`);
      if (lm) {
        lm.used = true;
        return true;
      }
    }
    return false;
  }

  function report(file, check, line, msg, startLine = line) {
    if (isAllowed(file, check, line, startLine)) return;
    errors.push(`[${check}] ${relPath(file)}:${line} — ${msg}`);
  }

  const scanRoots = [stylesRoot, appRoot].filter((d, idx, arr) => arr.indexOf(d) === idx && fs.existsSync(d));
  const cssFiles = [];
  const htmlFiles = [];
  const prodCodeFiles = [];

  for (const r of scanRoots) {
    walk(r, (f) => f.endsWith('.css'), cssFiles);
    walk(r, (f) => f.endsWith('.html'), htmlFiles);
    walk(
      r,
      (f) =>
        (f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.js') || f.endsWith('.jsx')) &&
        !/\.(spec|test)\.[^.]+$/.test(f),
      prodCodeFiles
    );
  }

  const hexRx = /#[0-9a-fA-F]{3,8}\b/g;
  const escapedPrefix = args.primitivePrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const primRx = new RegExp(`var\\(\\s*(${escapedPrefix}[\\w-]+)`, 'g');

  // 1 & 2 & 3 & 4 en CSS
  for (const file of cssFiles) {
    const raw = loadFile(file);
    const cleaned = stripBlockCommentsPreserveLines(raw);
    const isTokens = path.resolve(file) === tokensFile;

    if (!isTokens) {
      for (const m of cleaned.matchAll(hexRx)) {
        // Ignorar selectores de ID en CSS verificando contexto previo inmediato (ej. : , ; ( espacio tras :)
        const before = cleaned.slice(Math.max(0, m.index - 30), m.index);
        if (/[:,\s(]$/.test(before) && /:\s*[^;{]*$/.test(before)) {
          report(file, 'no-hex-color', lineAt(cleaned, m.index), `Color hex literal "${m[0]}" fuera de tokens. Usa un token semántico --color-*.`);
        }
      }
      for (const m of cleaned.matchAll(primRx)) {
        report(
          file,
          'no-primitive-token',
          lineAt(cleaned, m.index),
          `Token primitivo "${m[1]}" usado fuera de tokens. Consume únicamente la capa semántica.`
        );
      }
    }

    for (const m of cleaned.matchAll(/transition\s*:\s*all\b/g)) {
      report(
        file,
        'no-transition-all',
        lineAt(cleaned, m.index),
        'Prohibido "transition: all"; especifica únicamente las propiedades animadas y usa tokens.'
      );
    }

    const outlineRx = /outline\s*:\s*(?:none|0)\b/g;
    const hasFocusReplacement = /:focus-visible\b|:focus-within\b|--focus-ring/.test(cleaned);
    for (const m of cleaned.matchAll(outlineRx)) {
      if (!hasFocusReplacement) {
        report(
          file,
          'focus-visible-parity',
          lineAt(cleaned, m.index),
          '"outline: none" sin regla :focus-visible/:focus-within ni --focus-ring equivalente en la hoja.'
        );
      }
    }
  }

  // Hex y primitivos en HTML y TS/JS de producción
  for (const file of [...htmlFiles, ...prodCodeFiles]) {
    const raw = loadFile(file);
    const cleaned = file.endsWith('.html')
      ? raw.replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '))
      : stripCodeCommentsPreserveLines(raw);

    for (const m of cleaned.matchAll(primRx)) {
      report(file, 'no-primitive-token', lineAt(cleaned, m.index), `Token primitivo "${m[1]}" usado en componente.`);
    }

    const styleHexRx = /(?:color|background|border|fill|stroke)\s*[:=]\s*['"]?(#[0-9a-fA-F]{3,8})\b/gi;
    for (const m of cleaned.matchAll(styleHexRx)) {
      report(file, 'no-hex-color', lineAt(cleaned, m.index), `Color hex literal "${m[1]}" en código o plantilla; usa tokens semánticos.`);
    }
  }

  // 5. Texto literal sin traducir en plantillas HTML
  if (!args.skipI18n) {
    for (const file of htmlFiles) {
      const raw = loadFile(file);
      const cleaned = raw
        .replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '))
        .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, (m) => m.replace(/[^\n]/g, ' '));

      // Interpolaciones con string literal: {{ 'Texto' }} (sin pipe de traducción)
      const interpRx = /\{\{\s*['"]([^'"]*[A-Za-zÁÉÍÓÚáéíóúÑñ]{2,}[^'"]*)['"]\s*\}\}/g;
      for (const m of cleaned.matchAll(interpRx)) {
        if (!allowedSet.has(m[1].trim())) {
          report(
            file,
            'no-hardcoded-ui-text',
            lineAt(cleaned, m.index),
            `Interpolación con texto literal "${m[1].trim()}"; usa clave de internacionalización.`
          );
        }
      }

      // Nodos de texto literal entre etiquetas >Texto< (excluyendo expresiones {{ ... }} y bloques @if/@for)
      const textNodeRx = />([^<>{}@]+)</g;
      for (const m of cleaned.matchAll(textNodeRx)) {
        const text = m[1].replace(/&\w+;|&#\d+;/g, ' ').trim();
        if (!text) continue;
        if (!/[A-Za-zÁÉÍÓÚáéíóúÑñ]{2,}/.test(text)) continue;
        if (allowedSet.has(text)) continue;
        const startLine = lineAt(cleaned, m.index);
        const textLine = lineAt(cleaned, m.index + m[0].indexOf(m[1]));
        report(
          file,
          'no-hardcoded-ui-text',
          textLine,
          `Texto visible sin traducir "${text.slice(0, 60)}"; usa el sistema de i18n.`,
          startLine
        );
      }
    }
  }

  // 6. Marcadores obsoletos que ya no suprimen nada
  for (const entry of [...lineMarkers.values(), ...fileMarkers.values()]) {
    if (!entry.used) {
      errors.push(
        `[unused-allow-marker] ${entry.rel}:${entry.line} — El marcador design-system-allow para "${entry.check}" no suprimió ninguna violación; elimínalo.`
      );
    }
  }

  if (errors.length > 0) {
    console.error(`Se detectaron ${errors.length} violaciones del sistema de diseño:\n`);
    for (const err of errors) console.error(`  ✗ ${err}`);
    process.exit(1);
  }

  console.log(
    `✓ Sistema de diseño verificado sin violaciones (${cssFiles.length} CSS, ${htmlFiles.length} HTML, ${prodCodeFiles.length} archivos de código).`
  );
}

main();
