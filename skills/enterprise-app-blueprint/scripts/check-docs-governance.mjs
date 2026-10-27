#!/usr/bin/env node
// Validador de gobierno documental para repositorios estilo SICRE (Node.js >= 18, cero dependencias).
// Comprueba:
//   1. Existencia y concisión de AGENTS.md en la raíz (evita que vuelva a inflarse como enciclopedia).
//   2. Existencia de docs/AGENTS.md y de las subcarpetas requeridas.
//   3. Prohibición estricta de archivos .md sueltos en la raíz de docs/ (salvo docs/AGENTS.md).
//   4. Integridad de todos los enlaces relativos Markdown en AGENTS.md, DESIGN.md y docs/**/*.md.
//   5. Formato numerado correlativo `### YYYY-MM-DD (N)` en docs/historial/changelog.md.
//
// Uso:
//   node check-docs-governance.mjs [--root .] [--max-agents-lines 160]

import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const args = { root: process.cwd(), maxAgentsLines: 160 };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--root' && argv[i + 1]) args.root = argv[++i];
    else if (argv[i] === '--max-agents-lines' && argv[i + 1]) args.maxAgentsLines = Number(argv[++i]);
    else if (argv[i] === '--help' || argv[i] === '-h') {
      console.log('Uso: node check-docs-governance.mjs [--root .] [--max-agents-lines 160]');
      process.exit(0);
    }
  }
  return args;
}

const REQUIRED_DOCS_DIRS = [
  'arquitectura',
  'reglas',
  'estandares',
  'operacion',
  'historial'
];

function walkMarkdown(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'evidencias' || entry.name === 'node_modules' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkMarkdown(full, acc);
    else if (entry.name.endsWith('.md')) acc.push(full);
  }
  return acc;
}

function checkRelativeLinks(mdFile, rootDir, violations) {
  const relSource = path.relative(rootDir, mdFile).split(path.sep).join('/');
  // changelog.md es registro histórico congelado: sus entradas pasadas no se reescriben tras reorganizar archivos
  if (relSource === 'docs/historial/changelog.md') return;

  const content = fs.readFileSync(mdFile, 'utf8');
  // Ignorar bloques de código cercados e inline code para no validar ejemplos ficticios
  const stripped = content.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]+`/g, '');
  const linkRx = /\[[^\]]+\]\((?!https?:\/\/|mailto:|#|file:\/\/)([^)#\s]+)(?:#[^)]+)?\)/g;
  for (const match of stripped.matchAll(linkRx)) {
    const targetRel = match[1];
    // Las evidencias visuales locales están deliberadamente en .gitignore
    if (/(?:^|\/)evidencias\//.test(targetRel)) continue;
    const resolved = path.resolve(path.dirname(mdFile), targetRel);
    if (!fs.existsSync(resolved)) {
      violations.push(`[broken-doc-link] ${relSource} -> enlace roto '${targetRel}'`);
    }
  }
}

function validateChangelog(changelogPath, violations) {
  const lines = fs.readFileSync(changelogPath, 'utf8').split(/\r?\n/);
  const entryRx = /^###\s+(\d{4}-\d{2}-\d{2})(?:\s+\((\d+)\))?\s*$/;
  const headings = [];

  lines.forEach((line, idx) => {
    if (line.startsWith('### ')) {
      const m = line.match(entryRx);
      if (!m) {
        violations.push(
          `[changelog-heading] docs/historial/changelog.md:${idx + 1} -> Encabezado inválido '${line.trim()}'. Usa '### AAAA-MM-DD (N)'.`
        );
      } else {
        headings.push({ n: m[2] ? Number(m[2]) : null, lineNo: idx + 1, raw: line.trim() });
      }
    }
  });

  if (headings.length === 0) {
    violations.push('[changelog-empty] docs/historial/changelog.md -> Debe contener al menos una entrada ### AAAA-MM-DD (1).');
    return;
  }

  const latest = headings[0];
  if (latest.n === null) {
    violations.push(
      `[changelog-latest-unnumbered] docs/historial/changelog.md:${latest.lineNo} -> La entrada más reciente '${latest.raw}' debe incluir su número correlativo '### AAAA-MM-DD (N)'.`
    );
  } else if (headings.length > 1 && headings[1].n !== null && latest.n !== headings[1].n + 1) {
    violations.push(
      `[changelog-sequence] docs/historial/changelog.md:${latest.lineNo} -> La entrada superior (${latest.n}) debe ser exactamente la siguiente a (${headings[1].n}).`
    );
  }
}

function main() {
  const args = parseArgs(process.argv);
  const rootDir = path.resolve(args.root);
  const violations = [];

  const rootAgents = path.join(rootDir, 'AGENTS.md');
  if (!fs.existsSync(rootAgents)) {
    violations.push('[missing-root-agents] Falta AGENTS.md en la raíz del proyecto.');
  } else {
    const lineCount = fs.readFileSync(rootAgents, 'utf8').split(/\r?\n/).length;
    if (lineCount > args.maxAgentsLines) {
      violations.push(
        `[agents-bloated] AGENTS.md tiene ${lineCount} líneas (máx. ${args.maxAgentsLines}). Mueve el detalle normativo a docs/reglas/ o docs/estandares/.`
      );
    }
  }

  const docsDir = path.join(rootDir, 'docs');
  const docsAgents = path.join(docsDir, 'AGENTS.md');
  if (!fs.existsSync(docsAgents)) {
    violations.push('[missing-docs-agents] Falta docs/AGENTS.md para gobernar la organización de docs/.');
  }

  if (fs.existsSync(docsDir)) {
    for (const entry of fs.readdirSync(docsDir, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'AGENTS.md') {
        violations.push(
          `[loose-doc-in-root] docs/${entry.name} -> Prohibido dejar documentos .md sueltos en la raíz de docs/; ubícalo en su subcarpeta canónica.`
        );
      }
    }

    for (const reqSub of REQUIRED_DOCS_DIRS) {
      if (!fs.existsSync(path.join(docsDir, reqSub))) {
        violations.push(`[missing-docs-subdir] Falta la subcarpeta obligatoria docs/${reqSub}/.`);
      }
    }
  }

  const changelogPath = path.join(docsDir, 'historial', 'changelog.md');
  if (!fs.existsSync(changelogPath)) {
    violations.push('[missing-changelog] Falta docs/historial/changelog.md.');
  } else {
    validateChangelog(changelogPath, violations);
  }

  const mdFilesToCheck = [];
  if (fs.existsSync(rootAgents)) mdFilesToCheck.push(rootAgents);
  const designMd = path.join(rootDir, 'DESIGN.md');
  if (fs.existsSync(designMd)) mdFilesToCheck.push(designMd);
  walkMarkdown(docsDir, mdFilesToCheck);

  for (const md of mdFilesToCheck) {
    checkRelativeLinks(md, rootDir, violations);
  }

  if (violations.length > 0) {
    console.error(`Se detectaron ${violations.length} incumplimientos de gobierno documental:\n`);
    for (const v of violations) console.error(`  ✗ ${v}`);
    process.exit(1);
  }

  console.log(`✓ Gobierno documental (AGENTS.md, docs/ y changelog.md) verificado sin errores (${mdFilesToCheck.length} documentos inspeccionados).`);
}

main();
