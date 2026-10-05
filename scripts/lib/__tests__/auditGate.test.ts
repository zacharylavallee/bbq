import { gateAudit, parseAuditReport, summarizeAudit } from '../auditGate';

function vuln(overrides: Record<string, unknown> = {}) {
  return {
    severity: 'high',
    isDirect: false,
    via: ['parent-dep'],
    fixAvailable: false,
    ...overrides,
  };
}

const advisory = { title: 'bad thing', severity: 'high', url: 'https://x/1' };

describe('parseAuditReport', () => {
  it('parses an empty report', () => {
    expect(parseAuditReport({ vulnerabilities: {} })).toEqual([]);
  });

  it('parses findings with a boolean fixAvailable', () => {
    const findings = parseAuditReport({
      vulnerabilities: {
        braces: vuln({ severity: 'high', fixAvailable: false }),
        leftpad: vuln({ severity: 'low', isDirect: true, fixAvailable: true }),
      },
    });
    expect(findings).toEqual([
      {
        packageName: 'braces',
        severity: 'high',
        isDirect: false,
        fixAvailable: false,
        fixKind: 'none',
        hasOwnAdvisory: false,
      },
      {
        packageName: 'leftpad',
        severity: 'low',
        isDirect: true,
        fixAvailable: true,
        fixKind: 'non-major',
        hasOwnAdvisory: false,
      },
    ]);
  });

  it('marks findings with an advisory in via as having their own vulnerability', () => {
    const findings = parseAuditReport({
      vulnerabilities: {
        direct: vuln({ via: [advisory, 'parent-dep'] }),
        propagated: vuln({ via: ['direct'] }),
      },
    });
    expect(findings.map((f) => f.hasOwnAdvisory)).toEqual([true, false]);
  });

  it('parses an object fixAvailable as major or non-major', () => {
    const findings = parseAuditReport({
      vulnerabilities: {
        a: vuln({ fixAvailable: { name: 'a', version: '3.0.0', isSemVerMajor: true } }),
        b: vuln({ fixAvailable: { name: 'b', version: '1.2.3', isSemVerMajor: false } }),
      },
    });
    expect(findings.map((f) => f.fixKind)).toEqual(['major', 'non-major']);
    expect(findings.map((f) => f.fixAvailable)).toEqual([true, true]);
  });

  it.each([
    [null],
    [[]],
    [{ vulnerabilities: [] }],
    [{ vulnerabilities: { a: 5 } }],
    [{ vulnerabilities: { a: { isDirect: false, fixAvailable: false, via: [] } } }],
    [{ vulnerabilities: { a: { severity: 'high', fixAvailable: false, via: [] } } }],
    [{ vulnerabilities: { a: { severity: 'high', isDirect: false, via: [] } } }],
    [
      {
        vulnerabilities: {
          a: { severity: 'high', isDirect: false, via: 'x', fixAvailable: false },
        },
      },
    ],
    [
      {
        vulnerabilities: { a: { severity: 'high', isDirect: false, via: [], fixAvailable: 'yes' } },
      },
    ],
    [
      {
        vulnerabilities: {
          a: { severity: 'high', isDirect: false, fixAvailable: { name: 'a' } },
        },
      },
    ],
  ])('throws on malformed input %j', (input) => {
    expect(() => parseAuditReport(input)).toThrowError(/malformed npm audit report/);
  });
});

describe('gateAudit', () => {
  const base = { packageName: 'x', isDirect: false, fixAvailable: false, hasOwnAdvisory: true };

  it('passes when there are no findings', () => {
    expect(gateAudit([])).toEqual({ ok: true, blocking: [] });
  });

  it('does not block on high/critical findings with no fix or a major-only fix', () => {
    const findings = [
      { ...base, severity: 'high', fixKind: 'none' as const },
      { ...base, severity: 'critical', fixKind: 'major' as const, fixAvailable: true },
      { ...base, severity: 'moderate', fixKind: 'non-major' as const, fixAvailable: true },
    ];
    const result = gateAudit(findings);
    expect(result.ok).toBe(true);
    expect(result.blocking).toEqual([]);
  });

  it('does not block on propagated findings whose fixability belongs to the root cause', () => {
    const propagated = {
      ...base,
      hasOwnAdvisory: false,
      severity: 'high',
      fixAvailable: true,
      fixKind: 'non-major' as const,
    };
    expect(gateAudit([propagated])).toEqual({ ok: true, blocking: [] });
  });

  it('blocks on high/critical findings with a non-major fix', () => {
    const blocking = {
      ...base,
      packageName: 'evil',
      severity: 'critical',
      fixAvailable: true,
      fixKind: 'non-major' as const,
    };
    const result = gateAudit([{ ...base, severity: 'high', fixKind: 'none' as const }, blocking]);
    expect(result.ok).toBe(false);
    expect(result.blocking).toEqual([blocking]);
  });
});

describe('summarizeAudit', () => {
  it('returns a message for no findings', () => {
    expect(summarizeAudit([])).toBe('No known vulnerabilities.');
  });

  it('renders a markdown table', () => {
    const text = summarizeAudit([
      {
        packageName: 'a',
        severity: 'high',
        isDirect: false,
        fixAvailable: false,
        fixKind: 'none',
        hasOwnAdvisory: true,
      },
      {
        packageName: 'b',
        severity: 'low',
        isDirect: true,
        fixAvailable: true,
        fixKind: 'non-major',
        hasOwnAdvisory: true,
      },
      {
        packageName: 'c',
        severity: 'high',
        isDirect: false,
        fixAvailable: true,
        fixKind: 'major',
        hasOwnAdvisory: false,
      },
    ]);
    expect(text).toContain('| Package | Severity | Direct | Fix available |');
    expect(text).toContain('| a | high | no | none |');
    expect(text).toContain('| b | low | yes | non-major |');
    expect(text).toContain('| c | high | no | major |');
  });
});
