import { gate, parseOsvReport, summarize } from '../osvGate';

function report(packages: unknown[]): { results: { packages: unknown[] }[] } {
  return { results: [{ packages }] };
}

function entry(vulnerabilities: unknown, name = 'pkg-a', version = '1.0.0') {
  return { package: { name, version, ecosystem: 'npm' }, vulnerabilities };
}

function vuln(id: string, extra: Record<string, unknown> = {}) {
  return { id, ...extra };
}

const EMPTY = { results: [] };

describe('parseOsvReport', () => {
  it('parses an empty report', () => {
    expect(parseOsvReport(EMPTY)).toEqual([]);
    expect(parseOsvReport({ results: [{ packages: [] }] })).toEqual([]);
  });

  it('parses a normal CVE finding', () => {
    const findings = parseOsvReport(
      report([
        entry([
          vuln('GHSA-1234-abcd-efgh', {
            aliases: ['CVE-2026-12345'],
            database_specific: { severity: 'HIGH' },
          }),
        ]),
      ]),
    );
    expect(findings).toEqual([
      {
        packageName: 'pkg-a',
        version: '1.0.0',
        id: 'GHSA-1234-abcd-efgh',
        aliases: ['CVE-2026-12345'],
        severity: 'HIGH',
        malicious: false,
      },
    ]);
  });

  it('flags a MAL- id as malicious', () => {
    const findings = parseOsvReport(report([entry([vuln('MAL-2026-9999')])]));
    expect(findings[0].malicious).toBe(true);
    expect(findings[0].severity).toBeNull();
  });

  it('flags a MAL- alias only', () => {
    const findings = parseOsvReport(
      report([entry([vuln('GHSA-0000-aaaa-bbbb', { aliases: ['CVE-2026-1', 'MAL-2026-2'] })])]),
    );
    expect(findings[0].malicious).toBe(true);
  });

  it('handles missing severity', () => {
    const findings = parseOsvReport(report([entry([vuln('GHSA-x')])]));
    expect(findings[0].severity).toBeNull();
    expect(findings[0].aliases).toEqual([]);
  });

  it('parses multiple packages and results', () => {
    const findings = parseOsvReport({
      results: [
        { packages: [entry([vuln('GHSA-1')], 'a', '1.0.0')] },
        { packages: [entry([vuln('GHSA-2'), vuln('MAL-9')], 'b', '2.0.0')] },
      ],
    });
    expect(findings).toHaveLength(3);
    expect(findings.map((f) => f.packageName)).toEqual(['a', 'b', 'b']);
    expect(findings.map((f) => f.malicious)).toEqual([false, false, true]);
  });

  it.each([
    [null, 'root'],
    [42, 'root'],
    [{}, 'results'],
    [{ results: {} }, 'results'],
    [{ results: [null] }, 'results'],
    [{ results: [{}] }, 'packages'],
    [{ results: [{ packages: [null] }] }, 'packages'],
    [{ results: [{ packages: [{}] }] }, 'package.name'],
    [{ results: [{ packages: [{ package: { name: 'x' } }] }] }, 'package.name'],
    [{ results: [{ packages: [entry(null)] }] }, 'vulnerabilities'],
    [{ results: [{ packages: [entry([{}])] }] }, '"id"'],
    [{ results: [{ packages: [entry([vuln('GHSA-1', { aliases: {} })])] }] }, 'aliases'],
    [{ results: [{ packages: [entry([vuln('GHSA-1', { aliases: [1] })])] }] }, 'alias'],
    [
      {
        results: [{ packages: [entry([vuln('GHSA-1', { database_specific: { severity: 5 } })])] }],
      },
      'severity',
    ],
  ])('throws on malformed input %j', (input, part) => {
    expect(() => parseOsvReport(input)).toThrowError(/malformed osv-scanner report/);
  });
});

describe('summarize', () => {
  it('returns a message for empty findings', () => {
    expect(summarize([])).toBe('No known vulnerabilities.');
  });

  it('renders a markdown table', () => {
    const text = summarize([
      {
        packageName: 'braces',
        version: '3.0.3',
        id: 'GHSA-vfj7-8cjw-p6xm',
        aliases: [],
        severity: 'HIGH',
        malicious: false,
      },
      {
        packageName: 'evil',
        version: '1.0.0',
        id: 'MAL-2026-1',
        aliases: [],
        severity: null,
        malicious: true,
      },
    ]);
    expect(text).toContain('| Package | Version | ID | Severity | Malicious |');
    expect(text).toContain('| braces | 3.0.3 | GHSA-vfj7-8cjw-p6xm | HIGH | no |');
    expect(text).toContain('| evil | 1.0.0 | MAL-2026-1 | unknown | YES |');
  });
});

describe('gate', () => {
  it('passes with no findings', () => {
    expect(gate([])).toEqual({ ok: true, malicious: [] });
  });

  it('passes with only CVEs', () => {
    const findings = parseOsvReport(report([entry([vuln('GHSA-1')])]));
    expect(gate(findings).ok).toBe(true);
  });

  it('fails on malicious findings', () => {
    const findings = parseOsvReport(
      report([entry([vuln('GHSA-1'), vuln('MAL-1')]), entry([vuln('MAL-2')], 'evil', '9.9.9')]),
    );
    const result = gate(findings);
    expect(result.ok).toBe(false);
    expect(result.malicious.map((f) => f.id)).toEqual(['MAL-1', 'MAL-2']);
  });
});
