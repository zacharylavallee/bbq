// Pure logic for the `npm audit` gate. Parses audit JSON (v2, produced by
// `npm audit --json`), summarizes findings, and fails only on high/critical
// vulnerabilities with a non-major fix available.

export type FixKind = 'none' | 'non-major' | 'major';

export interface AuditFinding {
  packageName: string;
  severity: string;
  isDirect: boolean;
  fixAvailable: boolean;
  fixKind: FixKind;
  // True when `via` contains a real advisory (the package's own code is
  // vulnerable), false when it only references other vulnerable packages.
  hasOwnAdvisory: boolean;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`malformed npm audit report: ${message}`);
  }
}

export function parseAuditReport(json: unknown): AuditFinding[] {
  assert(
    typeof json === 'object' && json !== null && !Array.isArray(json),
    'root must be an object',
  );
  const vulns = (json as Record<string, unknown>).vulnerabilities;
  assert(
    typeof vulns === 'object' && vulns !== null && !Array.isArray(vulns),
    '"vulnerabilities" must be an object',
  );

  const findings: AuditFinding[] = [];
  for (const [name, raw] of Object.entries(vulns as Record<string, unknown>)) {
    assert(typeof raw === 'object' && raw !== null, `vulnerability "${name}" must be an object`);
    const entry = raw as Record<string, unknown>;
    assert(typeof entry.severity === 'string', `vulnerability "${name}" missing "severity"`);
    assert(typeof entry.isDirect === 'boolean', `vulnerability "${name}" missing "isDirect"`);
    assert(Array.isArray(entry.via), `vulnerability "${name}" missing "via"`);
    const hasOwnAdvisory = (entry.via as unknown[]).some(
      (v) => typeof v === 'object' && v !== null,
    );
    const fix = entry.fixAvailable;
    assert(
      typeof fix === 'boolean' || (typeof fix === 'object' && fix !== null && !Array.isArray(fix)),
      `vulnerability "${name}" has invalid "fixAvailable"`,
    );

    let fixAvailable: boolean;
    let fixKind: FixKind;
    if (fix === true) {
      fixAvailable = true;
      fixKind = 'non-major';
    } else if (fix === false) {
      fixAvailable = false;
      fixKind = 'none';
    } else {
      const fixObj = fix as Record<string, unknown>;
      assert(
        typeof fixObj.isSemVerMajor === 'boolean',
        `vulnerability "${name}" fix missing "isSemVerMajor"`,
      );
      fixAvailable = true;
      fixKind = fixObj.isSemVerMajor ? 'major' : 'non-major';
    }

    findings.push({
      packageName: name,
      severity: entry.severity,
      isDirect: entry.isDirect,
      fixAvailable,
      fixKind,
      hasOwnAdvisory,
    });
  }
  return findings;
}

export function gateAudit(findings: AuditFinding[]): {
  ok: boolean;
  blocking: AuditFinding[];
} {
  // Only advisories in a package's own code can block. Propagated entries
  // (via lists only other vulnerable packages) inherit their root cause's
  // fixability — npm marks them non-major-fixable even when the actual fix
  // is a major bump the toolchain can't take.
  const blocking = findings.filter(
    (f) =>
      (f.severity === 'high' || f.severity === 'critical') &&
      f.fixKind === 'non-major' &&
      f.hasOwnAdvisory,
  );
  return { ok: blocking.length === 0, blocking };
}

export function summarizeAudit(findings: AuditFinding[]): string {
  if (findings.length === 0) {
    return 'No known vulnerabilities.';
  }
  const rows = findings.map(
    (f) => `| ${f.packageName} | ${f.severity} | ${f.isDirect ? 'yes' : 'no'} | ${f.fixKind} |`,
  );
  return [
    '| Package | Severity | Direct | Fix available |',
    '| --- | --- | --- | --- |',
    ...rows,
  ].join('\n');
}
