import { ESLint } from 'eslint';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const sourceFiles = [
  'apps/*/src/**/*.{svelte,ts,js,mjs}',
  'packages/*/src/**/*.{svelte,ts,js,mjs}',
];

export function summarize(results, cwd = root) {
  const files = results
    .filter((result) => result.messages.length > 0)
    .map((result) => ({
      path: relative(cwd, result.filePath).split('\\').join('/'),
      findings: result.messages.map(({ line, column, ruleId, severity, message }) => ({
        line,
        column,
        rule: ruleId ?? 'parse-error',
        severity,
        message,
      })),
    }))
    .sort((a, b) => {
      const signals = (file) => new Set(file.findings.map((finding) => finding.rule)).size;
      return (
        signals(b) - signals(a) ||
        b.findings.length - a.findings.length ||
        a.path.localeCompare(b.path)
      );
    });
  const findings = files.flatMap((file) => file.findings);
  return {
    scannedFiles: results.length,
    flaggedFiles: files.length,
    warnings: findings.filter((finding) => finding.severity === 1).length,
    errors: findings.filter((finding) => finding.severity === 2).length,
    files,
  };
}

export function formatReport(report, all = false) {
  const lines = [
    'Component quality audit',
    `${report.scannedFiles} source files scanned; ${report.flaggedFiles} flagged; ${report.warnings} warnings; ${report.errors} errors.`,
    'Signals for review, not proof of too many responsibilities. Sorted by distinct signals, then finding count.',
  ];
  for (const file of all ? report.files : report.files.slice(0, 20)) {
    lines.push('', `${file.path} (${file.findings.length} findings)`);
    for (const finding of all ? file.findings : file.findings.slice(0, 4)) {
      lines.push(`  ${finding.line}:${finding.column} [${finding.rule}] ${finding.message}`);
    }
    if (!all && file.findings.length > 4) {
      lines.push(`  … ${file.findings.length - 4} more; use --all for every location.`);
    }
  }
  if (!all && report.files.length > 20) {
    lines.push(
      '',
      `${report.files.length - 20} more flagged files; use --all for the full report.`,
    );
  }
  if (report.flaggedFiles === 0) lines.push('', 'No findings at the configured thresholds.');
  return lines.join('\n');
}

export function exitCode(report, strict = false) {
  return report.errors > 0 || (strict && report.warnings > 0) ? 1 : 0;
}

async function main(args) {
  const supported = new Set(['--all', '--json', '--strict', '--help']);
  const unknown = args.find((arg) => !supported.has(arg));
  if (unknown) throw new Error(`Unknown option: ${unknown}. Use --help.`);
  if (args.includes('--help')) {
    console.log(
      'Usage: pnpm audit:components [--all] [--json] [--strict]\n' +
        'Default: concise review report; warnings do not fail the command.\n' +
        '--all: every finding; --json: full machine-readable report; --strict: fail on warnings.',
    );
    return;
  }
  const eslint = new ESLint({
    cwd: root,
    overrideConfigFile: resolve(root, 'eslint.components.config.js'),
  });
  const report = summarize(await eslint.lintFiles(sourceFiles));
  console.log(
    args.includes('--json')
      ? JSON.stringify(report, null, 2)
      : formatReport(report, args.includes('--all')),
  );
  process.exitCode = exitCode(report, args.includes('--strict'));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((cause) => {
    console.error(
      `Component audit failed: ${cause instanceof Error ? cause.message : String(cause)}`,
    );
    process.exitCode = 1;
  });
}
