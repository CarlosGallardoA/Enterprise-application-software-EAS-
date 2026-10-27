#!/usr/bin/env node
/**
 * Auditor ligero de higiene de código (agnóstico de lenguaje, Node.js soportado y parcheado, cero dependencias).
 * Detecta:
 *   1. Narrativa histórica/conversacional en comentarios ("hallazgo de revisión", "a pedido del usuario", etc.).
 *   2. Supresiones evasivas de compilador/linter sin justificación en la misma línea.
 *   3. Uso directo de relojes estáticos del sistema en código de producción.
 *   4. Bloques sospechosos de código comentado consecutivo.
 *   5. Pruebas deshabilitadas o saltadas (`skip`, `xit`, `Fact(Skip=...)`, `@Disabled`, `@pytest.mark.skip`) sin justificación explícita (prevención de Test Tampering).
 *
 * Uso:
 *   node audit-code-hygiene.mjs [--root .] [--scan src]
 */

import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const args = { root: process.cwd(), scan: ['src'] };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--root' && argv[i + 1]) args.root = argv[++i];
    else if (argv[i] === '--scan' && argv[i + 1]) args.scan = argv[++i].split(',').map((s) => s.trim());
    else if (argv[i] === '--help' || argv[i] === '-h') {
      console.log('Uso: node audit-code-hygiene.mjs [--root .] [--scan src,backend]');
      process.exit(0);
    }
  }
  return args;
}

const CODE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.cs', '.py', '.go', '.java', '.kt', '.rs'];
const IGNORE_DIRS = new Set(['node_modules', 'dist', 'build', 'bin', 'obj', 'target', '.git', '.venv', 'Migrations', 'migrations']);

const NARRATIVE_PATTERNS = [
  /hallazgo\s+de\s+(revisi[oó]n|auditor[ií]a)/i,
  /a\s+pedido\s+del\s+(usuario|cliente)/i,
  /bug\s+real\s+(reportado|corregido)/i,
  /\bver\s+change\s*log\b/i,
  /\bfixed\s+in\s+review\b/i,
  /\bper\s+user\s+request\b/i,
  /\bel\s+sistema\s+deber[aá]\b/i
];

const SUPPRESSION_PATTERNS = [
  /@ts-ignore\b/,
  /@ts-expect-error\b(?!.*—|.*--|:)/,
  /#pragma\s+warning\s+disable\b/,
  /\beslint-disable\b(?!.*—|.*--)/,
  /#\s*type:\s*ignore\b(?!\[)/,
  /@SuppressWarnings\b/
];

const SYSTEM_CLOCK_PATTERNS = [
  /\bDateTime\.UtcNow\b/,
  /\bDateTime\.Now\b/,
  /\bDateTimeOffset\.UtcNow\b/,
  /\bDateTimeOffset\.Now\b/,
  /\bDate\.now\s*\(/,
  /\bnew\s+Date\s*\(\s*\)/,
  /\bdatetime\.now\s*\(/,
  /\bdatetime\.utcnow\s*\(/,
  /\bInstant\.now\s*\(/,
  /\bLocalDateTime\.now\s*\(/,
  /\btime\.Now\s*\(/
];

const COMMENTED_CODE_RX = /^[ \t]*(?:\/\/|#)\s*(?:if\s*\(|for\s*\(|while\s*\(|return\s+[^;]+;|const\s+\w+\s*=|let\s+\w+\s*=|public\s+(?:class|void|async)|private\s+(?:readonly|void|async)|def\s+\w+\s*\(|func\s+\w+\s*\()/;

const SKIPPED_TEST_PATTERNS = [
  /\b(?:it|test|describe)\.skip\s*\(/,
  /\b(?:xit|xtest|xdescribe)\s*\(/,
  /\[\s*(?:Fact|Theory)\s*\([^)]*\bSkip\s*=/,
  /@(?:Disabled|Ignore)\b/,
  /@pytest\.mark\.skip\b/,
  /\bt\.Skip\s*\(/
];

function isTestFile(file) {
  return /\.(spec|test)\.[^.]+$|_test\.go$|Tests?\.cs$|test_.*\.py$/.test(file);
}

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (CODE_EXTENSIONS.some((ext) => entry.name.endsWith(ext))) acc.push(full);
  }
  return acc;
}

function main() {
  const args = parseArgs(process.argv);
  const rootDir = path.resolve(args.root);
  const files = [];
  for (const s of args.scan) walk(path.resolve(rootDir, s), files);

  const findings = [];

  for (const file of files) {
    const rel = path.relative(rootDir, file).split(path.sep).join('/');
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    const prodFile = !isTestFile(rel);
    let consecutiveCommentedCode = 0;

    lines.forEach((line, idx) => {
      const lineNo = idx + 1;
      const isComment = /^[ \t]*(?:\/\/|#|\/\*|\*)/.test(line) || /\/\/|#/.test(line);

      if (isComment) {
        for (const rx of NARRATIVE_PATTERNS) {
          if (rx.test(line)) {
            findings.push(`[narrative-comment] ${rel}:${lineNo} — Comentario con narrativa histórica o cita funcional: ${line.trim()}`);
            break;
          }
        }
      }

      for (const rx of SUPPRESSION_PATTERNS) {
        if (rx.test(line)) {
          findings.push(`[evasive-suppression] ${rel}:${lineNo} — Supresión de advertencia sin justificación explícita: ${line.trim()}`);
          break;
        }
      }

      if (prodFile && !/^[ \t]*(?:\/\/|#|\/\*|\*)/.test(line) && !/hygiene-allow:\s*system-clock/.test(line)) {
        for (const rx of SYSTEM_CLOCK_PATTERNS) {
          if (rx.test(line)) {
            findings.push(`[direct-clock] ${rel}:${lineNo} — Uso directo del reloj del sistema en producción; inyecta un proveedor de tiempo: ${line.trim()}`);
            break;
          }
        }
      }

      const prevLine = idx > 0 ? lines[idx - 1] : '';
      const allowSkipRx = /hygiene-allow:\s*skipped-test\s*(?:—|--|:)\s*\S+/;
      if (!prodFile && !/^[ \t]*(?:\/\/|#|\/\*|\*)/.test(line) && !allowSkipRx.test(line) && !allowSkipRx.test(prevLine)) {
        for (const rx of SKIPPED_TEST_PATTERNS) {
          if (rx.test(line)) {
            findings.push(`[skipped-test] ${rel}:${lineNo} — Prueba saltada o deshabilitada sin justificación; prohibido ocultar fallos reales de tests: ${line.trim()}`);
            break;
          }
        }
      }

      if (COMMENTED_CODE_RX.test(line)) {
        consecutiveCommentedCode++;
        if (consecutiveCommentedCode === 2) {
          findings.push(`[commented-code] ${rel}:${lineNo} — Posible bloque de código muerto comentado.`);
        }
      } else {
        consecutiveCommentedCode = 0;
      }
    });
  }

  if (findings.length > 0) {
    console.error(`Se detectaron ${findings.length} hallazgos de higiene de código:\n`);
    for (const f of findings) console.error(`  ✗ ${f}`);
    process.exit(1);
  }

  console.log(`✓ Higiene de código verificada sin hallazgos (${files.length} archivos inspeccionados).`);
}

main();
