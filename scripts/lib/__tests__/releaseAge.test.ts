import {
  checkReleaseAges,
  gateAge,
  parseUpdatedDependencies,
  summarizeAge,
  type DepUpdate,
} from '../releaseAge';

const NOW = new Date('2026-10-04T00:00:00Z');
const OLD = '2026-09-01T00:00:00Z'; // > 3 days old
const FRESH = '2026-10-03T00:00:00Z'; // < 3 days old

describe('parseUpdatedDependencies', () => {
  it('parses kebab-case entries', () => {
    const deps = parseUpdatedDependencies([
      {
        'dependency-name': 'lodash',
        'new-version': '4.18.0',
        'package-ecosystem': 'npm',
        'update-type': 'version-update:semver-patch',
      },
    ]);
    expect(deps).toEqual([{ name: 'lodash', version: '4.18.0', ecosystem: 'npm' }]);
  });

  it('parses camelCase entries', () => {
    const deps = parseUpdatedDependencies([
      { dependencyName: 'left-pad', newVersion: '1.0.0', packageEcosystem: 'npm' },
    ]);
    expect(deps).toEqual([{ name: 'left-pad', version: '1.0.0', ecosystem: 'npm' }]);
  });

  it.each([
    [{}, 'root'],
    [[null], 'object'],
    [[{}], 'name'],
    [[{ 'dependency-name': 'x' }], 'version'],
    [[{ 'dependency-name': 'x', 'new-version': '1' }], 'ecosystem'],
  ])('throws on malformed input %j', (input, part) => {
    expect(() => parseUpdatedDependencies(input)).toThrowError(/malformed/);
  });
});

describe('checkReleaseAges', () => {
  const npmDep: DepUpdate = { name: 'braces', version: '3.0.4', ecosystem: 'npm' };
  const actionDep: DepUpdate = {
    name: 'actions/checkout',
    version: 'v7.0.1',
    ecosystem: 'github-actions',
  };

  function fetcherFor(map: Record<string, unknown>) {
    return async (url: string) => {
      for (const key of Object.keys(map)) {
        if (url.includes(key)) return map[key];
      }
      throw new Error(`unhandled fetch ${url}`);
    };
  }

  it('marks npm versions older than the cooldown as ok', async () => {
    const findings = await checkReleaseAges([npmDep], {
      fetcher: fetcherFor({ 'registry.npmjs.org/braces': { time: { '3.0.4': OLD } } }),
      now: NOW,
    });
    expect(findings).toEqual([{ ...npmDep, publishedAt: OLD, ok: true }]);
  });

  it('blocks npm versions younger than the cooldown', async () => {
    const findings = await checkReleaseAges([npmDep], {
      fetcher: fetcherFor({ 'registry.npmjs.org/braces': { time: { '3.0.4': FRESH } } }),
      now: NOW,
    });
    expect(findings[0].ok).toBe(false);
    expect(findings[0].publishedAt).toBe(FRESH);
  });

  it('blocks when the version has no publish time', async () => {
    const findings = await checkReleaseAges([npmDep], {
      fetcher: fetcherFor({ 'registry.npmjs.org/braces': { time: {} } }),
      now: NOW,
    });
    expect(findings[0]).toMatchObject({ publishedAt: null, ok: false });
  });

  it('resolves github-actions versions via the commits API', async () => {
    const findings = await checkReleaseAges([actionDep], {
      fetcher: fetcherFor({
        'repos/actions/checkout/commits/v7.0.1': { commit: { committer: { date: OLD } } },
      }),
      now: NOW,
    });
    expect(findings).toEqual([{ ...actionDep, publishedAt: OLD, ok: true }]);
  });

  it('blocks github-actions when the fetch fails', async () => {
    const findings = await checkReleaseAges([actionDep], {
      fetcher: async () => {
        throw new Error('404');
      },
      now: NOW,
    });
    expect(findings[0]).toMatchObject({ publishedAt: null, ok: false });
  });

  it('blocks when the publish time is unparseable', async () => {
    const findings = await checkReleaseAges([actionDep], {
      fetcher: fetcherFor({
        'repos/actions/checkout/commits/v7.0.1': { commit: { committer: {} } },
      }),
      now: NOW,
    });
    expect(findings[0].publishedAt).toBeNull();
  });

  it('encodes scoped npm names', async () => {
    const urls: string[] = [];
    const scoped: DepUpdate = { name: '@scope/pkg', version: '1.0.0', ecosystem: 'npm' };
    await checkReleaseAges([scoped], {
      fetcher: async (url) => {
        urls.push(url);
        return { time: { '1.0.0': OLD } };
      },
      now: NOW,
    });
    expect(urls[0]).toBe('https://registry.npmjs.org/%40scope%2Fpkg');
  });
});

describe('gateAge', () => {
  it('passes when everything is old enough', () => {
    expect(gateAge([])).toEqual({ ok: true, blocked: [] });
    expect(
      gateAge([{ name: 'a', version: '1', ecosystem: 'npm', publishedAt: OLD, ok: true }]).ok,
    ).toBe(true);
  });

  it('fails when any update is too new or unknown', () => {
    const blocked = { name: 'b', version: '2', ecosystem: 'npm', publishedAt: FRESH, ok: false };
    const result = gateAge([
      { name: 'a', version: '1', ecosystem: 'npm', publishedAt: OLD, ok: true },
      blocked,
    ]);
    expect(result.ok).toBe(false);
    expect(result.blocked).toEqual([blocked]);
  });
});

describe('summarizeAge', () => {
  it('returns a message for empty findings', () => {
    expect(summarizeAge([])).toBe('No dependency updates to check.');
  });

  it('renders a markdown table', () => {
    const text = summarizeAge([
      { name: 'a', version: '1.0.1', ecosystem: 'npm', publishedAt: OLD, ok: true },
      { name: 'b', version: '2.0.0', ecosystem: 'npm', publishedAt: null, ok: false },
    ]);
    expect(text).toContain('| Dependency | New version | Published | Within cooldown |');
    expect(text).toContain(`| a | 1.0.1 | ${OLD} | no |`);
    expect(text).toContain('| b | 2.0.0 | unknown | yes (< 3d) |');
  });
});
