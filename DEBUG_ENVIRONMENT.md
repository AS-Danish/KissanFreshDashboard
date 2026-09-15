# Kissan Fresh debug environment

This repository keeps the existing production commands unchanged. The debug
dashboard is started with `npm run dev:debug` and refuses to connect to the
production Firebase project.

## Provisioned development project

- Display name: `Kissan-Fresh-Development`
- Project ID / CLI alias: `kissan-fresh-development` / `development`
- Web and Android debug apps are registered.
- `.env.debug.local`, the project-specific Functions environment file, and the
  Android `google-services.json` are installed locally and gitignored.
- Firestore is active in `nam5` and the generated debug rules are deployed.
- The wallet/order Functions are deployed in `us-central1`; Razorpay test values
  are stored in Secret Manager and a 7-day artifact cleanup policy is active.
- 296 non-sensitive documents were copied from production: 241 products, 15
  categories, 2 coupons, 37 offer notifications and 1 app configuration.
- Customer users, orders, payment failures, riders, slots, audit logs, maps
  cache and device tokens were deliberately excluded.
- 253 copied documents still reference production-hosted Storage assets. Those
  files must be migrated and their URLs rewritten after development Storage is
  available; until then the debug clients may read production product images.

## Remaining setup

1. Provision isolated development Cloud Storage and migrate product images;
   copied records currently retain production image URLs.
2. Configure App Check for the Web and Android development apps.
3. Add a restricted debug Maps key to the Flutter project's
   `android/local.properties` as `DEBUG_MAPS_API_KEY`.
4. Replace or rotate test credentials periodically. The current local test
   accounts are stored only in gitignored `.debug-test-credentials.json`.

## Safe catalog refresh

The migration uses the Firebase CLI's authenticated session, copies only the
allowlisted collections, and refuses to overwrite development documents:

```sh
npm run data:debug:inspect
npm run data:debug:copy
npm run data:debug:verify
npm run data:debug:seed
npm run test:debug:wallet-e2e
```

The live E2E test verifies source-refund rejection for an order without a
payment ID, reservation release, a 10,000-paise wallet credit, and atomic use of
that credit on a second order. It does not create a real Razorpay payment.

Example local dashboard command:

```sh
npm run dev:debug
```

Example debug deployment (replace the placeholder):

```sh
npm run rules:debug:generate
firebase deploy --config firebase.debug.json --project kissan-fresh-development
```

The admin order page exposes item-level wallet/source-refund controls only when
`NEXT_PUBLIC_APP_ENV=debug`. The Cloud Functions independently enforce the
debug project boundary, admin permissions, integer-paise accounting,
idempotency, remaining refundable quantity, and Razorpay test credentials.
