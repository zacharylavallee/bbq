export interface OsvFinding {
  packageName: string;
  version: string;
  id: string;
  aliases: string[];
  severity: string | null;
  malicious: boolean;
}

interface OsvVulnerability {
  id?: unknown;
  aliases?: unknown;
  database_specific?: { severity?: unknown };
}

interface OsvPackageEntry {
  package?: { name?: unknown; version?: unknown };
  vulnerabilities?: unknown;
}

interface OsvResult {
  packages?: unknown;
}

interface OsvReport {
  results?: unknown;
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(`malformed osv-scanner report: ${message}`);
  }
}

export function parseOsvReport(json: unknown): OsvFinding[] {
  assert(
    typeof json === 'object' && json !== null && !Array.isArray(json),
    'root must be an object',
  );
  const report = json as OsvReport;
  assert(Array.isArray(report.results), '"results" must be an array');
  const findings: OsvFinding[] = [];
  for (const result of report.results as OsvResult[]) {
    assert(
      typeof result === 'object' && result !== null,
      'each entry in "results" must be an object',
    );
    assert(Array.isArray(result.packages), 'each result must have a "packages" array');
    for (const entry of result.packages as OsvPackageEntry[]) {
      assert(
        typeof entry === 'object' && entry !== null,
        'each entry in "packages" must be an object',
      );
      const pkg = entry.package;
      assert(
        typeof pkg === 'object' &&
          pkg !== null &&
          typeof pkg.name === 'string' &&
          typeof pkg.version === 'string',
        'each package entry needs package.name and package.version strings',
      );
      assert(
        Array.isArray(entry.vulnerabilities),
        'each package entry needs a "vulnerabilities" array',
      );
      for (const vuln of entry.vulnerabilities as OsvVulnerability[]) {
        assert(
          typeof vuln === 'object' && vuln !== null && typeof vuln.id === 'string',
          'each vulnerability needs a string "id"',
        );
        const aliases = vuln.aliases === undefined ? [] : vuln.aliases;
        assert(Array.isArray(aliases), '"aliases" must be an array when present');
        for (const alias of aliases) {
          assert(typeof alias === 'string', 'each alias must be a string');
        }
        const severity = vuln.database_specific?.severity;
        assert(
          severity === undefined || typeof severity === 'string',
          '"database_specific.severity" must be a string when present',
        );
        const id = vuln.id;
        const aliasStrings = aliases as string[];
        findings.push({
          packageName: pkg.name,
          version: pkg.version,
          id,
          aliases: aliasStrings,
          severity: typeof severity === 'string' ? severity : null,
          malicious: id.startsWith('MAL-') || aliasStrings.some((a) => a.startsWith('MAL-')),
        });
      }
    }
  }
  return findings;
}

export function summarize(findings: OsvFinding[]): string {
  if (findings.length === 0) {
    return 'No known vulnerabilities.';
  }
  const lines = [
    '| Package | Version | ID | Severity | Malicious |',
    '| --- | --- | --- | --- | --- |',
    ...findings.map(
      (f) =>
        `| ${f.packageName} | ${f.version} | ${f.id} | ${f.severity ?? 'unknown'} | ${f.malicious ? 'YES' : 'no'} |`,
    ),
  ];
  return lines.join('\n');
}

export function gate(findings: OsvFinding[]): { ok: boolean; malicious: OsvFinding[] } {
  const malicious = findings.filter((f) => f.malicious);
  return { ok: malicious.length === 0, malicious };
}
