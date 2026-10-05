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

## Local Supabase

Docker must be installed and running. Start the local Supabase services needed by the app:

```bash
npx supabase start -x realtime,mailpit,postgres-meta,studio,imgproxy,edge-runtime,logflare,vector,supavisor
npx supabase status
cp .env.example .env
npx supabase db reset
npx supabase test db
npm run db:types
```

`db reset` applies the migrations and reloads the deterministic local seed. The seed includes
`admin@bbq.local` / `admin-password`; these credentials exist only in the local database and
must not be used for a hosted project. `.env.example` contains the local anon JWT key; a Supabase
publishable key (`sb_publishable_...`) also works. Without `.env`, the app uses its mock menu.

For a physical phone, replace `127.0.0.1` in `.env` with your computer's LAN IP. Android emulators
can reach the host through `10.0.2.2`; simulators can use the local host address.

## Hosted project and first admin

The local `supabase/seed.sql` is not pushed to hosted projects. Link the hosted project and apply
the schema separately:

```bash
npx supabase link
npx supabase db push
```

Sign up the owner's account through Supabase Auth, then promote that account in the SQL editor:

```sql
update public.profiles
set role = 'admin'
where id = (
  select id from auth.users where email = 'owner@example.com'
);
```

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
