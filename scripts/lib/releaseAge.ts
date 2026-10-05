export interface DepUpdate {
  name: string;
  version: string;
  ecosystem: string;
}

export interface AgeFinding extends DepUpdate {
  publishedAt: string | null;
  ok: boolean;
}

export interface CheckOptions {
  fetcher: (url: string) => Promise<unknown>;
  now: Date;
  cooldownDays?: number;
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(`malformed updated-dependencies json: ${message}`);
  }
}

/**
 * Parses dependabot/fetch-metadata's `updated-dependencies-json` output.
 * Accepts both kebab-case (as emitted) and camelCase keys.
 */
export function parseUpdatedDependencies(json: unknown): DepUpdate[] {
  assert(Array.isArray(json), 'root must be an array');
  return json.map((raw, index) => {
    assert(typeof raw === 'object' && raw !== null, `entry ${index} must be an object`);
    const entry = raw as Record<string, unknown>;
    const name = entry['dependency-name'] ?? entry.dependencyName;
    const version = entry['new-version'] ?? entry.newVersion;
    const ecosystem = entry['package-ecosystem'] ?? entry.packageEcosystem;
    assert(typeof name === 'string' && name.length > 0, `entry ${index} needs a dependency name`);
    assert(typeof version === 'string' && version.length > 0, `entry ${index} needs a new version`);
    assert(
      typeof ecosystem === 'string' && ecosystem.length > 0,
      `entry ${index} needs a package ecosystem`,
    );
    return { name, version, ecosystem };
  });
}

async function npmPublishTime(name: string, version: string, fetcher: CheckOptions['fetcher']) {
  const url = `https://registry.npmjs.org/${encodeURIComponent(name)}`;
  const meta = (await fetcher(url)) as { time?: Record<string, string> };
  const time = meta?.time?.[version];
  return typeof time === 'string' ? time : null;
}

async function githubActionsPublishTime(
  name: string,
  version: string,
  fetcher: CheckOptions['fetcher'],
) {
  // `version` may be a tag name or a commit SHA; the commits API accepts both.
  const commit = (await fetcher(`https://api.github.com/repos/${name}/commits/${version}`)) as {
    commit?: { committer?: { date?: unknown } };
  };
  const date = commit?.commit?.committer?.date;
  return typeof date === 'string' ? date : null;
}

export async function checkReleaseAges(
  deps: DepUpdate[],
  { fetcher, now, cooldownDays = 3 }: CheckOptions,
): Promise<AgeFinding[]> {
  const cutoff = now.getTime() - cooldownDays * 24 * 3600 * 1000;
  const findings: AgeFinding[] = [];
  for (const dep of deps) {
    let publishedAt: string | null = null;
    try {
      publishedAt =
        dep.ecosystem === 'npm'
          ? await npmPublishTime(dep.name, dep.version, fetcher)
          : await githubActionsPublishTime(dep.name, dep.version, fetcher);
    } catch {
      publishedAt = null;
    }
    const ok = publishedAt !== null && new Date(publishedAt).getTime() <= cutoff;
    findings.push({ ...dep, publishedAt, ok });
  }
  return findings;
}

export function gateAge(findings: AgeFinding[]): { ok: boolean; blocked: AgeFinding[] } {
  const blocked = findings.filter((f) => !f.ok);
  return { ok: blocked.length === 0, blocked };
}

export function summarizeAge(findings: AgeFinding[], cooldownDays = 3): string {
  if (findings.length === 0) {
    return 'No dependency updates to check.';
  }
  const lines = [
    '| Dependency | New version | Published | Within cooldown |',
    '| --- | --- | --- | --- |',
    ...findings.map(
      (f) =>
        `| ${f.name} | ${f.version} | ${f.publishedAt ?? 'unknown'} | ${f.ok ? 'no' : `yes (< ${cooldownDays}d)`} |`,
    ),
  ];
  return lines.join('\n');
}
