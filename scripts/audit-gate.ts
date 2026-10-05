// Thin CLI: `node scripts/audit-gate.ts <audit.json>`
// Reads an `npm audit --json` report, prints a summary, appends it to
// $GITHUB_STEP_SUMMARY when set, and exits 1 when high/critical findings have
// a non-major fix available.

import { appendFileSync, readFileSync } from 'node:fs';
import { gateAudit, parseAuditReport, summarizeAudit } from './lib/auditGate.ts';

const path = process.argv[2];
if (!path) {
  console.error('usage: node scripts/audit-gate.ts <audit.json>');
  process.exit(2);
}

let findings;
try {
  findings = parseAuditReport(JSON.parse(readFileSync(path, 'utf8')));
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(2);
}

const summary = summarizeAudit(findings);
console.log(summary);
if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    `\n## npm audit (production deps)\n\n${summary}\n`,
  );
}

const { ok, blocking } = gateAudit(findings);
if (!ok) {
  console.error(
    `BLOCKING: ${blocking.length} high/critical vulnerabilities have a non-major fix: ` +
      blocking.map((f) => f.packageName).join(', '),
  );
  process.exit(1);
}
console.log('npm audit gate passed: no high/critical vulnerabilities with a non-major fix.');
