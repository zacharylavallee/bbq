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
- `npm audit --omit=dev --audit-level=high` — **fails the build** on high/critical CVEs in production dependencies.
- `npm audit --audit-level=none` — report only (all severities, dev deps included).
- OSV-Scanner on `package-lock.json` + `scripts/osv-gate.ts` — **fails the build** if any malicious (`MAL-`) package is found; the findings table is also appended to the job summary.
- zizmor — audits the workflow files themselves for common GitHub Actions misconfigurations.

Run them locally:

```bash
npm audit signatures
npm audit --omit=dev --audit-level=high
npm audit
node scripts/osv-gate.ts osv.json   # after running osv-scanner yourself
```

Also enable **Dependabot alerts** and **Dependabot security updates** under the repo's _Settings → Code security_, so GitHub opens fix PRs automatically.

### Dependabot auto-merge

`.github/workflows/dependabot-automerge.yml` enables `gh pr merge --auto --squash` on Dependabot PRs whose update type is **semver-minor or semver-patch**; majors are left alone. Expo-managed packages (`expo`, `expo-*`, `react*`, `@expo/*`, `@react-native*`, etc.) are ignored in `dependabot.yml` because they move together via `npx expo install --fix` during an SDK bump.

Auto-merge only waits for checks that are **required** — without them it would merge immediately. To make it safe, enable:

- _Settings → General → Allow auto-merge_
- a **ruleset on `main`** requiring the `CI / check` job and the Security checks (`Security / deps`, `Security / workflows`), with "Require branches to be up to date"
- _Settings → Code security → Dependabot alerts_ and _Dependabot security updates_

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
