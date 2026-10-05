#!/usr/bin/env node
import { appendFileSync, readFileSync } from 'node:fs';
import { gate, parseOsvReport, summarize } from './lib/osvGate.ts';

function main(argv: string[]): number {
  const path = argv[2];
  if (!path) {
    console.error('usage: node osv-gate.ts <osv.json>');
    return 1;
  }
  let raw: string;
  try {
    raw = readFileSync(path, 'utf8');
  } catch (error) {
    console.error(`osv-gate: cannot read ${path}: ${(error as Error).message}`);
    return 1;
  }
  let findings;
  try {
    findings = parseOsvReport(JSON.parse(raw));
  } catch (error) {
    console.error(`osv-gate: ${(error as Error).message}`);
    return 1;
  }
  const summary = summarize(findings);
  console.log(summary);
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (summaryPath) {
    appendFileSync(summaryPath, `${summary}\n`);
  }
  const result = gate(findings);
  if (!result.ok) {
    console.error('osv-gate: MALICIOUS PACKAGES DETECTED:');
    for (const f of result.malicious) {
      console.error(`  ${f.packageName}@${f.version} ${f.id}`);
    }
    return 1;
  }
  console.log('osv-gate: no malicious packages found.');
  return 0;
}

process.exit(main(process.argv));
