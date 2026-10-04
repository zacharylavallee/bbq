# bbq (working title)

A mobile app for my BBQ / catering business. Customers download it, browse the menu, order BBQ for pickup or book catering, and pay with Apple Pay, Google Pay, or a card. I get notified of new orders and manage them from admin screens in the same app.

## Goals

- **Easy for customers.** Order and pay in a few taps.
- **No payment handling on my side.** Stripe processes all payments, so card data never touches my code or servers.
- **One codebase.** iOS and Android from the same TypeScript project.
- **Cheap to run.** Free tiers wherever possible (Supabase, Expo). The main costs are Stripe fees per order and the store accounts.
- **Easy to maintain.** Managed services only. No servers of my own.
- **~100% test coverage.** Every PR keeps coverage at or near 100%, enforced in CI.

## Tech stack

| Concern | Choice | Why |
|---|---|---|
| App framework | Expo (React Native) + TypeScript | One codebase for iOS and Android; test on a real phone with Expo Go |
| Navigation | Expo Router | File-based routes, deep links |
| Backend / database | Supabase (Postgres) | Auth, database, realtime order updates, row-level security; free tier |
| Auth | Supabase Auth (email magic link, Sign in with Apple, Google) | No passwords to manage |
| Payments | Stripe Payment Sheet (`@stripe/stripe-react-native`) | Apple Pay, Google Pay, and cards; Stripe handles PCI compliance |
| Server logic | Supabase Edge Functions | Create Stripe PaymentIntents and handle Stripe webhooks; secrets stay off the device |
| Push notifications | Expo Notifications | New-order alerts for me; order-status updates for customers |
| Builds / release | EAS Build + EAS Submit | Cloud builds, no Mac needed for Android; App Store and Play Store submission |
| Tests | Jest (`jest-expo`) + React Native Testing Library | Unit and component tests with coverage thresholds |
| Backend tests | Deno test (Edge Functions), pgTAP (RLS policies) | Payment and security logic is tested, not just the UI |
| E2E tests | Maestro | Scripted flows on simulator/emulator (browse → cart → checkout) |
| CI | GitHub Actions | Lint, type-check, tests and coverage gate on every PR |

### Payments

- Customers pay through Stripe's Payment Sheet: Apple Pay, Google Pay, or a card.
- Prices are calculated on the server (Edge Function) from the database, never trusted from the app.
- An order is only marked **paid** when Stripe's webhook confirms the payment.
- Food is a physical good, so Apple and Google in-app purchase rules don't apply (no 30% cut). Stripe charges about 2.9% + 30¢ per order.
- Refunds are issued from the Stripe dashboard to start.

## Features

### Customer
- **Menu:** categories (meats by the pound, sandwiches, sides, desserts, catering packages), photos, prices, sold-out badges.
- **Cart:** quantities, item options (e.g. sauce, size), notes.
- **Checkout:** choose pickup or catering, pick a date and time (respects lead time and blackout dates), then pay.
- **Orders:** live status (new → confirmed → ready → completed) and order history.
- **Account:** name, phone, and saved info for faster checkout.

### Admin (me)
- **Order queue:** incoming orders in real time with a push notification, and buttons to update status.
- **Menu editor:** add and edit items, prices, photos, sold-out toggle.
- **Settings:** business hours, pickup slots, catering lead time (e.g. 48 h), minimum catering order, blackout dates.

### Later
- Delivery with a delivery fee or zone
- Promo codes
- Loyalty / rewards
- Catering deposits
- Tips
- SMS updates
- Web ordering page

## Data model (draft)

- `profiles`: `id`, `name`, `phone`, `role` (`customer` | `admin`)
- `menu_categories`: `id`, `name`, `sort_order`
- `menu_items`: `id`, `category_id`, `name`, `description`, `price_cents`, `unit` (each / lb / tray), `image_url`, `is_available`, `is_catering`
- `orders`: `id`, `customer_id`, `type` (`pickup` | `catering`), `scheduled_for`, `status`, `subtotal_cents`, `total_cents`, `notes`, `stripe_payment_intent_id`, `paid_at`, `created_at`
- `order_items`: `id`, `order_id`, `menu_item_id`, `name_snapshot`, `price_cents_snapshot`, `quantity`, `options`
- `settings`: business hours, lead time, minimum catering order, blackout dates

Row-level security: customers can read only their own orders; only admins can edit the menu and order status.

## Screens

1. **Menu** (home): categories → item detail → add to cart.
2. **Cart / Checkout:** review, pickup or catering, date and time, pay.
3. **Orders:** active order status and history.
4. **Account:** profile and sign in/out.
5. **Admin** (admins only): order queue, menu editor, settings.

## Architecture

- `app/`: Expo Router screens, with `(customer)` and `(admin)` route groups.
- `src/lib/`: Supabase client, Stripe helpers, and pure logic (cart totals, pickup-slot and lead-time rules), unit-tested.
- `supabase/`: SQL migrations, seed menu, and Edge Functions (`create-payment-intent`, `stripe-webhook`).
- Cart state lives on the device; orders and the menu live in Supabase.

## Testing

Target: as close to 100% coverage as possible. CI enforces it on every PR.

- **Coverage gate:** Jest `coverageThreshold` at 100% for statements, functions, and lines, and at least 95% for branches. A PR that drops coverage fails CI.
- **Exclusions:** generated files, type-only files, and thin config/entry files only. Each exclusion is listed and justified in `jest.config`.
- **Pure logic first:** cart totals, pricing, pickup slots, and lead-time and blackout rules live in `src/lib/` as plain functions, so they're easy to test fully.
- **Components and screens:** React Native Testing Library renders each screen, with Supabase and Stripe mocked at the client boundary.
- **Edge Functions:** Deno tests for `create-payment-intent` (server-side pricing, rejecting tampered carts) and `stripe-webhook` (signature check, marking orders paid, idempotency).
- **Database:** pgTAP tests confirm customers see only their own orders and only admins can edit menus and orders.
- **E2E:** Maestro flows for the main paths, run before releases.
- **Every phase PR** includes tests for its code and keeps the coverage gate green.

## Roadmap (one PR per phase)

1. **Project skeleton:** Expo + TypeScript + Expo Router, tabs, menu screen with mock data, ESLint, Jest with 100% coverage thresholds, and a GitHub Actions CI workflow.
2. **Cart and checkout flow:** cart, pickup/catering, date/time rules (no payment yet).
3. **Supabase:** schema, seed menu, auth, real menu data, place orders, order history.
4. **Admin:** order queue with realtime updates, status changes, menu editor, settings.
5. **Payments:** Stripe Payment Sheet with Apple Pay and Google Pay, Edge Functions, webhook.
6. **Push notifications:** new-order alerts for me, status updates for customers.
7. **Polish and release:** icon, branding, EAS builds, TestFlight / internal testing, store listings.

## Requirements / accounts needed

- Node.js LTS and the Expo Go app on a phone for development.
- Supabase project (free tier) for phase 3.
- Stripe account (business details and bank account) for phase 5.
- Apple Developer Program ($99/yr) and Google Play Console ($25 one-time) for release.
