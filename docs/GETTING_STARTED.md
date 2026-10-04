# Getting started

## Prerequisites

Install Node.js 22 LTS. The easiest way is with [nvm](https://github.com/nvm-sh/nvm):

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh"
nvm install 22
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

`.npmrc` sets `min-release-age=3`: npm refuses to install package versions published less than 3 days ago, which guards against freshly compromised releases. This requires **npm ≥ 11.10** (this repo pins `npm@11.20.0` via `packageManager`/`engines`; CI installs it explicitly). Add new dependencies the normal way (`npx expo install <pkg>` or `npm install <pkg>`) — the cooldown applies automatically, so a brand-new release may resolve to the previous version.

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
