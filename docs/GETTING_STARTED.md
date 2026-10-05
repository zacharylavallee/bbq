# Getting started

## Prerequisites

Install Node.js 24.21.0 LTS (see `.nvmrc`). The easiest way is with [nvm](https://github.com/nvm-sh/nvm):

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh"
nvm install         # reads .nvmrc
```

## Install dependencies

```bash
npm install
```

## Run the app

```bash
npx expo start
```

- **On a phone:** install Expo Go (App Store / Play Store) and scan the QR code shown in the terminal.
- **On the web:** press `w` in the terminal, or run `npx expo start --web`.

## Dependency safety

`.npmrc` sets `min-release-age=3`: npm refuses to install package versions published less than 3 days ago, which guards against freshly compromised releases. This requires **npm ≥ 11.10** (this repo pins `npm@12.2.0` via `packageManager`/`engines`; CI installs it explicitly from `tools/npm/package-lock.json`). Add new dependencies the normal way (`npx expo install <pkg>` or `npm install <pkg>`) — the cooldown applies automatically, so a brand-new release may resolve to the previous version.

### Security checks in CI (`.github/workflows/security.yml`)

Runs on every PR, on pushes to main, weekly, and on demand:

- `npm audit signatures` — **fails the build** if registry signatures can't be verified.
- `npm audit --omit=dev --json` + `scripts/audit-gate.ts` — **fails the build** only when a high/critical finding in production deps has a _non-major_ fix available; findings with no fix or a major-only fix (like transitive Expo toolchain vulnerabilities) are reported, not blocked.
- `npm audit --audit-level=none` — report only (all severities, dev deps included).
- OSV-Scanner on `package-lock.json` and `tools/npm/package-lock.json` + `scripts/osv-gate.ts` — **fails the build** if any malicious (`MAL-`) package is found; the findings table is also appended to the job summary.
- zizmor — audits the workflow files themselves for common GitHub Actions misconfigurations.
- StepSecurity Harden-Runner — first step of every job, in `audit` egress mode (logs outbound connections; not blocking yet).
- OpenSSF Scorecard (`scorecard.yml`) — weekly + on pushes to main; publishes SARIF results to code scanning.
- Socket — a GitHub app the repo owner installs separately; it comments on dependency PRs about supply-chain risks.

Run them locally:

```bash
npm audit signatures
npm audit --omit=dev --json > audit.json && node scripts/audit-gate.ts audit.json
npm audit
node scripts/osv-gate.ts osv.json   # after running osv-scanner yourself
```

### Dependabot auto-merge

`.github/workflows/dependabot-automerge.yml` enables `gh pr merge --auto --squash` on Dependabot PRs whose update type is **semver-minor or semver-patch**; majors are left alone. Expo-managed packages (`expo`, `expo-*`, `react*`, `@expo/*`, `@react-native*`, etc.) are ignored in `dependabot.yml` because they move together via `npx expo install --fix` during an SDK bump.

Because Dependabot **security** updates ignore the `min-release-age` cooldown, the workflow also runs `node scripts/release-age.ts`, which looks up each updated version's publish date (npm registry, or the tag's commit date for GitHub Actions). If anything is younger than 3 days — or its date can't be determined — auto-merge is skipped and the workflow comments on the PR asking for a manual merge after the cooldown.

Auto-merge only waits for checks that are **required** — without them it would merge immediately. These settings live under _Settings → Advanced Security_ and the repo's rulesets. To make it safe, make sure the `main` ruleset requires all of these checks, exactly as GitHub displays them:

- `check`
- `deps`
- `workflows`
- `Analyze (javascript-typescript)`
- `Analyze (actions)`

…with "Require branches to be up to date" enabled.

## Lint, typecheck, and tests

```bash
npm run lint          # ESLint (expo lint)
npm run format        # Prettier, write changes
npm run format:check  # Prettier, check only (used in CI)
npm run typecheck     # tsc --noEmit
npm test              # Jest
npm run test:coverage # Jest with coverage report and thresholds
```

Coverage thresholds are enforced in `package.json` (100% statements/functions/lines, 95% branches). CI runs all of the above on every pull request.
