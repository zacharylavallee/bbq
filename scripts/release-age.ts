#!/usr/bin/env node
import { appendFileSync, writeFileSync } from 'node:fs';
import {
  checkReleaseAges,
  gateAge,
  parseUpdatedDependencies,
  summarizeAge,
} from './lib/releaseAge.ts';

const COOLDOWN_DAYS = 3;

async function defaultFetcher(url: string): Promise<unknown> {
  const token = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN;
  const response = await fetch(url, {
    headers: {
      accept: 'application/vnd.github+json, application/json',
      ...(token && new URL(url).hostname === 'api.github.com'
        ? { authorization: `Bearer ${token}` }
        : {}),
    },
  });
  if (!response.ok) {
    throw new Error(`fetch ${url} failed: HTTP ${response.status}`);
  }
  return response.json();
}

async function main(): Promise<number> {
  const raw = process.env.UPDATED_DEPENDENCIES_JSON;
  if (!raw) {
    console.error('release-age: UPDATED_DEPENDENCIES_JSON is not set');
    return 2;
  }
  let deps;
  try {
    deps = parseUpdatedDependencies(JSON.parse(raw));
  } catch (error) {
    console.error(`release-age: ${(error as Error).message}`);
    return 2;
  }
  const findings = await checkReleaseAges(deps, {
    fetcher: defaultFetcher,
    now: new Date(),
    cooldownDays: COOLDOWN_DAYS,
  });
  const summary = summarizeAge(findings, COOLDOWN_DAYS);
  console.log(summary);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`);
  }
  const result = gateAge(findings);
  if (process.env.GITHUB_OUTPUT) {
    writeFileSync(process.env.GITHUB_OUTPUT, `auto-merge=${result.ok ? 'yes' : 'no'}\n`, {
      flag: 'a',
    });
  }
  if (!result.ok) {
    const reason = result.blocked
      .map(
        (f) =>
          `${f.name}@${f.version} (${f.publishedAt ? `published ${f.publishedAt}` : 'publish date unknown'})`,
      )
      .join(', ');
    if (process.env.GITHUB_OUTPUT) {
      writeFileSync(process.env.GITHUB_OUTPUT, `blocked-reason=${reason}\n`, { flag: 'a' });
    }
    console.log(
      `release-age: BLOCKED auto-merge — too new or unknown: ${reason}. A maintainer should merge manually after the ${COOLDOWN_DAYS}-day cooldown.`,
    );
    return 0;
  }
  console.log('release-age: all updates are at least 3 days old; auto-merge may proceed.');
  return 0;
}

process.exitCode = await main();
