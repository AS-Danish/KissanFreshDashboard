# Kissan Fresh — Complete Technical Architecture and Feature Reference

> Audited from the source code on 5 September 2026. This document is written as context for an AI, engineer, reviewer, or interviewer. It separates implemented behavior from platform behavior and future scale claims.

## 1. Executive summary

Kissan Fresh is a multi-client, Firebase-backed commerce and delivery platform. It is not a single application. The audited workspace contains four distinct software surfaces:

| Surface | Type | Primary users | Technology | Location |
|---|---|---|---|---|
| Consumer storefront | Mobile app | Grocery/home-food customers | Flutter, Dart, GetX | `C:\Users\asdan\StudioProjects\kissan-fresh-app` |
| Admin control panel | Website/web app | Administrators and management staff | Next.js 16, React 19, Firebase Web SDK | `C:\KissanFreshDashboard` |
| Admin monitor | Mobile app | Store operators receiving live orders | Flutter, Dart, FCM | `C:\KissanFreshDashboard\admin_app` |
| Server backend | Managed/serverless backend | All clients | Firebase Cloud Functions v2, Firestore, Auth, Storage, FCM, Razorpay, Algolia | `C:\KissanFreshDashboard\functions` |

All three clients share the Firebase project `kissanfresh-a72c1` and a common Firestore data model. The backend is event-driven and serverless rather than a conventional Express/REST server.

The strongest senior-level implementation is the order pipeline: a callable Cloud Function atomically validates/decrements inventory, validates slot capacity, selects the least-loaded rider, increments allocation counters, consumes a coupon, and creates the order inside a Firestore transaction. The system also contains layered local/global caching, cursor pagination, bounded parallel reads, aggregate queries, push-notification fan-out, invalid-token cleanup, automatic refund recovery, role-based access rules, image compression, OTA updates, and real-time UI synchronization.

Important accuracy statement: the code contains meaningful scale optimizations, but there is no load test, capacity model, custom API rate limiter, production telemetry, or sharded architecture proving support for 1,000,000 concurrent or active users. The honest description is **“designed with bounded reads, caching, pagination, serverless autoscaling, and transactional consistency, with a documented path to million-user readiness.”**

## 2. System topology

```text
Consumer Flutter app ─┬─ Firebase Auth (phone/OTP)
                      ├─ Firestore (catalog, users, slots, orders, config)
                      ├─ Firebase Storage (profile/media)
                      ├─ Callable Cloud Function: createOrder
                      ├─ FCM notifications
                      ├─ Razorpay mobile checkout
                      ├─ Google Maps/Geocoding
                      └─ Hive device caches

Next.js admin website ┬─ Firebase Auth (email/password)
                      ├─ Firestore CRUD/real-time listeners/aggregates
                      ├─ Firebase Storage uploads
                      ├─ Callable admin functions
                      ├─ Algolia product search
                      └─ Browser FCM

Admin Flutter app ────┬─ Firebase Auth
                      ├─ Firestore live order feed
                      ├─ FCM new-order alerts
                      └─ Excel reports/share sheet

Firebase backend ─────┬─ Firestore transactions and scheduled jobs
                      ├─ Firestore triggers
                      ├─ FCM fan-out
                      ├─ Razorpay refund API
                      └─ Algolia indexing
```

## 3. Consumer mobile app (Flutter application)

### 3.1 Purpose and architecture

This is the customer-facing Android/iOS application. It uses GetX for reactive state, dependency injection, navigation, and route middleware. Code is divided into bindings, controllers, models, services, views, widgets, routes, and middleware.

Startup performs Firebase and environment loading concurrently, registers an FCM background handler, forwards Flutter and asynchronous fatal errors to Crashlytics, activates Firebase App Check, initializes Hive, opens seven local boxes in parallel, registers long-lived services/controllers, paints the app, removes the native splash, and initializes optional notification behavior without blocking the first frame.

The Hive boxes are:

- `maps_cache`
- `cart_box`
- `user_settings`
- `wishlist_box`
- `orders_cache`
- `products_cache`
- `user_activity`

### 3.2 Customer journey and screens

The route map implements:

- Splash and startup decision flow.
- Phone-number login, OTP verification, resend timer, and authentication-aware redirects.
- New-user onboarding.
- Main bottom navigation: home, search, cart, orders, and settings.
- Grocery and Home Food storefront modes.
- Dynamic homepage categories, merchandising sections, coupons, themed header, and today's specials.
- Product browsing, category browsing, section browsing, product detail, product variations, similar products, and quantity selection.
- Wishlist with cross-device Firestore synchronization and instant local display.
- Cart with variation-aware line identifiers, live stock validation, discounts, coupons, delivery fees, and persistent storage.
- Address selection via GPS, Google Map picking, manual search, reverse geocoding, saved addresses, flat/landmark/type metadata, and a 30 km service boundary.
- Delivery slot selection grouped into Today/Tomorrow/date tabs.
- Razorpay online payment and Cash on Delivery.
- Order history with active/completed/cancelled groupings, date filters, rider and slot details, receipt PDF generation, and a reorder entry point.
- Profile editing and compressed profile-image upload.
- User-controlled notifications, light/dark/dynamic themes, update checks, About, FAQ, help/support, terms, privacy, and account deletion.

The current `reorderItems` method displays feedback but does not yet reconstruct the cart, so it should be described as a UI entry point rather than a completed reorder workflow.

### 3.3 Catalog and homepage data flow

The app supports two catalog origins: `kissan-fresh` (grocery) and `home-food`.

Catalog behavior includes:

- The primary product controller loads an origin/category-specific Hive cache immediately, then attaches a real-time Firestore listener to the first 18 records.
- Later pages use one-time cursor reads with `startAfterDocument` and `limit(18)`, avoiding a growing number of live listeners.
- Request-generation tokens discard late responses after a tab/category switch, preventing stale data from overwriting the new screen.
- When the first-page stream emits, it merges fresh first-page rows with the already paginated tail and de-duplicates IDs.
- Categorized home sections fetch six products per category with concurrency bounded to three category queries at a time. UI updates are published in batches instead of once per response.
- Dynamic merchandising sections fetch five preview items, cache each preview, and fetch up to 50 only when the full section is opened.
- Section queries cap category `whereIn` inputs to 10.
- Categories are limited to 50 and cached for six hours. An expired cache remains an offline fallback if Firestore fails.
- Today's-special configuration is a date-addressed Firestore document. Up to 30 referenced product IDs are fetched in a single `whereIn` read and re-sorted to the configured merchandising order.
- Active themes and the home header listen to `app_config/versioning`; a version query parameter busts stale image caches after a header update.

### 3.4 Search

Consumer search is implemented locally over a bounded live catalog rather than through Algolia:

- The app restores up to 400 products for the active origin from Hive, then maintains a real-time Firestore listener capped at 400.
- Text input is debounced by 300 ms.
- Search uses case-insensitive token matching plus simple singular/plural normalization (`s`, `es`, and `ies`).
- Query/category combinations have an in-memory result cache.
- Search-generation tokens reject stale asynchronous results.
- Browse mode uses Firestore cursor pagination in pages of 15.
- The five most recent searches are stored in SharedPreferences.
- Speech-to-text supports `en_IN` and stops after a three-second no-result timeout.

This is appropriate for a small/medium catalog. A catalog materially larger than 400 items per origin should move mobile search to Algolia or another server-side index, because records beyond the current listener cap cannot appear in text search.

### 3.5 Cart, pricing, coupons, and inventory awareness

The cart is a permanent GetX controller backed by Hive. It restores immediately after restart and persists after mutations. It supports:

- Base products and variation-specific cart rows.
- Increment, decrement, remove, clear, item counts, subtotals, delivery fees, automatic discounts, coupon discounts, and totals.
- Origin separation so grocery/home-food cart behavior can be controlled coherently.
- Coupon lookup by normalized code, active status, and product origin.
- Coupon restrictions by category/product, minimum order value, per-user use count, total-use count, and discount caps where configured.
- A live product subscription for current cart IDs so deleted products, price changes, variation changes, and stock changes update the cart.
- `whereIn` inputs are bounded/chunked to Firebase query limits.
- Explicit pre-check of current stock before opening Razorpay or placing COD.

The client-side validation improves user experience, while the backend transaction is the actual race-condition guard.

### 3.6 Checkout and order API contract

The mobile client calls Firebase callable function `createOrder` with:

```json
{
  "order": {
    "userId": "client value, overwritten by server",
    "orderNumber": "ORD<timestamp>",
    "paymentId": "optional Razorpay payment id",
    "items": [
      {
        "productId": "base Firestore product id",
        "variationId": "optional variation id",
        "title": "display title",
        "unit": "display unit",
        "image": "url",
        "quantity": 1,
        "price": 100,
        "mrp": 120
      }
    ],
    "totalAmount": 100,
    "subtotal": 100,
    "discount": 0,
    "couponDiscount": 0,
    "deliveryFee": 0,
    "orderDate": "ISO date",
    "deliveryAddress": "string",
    "latitude": 19.0,
    "longitude": 75.0,
    "paymentStatus": "paid or pending",
    "orderType": "Online or COD",
    "slotId": "YYYY-MM-DD_HH",
    "couponCode": "optional",
    "deliveryInstruction": "optional"
  }
}
```

Success response:

```json
{
  "success": true,
  "message": "Order processed successfully",
  "orderId": "KF-XXXXXX",
  "slotId": "selected slot id",
  "riderId": "assigned rider id"
}
```

Errors use Firebase callable `HttpsError` categories such as `unauthenticated`, `invalid-argument`, `failed-precondition`, `permission-denied`, and `internal`. Structured `reason` values include `out_of_service_area`, `product_unavailable`, `invalid_quantity`, `insufficient_stock`, `slot_invalid`, `slot_inactive`, `slot_full`, and `slot_full_riders`.

### 3.7 Payment and refund recovery

Online checkout opens Razorpay with the amount in paise, customer prefill, Paytm wallet support, and a single gateway retry. On the mobile success callback, the app calls `createOrder`.

If payment succeeds but order creation fails, the app writes a tightly shaped `failed_orders` recovery record. The `processimmediaterefund` Firestore trigger:

1. Confirms the failure state is eligible.
2. Loads Razorpay credentials from Firebase Secrets.
3. Fetches payment state.
4. Captures an authorized payment if necessary.
5. Rejects non-refundable states.
6. Issues a full refund for a captured payment.
7. Persists refund ID, timestamp, or normalized failure metadata.

The Firestore rules require ownership, positive amount, INR currency, server timestamp, an approved failure status, and initial `pending` refund state.

Security gap: payment authenticity is not verified server-side before `createOrder` trusts `paymentId`/`paymentStatus`, and server totals are not recomputed from authoritative product/coupon records. Production hardening needs server-created Razorpay orders, signature verification/webhooks, idempotency keys, and server-side price/discount/delivery-fee calculation.

### 3.8 Location and maps caching

Location uses a three-level strategy:

1. Last address and coordinates from Hive provide instant UI.
2. A fresh high-accuracy GPS request runs with a ten-second timeout and falls back to balanced accuracy.
3. Reverse geocoding checks local Hive, then a shared Firestore `maps_cache`, then Google Maps.

Coordinates are rounded to four decimals to increase cache reuse for nearby users. Search strings are normalized into document-safe cache keys. Both local and shared cache entries expire after 30 days. If the user moved 150 metres or less, reverse-geocoding is normally skipped. Search and map-tap geocoding are debounced by 800 ms.

This reduces Google Maps API cost and latency. However, allowing every signed-in client to write/delete the shared cache permits cache poisoning and unbounded growth; a production design should proxy Maps calls through an App-Check-enforced backend, validate results, apply TTL cleanup, and rate-limit per user/device/IP.

### 3.9 Offline and cache strategy

The app implements explicit cache-aside/stale-while-revalidate behavior above Firebase:

- Products and categorized groups: Hive serialization.
- Categories: six-hour TTL plus expired-cache error fallback.
- Today's specials and section previews: Hive first, Firestore refresh.
- Cart: durable Hive state with live server revalidation.
- Wishlist: Hive first, Firestore reconciliation, then live product updates.
- Orders: per-user Hive snapshot before the online stream.
- Profile: SharedPreferences first, Firestore refresh.
- Address and theme palette: Hive first.
- Maps results: 30-day device cache plus 30-day shared Firestore cache.
- User personalization: recent views and view counts in Hive.
- Network images: `cached_network_image`; selected recommendation images are proactively warmed at 300×300.

Firestore's mobile SDK also supplies its own offline persistence behavior, but this project does not explicitly tune Firestore cache size or index configuration in Dart. Therefore “Firebase caching” should be described as the combination of SDK behavior and the app's explicit Hive/SharedPreferences layers, not a custom Firebase CDN.

### 3.10 Personalization

The app builds a lightweight, privacy-friendly “recommended for you” list locally:

- A product qualifies after three views or immediately after add-to-cart.
- Recent views are ordered and capped at ten.
- Previously ordered products are merged and de-duplicated.
- The ten live product IDs are refreshed through one bounded `whereIn` listener.
- Product deletions are removed from the UI and cached recent views.

No external ML profile is required and no full behavioral stream is uploaded.

### 3.11 Notifications, themes, stability, and updates

- FCM handles background, foreground, opened-app, and terminated-app notification flows.
- Users opt in/out; the app subscribes to `all_users` for offers and stores/removes a per-user FCM token for transactional order updates.
- Android uses a high-importance channel and custom sound.
- The backend notifies customers on order placement and later status changes.
- Crashlytics receives framework-fatal and uncaught asynchronous errors.
- Firebase App Check uses the debug provider in debug builds and Play Integrity in Android release builds.
- Theme configuration is real-time and cached locally, supporting light/dark mode and server-driven seasonal palettes/branding.
- `app_config/versioning` supports minimum-version/force-update behavior and a “service not available until date” gate.
- Shorebird checks for and installs Dart code-push updates, then prompts for restart.

App Check is activated in the app, but callable functions do not set `enforceAppCheck: true` in source. Console-side enforcement cannot be inferred from the repository.

## 4. Admin control panel (Next.js website/web application)

### 4.1 Purpose and platform

This is a browser-based operations website, not the customer app and not the backend. It uses Next.js App Router, React 19, Tailwind CSS 4, shadcn/Radix components, Zustand, TanStack Table, Recharts, Firebase Web SDK, Algolia, browser image compression, XLSX, and print support.

The root route is a public marketing/landing site. Public routes also include login, forgot password, privacy, and account deletion. `/dashboard/*` is the authenticated operations surface.

The production build successfully compiles and generates 21 static/dynamic application routes.

### 4.2 Authentication and authorization

- Staff sign in with Firebase email/password authentication.
- Firebase Auth uses browser-local persistence.
- Zustand listens to authentication state and loads the matching `users/{uid}` role document.
- Only `ADMIN` and `MANAGEMENT` roles remain logged into the dashboard.
- Admins receive full navigation; management users see modules based on a permission map.
- Supported permissions include product, stock, orders, riders, slots, categories, offers, coupons, theme, settings, sales reports, and audit logs.
- Only an admin can create staff accounts or change another staff user's password through callable backend functions.
- Firestore/Storage rules are the actual data security boundary.

The Next.js middleware's `auth=true` cookie is only a navigation optimization and is forgeable because it is not a signed server session. It must not be described as secure server authorization. Firebase rules still protect direct database access, but a hardened SSR design should exchange Firebase ID tokens for signed, HttpOnly session cookies and validate them server-side.

### 4.3 Dashboard overview and analytics

- Status KPIs use Firestore server-side count aggregations rather than downloading complete collections.
- Gross revenue uses Firestore server-side `sum(totalAmount)` aggregation.
- Five independent aggregates execute concurrently.
- The latest ten orders use a bounded query.
- Customer IDs are de-duplicated and fetched together with a document-ID `in` query rather than an N+1 loop.
- Revenue/order charting is built from at most the latest 1,000 orders and fills missing dates across a 90-day range.
- Recharts provides time-series visualization and TanStack Table renders recent orders.

The 1,000-order chart cap bounds cost but makes the chart incomplete at high volume. A scalable production version should maintain daily rollup documents through event-driven aggregation.

### 4.4 Product management

- Separate Kissan Fresh and Home Food catalogs.
- Create, view, edit, and delete workflows.
- Base products or multiple variations with price, MRP, discount percentage, unit/value, stock, and in-stock state.
- Category selection, tags, origin, description, and multi-image handling.
- Price/MRP/discount fields update each other for consistent form editing.
- Client-side image compression before Firebase Storage upload reduces bandwidth, latency, and storage cost.
- Image migration tooling supports dry-run, apply, and rollback modes using Sharp.
- Product list browsing uses Firestore cursor pagination.
- Text search switches to Algolia with page number, hits-per-page, origin/category/tag/price filters, total hits, and total pages.
- A Firestore write trigger keeps Algolia synchronized on product create/update/delete.
- One-off scripts can rebuild the full index and configure searchable attributes, facets, and an `inStock` ranking preference.

### 4.5 Stock management

- Separate stock screens per catalog origin.
- Base-product and variation-level stock editing.
- Search input is debounced by 300 ms.
- Products are flattened into editable stock rows.
- Filters support category and product search.
- Bulk add-stock supports selecting many rows and applying deltas.
- Stock updates also derive `inStock` flags.
- Firestore rules let users with Stock Management modify only `stockCount`, `inStock`, `variations`, and `updatedAt`, preventing unrelated product edits.

### 4.6 Categories, sections, and merchandising

- Create/edit/delete categories with icon selection for each origin.
- Categories are queried by origin and ordered by name.
- Create/edit/delete merchandising sections with category membership and rank.
- Section rank changes are normalized atomically with a Firestore write batch.
- Category/section subscriptions update the UI in real time.
- A catalog version timestamp is updated so mobile clients can invalidate dependent presentation data.
- Today's Specials selects products for a date, supports filters, and writes a date-keyed curated list.

### 4.7 Coupon management

- Separate coupons for grocery and home-food origins.
- Create, edit, delete, enable, and disable.
- Percentage or fixed discount.
- Global, category-specific, or product-specific applicability.
- Minimum item count/order value and maximum discount where configured.
- Total-use and per-user-use limits.
- Active status and searchable coupon listing.
- Backend order transaction rechecks coupon existence, active state, and global use capacity, then increments usage atomically.

Per-user coupon enforcement currently happens on the client by querying prior orders. It should also be enforced by the backend for adversarial clients.

### 4.8 Orders and logistics

- Cursor-paginated order list with search and status filters.
- Aggregate status counts.
- Batched related user/rider lookups to reduce N+1 reads.
- Full detail page with customer, item, billing, financial, logistics, delivery instruction, and status cards.
- Printable invoice through `react-to-print`.
- Quick and detailed order-status transitions.
- Slot/rider reassignment uses a Firestore transaction that validates the order, target slot, rider membership, availability, and capacity, decrements prior counters, increments new counters, and updates the order atomically.
- Status updates trigger customer FCM notifications.

### 4.9 Rider and slot management

Rider management provides add/edit/delete, active-state changes, phone/vehicle metadata, search, status filtering, and audit logging.

Slot management provides:

- Real-time chronologically ordered slot monitoring.
- Active/inactive and locked/unlocked controls.
- Per-slot rider membership and capacity.
- Assign/remove rider transactions with capacity recalculation.
- Delete one slot or all slots for a date using bounded/batched mutations.
- Configurable active operating hours.
- Manual invocation of the protected slot-generation function.
- Daily scheduled generation at midnight Asia/Kolkata for today and tomorrow.
- Capacity derived as active riders × six orders per rider.
- Firestore write batches are committed before 500-operation limits (threshold 400).
- Generation skips existing slot documents, making normal reruns mostly idempotent.

### 4.10 Offers and notifications

- Staff compose offer title/body, optional compressed image, instant/scheduled mode, and target time.
- Instant offers trigger immediately when a pending notification document is created.
- Scheduled offers are scanned every four hours and sent when due.
- Offers broadcast to FCM topic `all_users` and persist SENT/FAILED state and error details.
- The browser dashboard registers approved devices in `dashboard_tokens` and shows foreground toasts.
- New orders notify the purchasing customer, all registered admin-app devices, and all registered dashboard browsers.
- Multicast responses remove invalid/unregistered admin and dashboard tokens in a batch.

FCM multicast is limited by the provider's token-per-call cap. The current backend loads all admin/dashboard tokens and sends a single multicast request, so it assumes a small staff-device set. It is not intended for a million consumer tokens; consumer offers correctly use an FCM topic.

### 4.11 Theme and settings management

- Staff can define named themes, activate one theme, edit palette fields, attach a theme/header image, and validate six-digit hex colors.
- Saving updates Firestore configuration consumed live by the consumer app.
- Settings control application-level operational flags stored in configuration documents.
- The consumer app caches theme data while listening for server changes.

### 4.12 Reports, exports, and audit trail

- Sales report filters by date range and computes total orders, delivered orders, and gross revenue.
- Web reports export XLSX.
- Audit logs use cursor pagination, default page size 20, timestamp-descending ordering, and XLSX export.
- Admin mutations call a shared logger that stores action, entity type/ID, details, authenticated user ID/email, and server timestamp.
- Rules make audit logs append-only and require the stored ID/email to match authentication claims.

Large date-range exports currently read all matching order documents into the browser. At very high volume, exports should become asynchronous backend jobs that write a file to Storage and notify the requester.

## 5. Admin monitor (Flutter application)

This is a separate staff mobile application, not the Next.js website and not the consumer app.

Implemented features:

- Firebase email/password login restricted to admin/management roles.
- Server-configured minimum admin-app version and external update link.
- FCM permission, token registration in `admin_tokens/{token}`, foreground handling, notification-open handling, and terminated-state handling.
- Haptic feedback and an in-app alert dialog for foreground orders.
- Real-time latest-order feed ordered by `createdAt`, limited to 20.
- Today's live stats stream.
- Streams are initialized once, and the daily stats stream is replaced after midnight.
- Customer and rider names/phones are cached in memory, with pending-fetch sets preventing duplicate simultaneous reads.
- Detailed order bottom sheets and operational status display.
- Dark/glassmorphic responsive UI and real-time clock.
- Sales export for a selected date range to an XLSX file and native share sheet.
- Audit-log live view limited to 50, export limited to 200.
- Logger service that never breaks the primary flow when logging fails.

Its README references the older single `admin_config/fcm` token design, while current code correctly uses a multi-device `admin_tokens` collection. Source code is authoritative.

## 6. Backend (Firebase serverless backend)

### 6.1 Backend services

- Firebase Authentication: phone OTP for consumers; email/password for staff.
- Cloud Firestore: operational database and real-time streams.
- Firebase Storage: product, theme, offer, and profile images.
- Cloud Functions v2 in `us-central1`, Node.js 24 in the dashboard backend package.
- Firebase Cloud Messaging: transactional and campaign notifications.
- Firebase App Check client integration.
- Razorpay: mobile payment UI and server-side refund processing.
- Algolia: product search for the admin website.
- Google Maps API: geocoding from the consumer client with two-layer result caching.
- Shorebird: consumer app OTA Dart updates.
- Crashlytics: consumer mobile crash reporting.

### 6.2 Cloud Functions inventory

| Function | Trigger | Responsibility |
|---|---|---|
| `generateDailySlots` | Schedule, midnight IST | Generate today/tomorrow slots and rider capacity; retry up to 3 times |
| `manualGenerateSlots` | Callable | Permission-checked manual slot generation |
| `processimmediaterefund` | `failed_orders` create | Capture eligible payment if needed and issue full Razorpay refund |
| `createOrder` | Callable | Authenticated transactional order, stock, coupon, slot, and rider allocation |
| `onOrderStatusUpdate` | `orders` update | Notify customer only when status changes |
| `syncProductToAlgolia` | `products` write | Create/update/delete Algolia product record using Firebase Secrets |
| `onInstantOfferCreated` | offer create | Send pending instant campaign to `all_users` |
| `processScheduledOffers` | Every 4 hours IST | Send due scheduled campaigns; retry scheduler up to 3 times |
| `createUser` | Callable | Admin-only Firebase Auth + staff profile creation |
| `updateUserPassword` | Callable | Admin-only password change |

The consumer repository contains an older/partial copy of some backend functions. The dashboard `functions/index.js` is the fuller source and should be treated as the deployment source unless deployment configuration proves otherwise. Maintaining two copies is a drift risk.

### 6.3 Transactional order algorithm

Within one Firestore transaction, `createOrder`:

1. Requires Firebase authentication and at least one item.
2. Uses the server-authenticated UID, ignoring any client ownership claim.
3. Applies a server-side Haversine check against the 30 km service radius when coordinates are present.
4. Requires a delivery slot ID.
5. Loads the customer name.
6. Loads a normalized coupon by code and checks active/global capacity.
7. De-duplicates product IDs and uses one `transaction.getAll` call.
8. Rejects missing products and invalid quantities.
9. Resolves the selected variation and checks/decrements stock.
10. Marks exhausted base products/variations out of stock.
11. Loads and validates active/unlocked slot capacity.
12. Queries one rider with `assignedOrders < 6`, ordered least-loaded first.
13. Generates a human-readable `KF-XXXXXX` ID and checks collision once.
14. Writes every changed product, coupon usage, slot counter, rider counter, and the enriched order atomically.
15. Returns only after commit.

Firestore automatically retries transactions after contention, which protects correctness under normal races. Hot product/slot/coupon documents still impose a write-throughput ceiling; retries are correctness behavior, not unlimited horizontal capacity.

### 6.4 Data model

Principal collections:

- `products`: catalog, images, price/MRP, origin, category/tags, variations, stock.
- `categories`: origin-scoped category metadata and icons.
- `sections`: ranked dynamic merchandising groups and category membership.
- `todays_specials`: date-keyed curated product references.
- `coupons`: code, type/value, scope, thresholds, active state, usage counters.
- `users`: consumer/staff profile, role, permissions, addresses, wishlist, FCM token.
- `orders`: items, client checkout totals, delivery details, payment metadata, status, slot/rider assignment, timestamps.
- `riders`: rider identity, phone, vehicle, and active status.
- `slots`: time window, active/locked state, capacity and assigned count.
- `slots/{slot}/riders`: per-rider capacity and assignment count.
- `config/slots`: active delivery hours.
- `app_config/versioning`: themes, version/update flags, service date, header configuration.
- `admin_config`: admin-only operational configuration.
- `admin_tokens`: admin-app FCM devices.
- `dashboard_tokens`: browser-dashboard FCM devices.
- `offer_notifications`: instant/scheduled campaign queue and status.
- `failed_orders`: client-created, tightly constrained payment recovery request.
- `audit_logs`: append-only staff action records.
- `maps_cache`: shared geocoding results.

### 6.5 Firestore and Storage security

Rules default-deny unmatched documents.

- Public reads: products, categories, sections, coupons, today's specials, app configuration.
- Consumer profile: owner creates only a consumer role without permissions; owner may update only an explicit safe-field allowlist.
- Orders: direct client creation/deletion denied; consumers can read only their own and perform a narrow soft-deletion/anonymization update.
- Administrative writes: controlled by ADMIN or MANAGEMENT plus named permissions.
- Audit logs: create-only for staff with matching authenticated identity; no update/delete.
- Staff/device tokens: self-owned writes; no reads through client SDK.
- Failed orders: strict allowed keys, ownership, enum states, positive numeric amount, INR, and server time.
- Map cache: authenticated get/write/delete, no list.
- Storage: public image reads; staff permission-gated product/theme/offer writes; owner-only `profile_images/{uid}.jpg`; MIME and size limits (5 MB staff media, 3 MB profile images); default deny.

Six rules-test cases exist for public catalog/staff writes, profile privilege escalation, order ownership/direct-create denial, failed-order ownership, audit identity/immutability, and path-scoped image writes.

## 7. Performance and query optimization inventory

### Implemented

- Serverless managed scaling through Firebase services.
- Cursor pagination (`startAfter`/`startAfterDocument`) for products, orders, audit logs, and mobile browse flows.
- Explicit `limit` bounds throughout high-traffic screens.
- Firestore aggregate count/sum queries for dashboard KPIs.
- `Promise.all`/`Future.wait` for independent I/O.
- Bounded concurrency of three for category/section preview loads.
- `getAll`/`whereIn` batch reads to reduce N+1 access.
- De-duplicated related-entity IDs before reads.
- In-memory rider, slot, customer, search-result, and admin lookup caches.
- Persistent Hive cache-aside layers and stale-while-revalidate UI.
- Cursor-based tail loading uses one-time reads while only the first page is live.
- Request-generation/search tokens prevent stale-response races.
- Search/geocoding debounce reduces request amplification.
- 150 m movement threshold and rounded coordinates reduce Geocoding calls.
- Shared 30-day geocoding cache amortizes third-party API costs across users.
- Client image compression and image migration tooling reduce bytes and Storage cost.
- Network image disk/memory caching and targeted image prewarming.
- Batched writes below Firestore's operation limit.
- Transactional counters and inventory prevent oversell/overbooking races.
- Algolia offloads admin text search and supports facets/ranking/pagination.
- FCM topics provide scalable fan-out for consumer offer campaigns.
- Invalid staff/browser FCM token cleanup prevents repeated send failures.
- Async optional notification initialization avoids blocking first paint.
- Lazy bottom-tab construction avoids initializing every screen immediately.
- Next.js prerenders public/static routes and dynamically renders parameterized routes.

### Not implemented or not provable from source

- No custom per-IP, per-user, per-device, or per-endpoint backend rate limiting.
- No `enforceAppCheck: true` on callable functions in source.
- No repository-managed `firestore.indexes.json`; composite indexes may exist only in the Firebase console and therefore are not reproducible from code.
- No load tests, stress tests, SLOs, p95/p99 latency metrics, capacity calculations, or proof of one-million-user traffic.
- No CDN/edge cache for API responses because there are no conventional HTTP API routes.
- No Redis/Memorystore distributed cache.
- No backend idempotency key for order creation or refunds.
- No queue between order commits and all post-commit work.
- No daily analytics rollup documents.
- No database sharding or distributed counters.
- No server-side payment signature/webhook verification.
- No authoritative server-side reconstruction of order prices and discounts.
- No explicit Cloud Function min/max instances, concurrency, memory, timeout, or cost guardrails.
- No automated Cloud Function unit/integration tests visible beyond security-rule tests.

Firebase Auth may return `too-many-requests`, and Firebase/Google services enforce provider quotas, but that is not equivalent to an application-defined rate-limiting policy.

## 8. Honest one-million-user readiness assessment

### What already helps at large scale

- Stateless serverless execution avoids managing a fixed application-server fleet.
- Reads are generally bounded and paginated.
- Device caches reduce repeated catalog/profile/order/map reads.
- Algolia handles indexed admin search.
- FCM topics avoid iterating over consumer tokens for marketing sends.
- Transactions preserve correctness during concurrent stock and capacity changes.
- Public catalog data has a read-friendly security model.
- Aggregate queries avoid downloading entire order collections for KPIs.

### Current blockers and bottlenecks

1. **Hot transactional documents.** Popular product documents, a selected slot, its least-loaded rider, and a global coupon counter are updated for each order. These become contention points well before one million concurrent purchasers.
2. **Trust boundary.** Client totals/payment state can be forged. A high-scale commerce system needs authoritative pricing and verified payment state.
3. **No idempotency.** Client retries or function ambiguity can produce duplicate business operations.
4. **No custom abuse control.** Authentication endpoints, Maps cache writes, order placement, and failed-order creation need layered rate limits and App Check enforcement.
5. **Consumer search cap.** Text search sees at most 400 products per origin.
6. **Real-time listener cost.** Every user can hold several catalog/config/order listeners. At a million active clients, read amplification and reconnect bursts require modeling.
7. **Unbounded/full reads in admin workflows.** Some coupon/product/slot/report screens and exports load whole collections or date ranges.
8. **Analytics approximation.** The dashboard's 90-day chart only aggregates the latest 1,000 orders.
9. **Index configuration missing from source.** Compound query deployments are not reproducible.
10. **Maps cache security/TTL.** Client-writable shared cache can be polluted and expired entries rely on opportunistic deletion.
11. **Duplicate backend source.** Two function directories can drift and cause deployment ambiguity.
12. **Region placement.** Functions are in `us-central1` while the business/time zone is India, creating avoidable latency unless Firestore is deliberately colocated there.

### Recommended scale architecture

For a credible one-million-user target:

1. Select India/Asia regions for Functions and Firestore together, based on measured user geography and Firebase-supported region combinations.
2. Make checkout server-authoritative: load product prices, calculate promotions/tax/fees, create Razorpay orders server-side, verify signatures/webhooks, and keep secrets server-only.
3. Add an idempotency key per checkout and a server-side idempotency record/state machine.
4. Enforce App Check on callable functions and sensitive Firebase products; combine it with per-UID/device/IP quotas at an API gateway or trusted backend.
5. Replace single hot counters with sharded counters, reservation/bucket models, or queue-backed inventory allocation appropriate to expected SKU/slot contention.
6. Split order commit from notification/indexing/reporting work using Cloud Tasks or Pub/Sub, with retries and dead-letter handling.
7. Move all consumer catalog search to Algolia and use secured search keys with enforced filters.
8. Generate daily/hourly aggregate documents on order events; read rollups for dashboards instead of recent raw orders.
9. Convert large exports to asynchronous jobs with pagination, Storage output, expiration, and completion notification.
10. Commit all required composite indexes to `firestore.indexes.json` and validate them in CI/emulators.
11. Add Cloud Function unit/integration tests, payment webhook tests, transaction-contention tests, and emulator end-to-end tests.
12. Run staged load tests against a production-like project; publish throughput, error rate, p50/p95/p99 latency, contention retries, read/write cost per order, cold starts, and recovery behavior.
13. Add structured logging, trace correlation IDs, alerts, budget controls, SLOs, dashboards, and incident runbooks.
14. Configure function concurrency/min instances/timeouts deliberately after measurement.
15. Put shared maps/geocoding behind a backend, validate inputs, use managed TTL, and prevent clients from modifying global cached results.

Only after those changes and measured tests should the project claim it “supports one million users.” Also define the target precisely: one million registered users, monthly active users, daily active users, simultaneously connected clients, or concurrent checkout requests are radically different capacity requirements.

## 9. Senior engineering highlights suitable for a portfolio

- Designed a multi-client architecture with a Flutter consumer app, Next.js operations website, dedicated Flutter admin monitor, and event-driven Firebase backend.
- Built a transactional checkout allocator that atomically coordinates inventory, product variations, coupons, delivery-slot capacity, rider capacity, and order creation.
- Designed payment-failure compensation using a durable failure record and automated Razorpay refund trigger.
- Implemented stale-while-revalidate UX with Hive, SharedPreferences, Firestore listeners, request-generation guards, and targeted image warming.
- Reduced read amplification through cursor pagination, bounded queries, batched `whereIn`/`getAll` reads, aggregate queries, de-duplication, and bounded concurrency.
- Reduced third-party geocoding cost through coordinate normalization, movement thresholds, a device cache, and a shared TTL cache.
- Implemented granular RBAC consistently across navigation, callable functions, Firestore rules, and Storage rules.
- Designed multi-channel notifications for customers, mobile admins, browser admins, and topic-based marketing, including invalid-token cleanup.
- Decoupled product search from Firestore in the admin website with event-driven Algolia synchronization, facet configuration, and ranked search.
- Added server-driven themes, maintenance/service-date gates, mandatory versions, Shorebird OTA delivery, Crashlytics, and dynamic branding.
- Added reproducible security-rule tests and default-deny database/storage policies.

Use these claims as implemented achievements. Describe million-user capability as a goal/path unless verified load-test evidence is added.

## 10. Known quality and maintenance risks

- The mobile `OrdersController.loadOrders` opens a new snapshot listener on each filter/load call without retaining/cancelling the previous subscription. This can duplicate reads and callbacks.
- The short order ID retries collision generation only once and does not verify the second generated ID.
- The service-area backend check is skipped when coordinates are absent; address text alone can pass client validation.
- Product variation fallback silently selects the first variation when the provided variation ID is missing or invalid.
- Coupon per-user limits and scope/discount calculation are not fully revalidated server-side.
- Notification and Algolia triggers catch/log errors rather than routing persistent failures to a dead-letter/retry workflow.
- Scheduled offers run every four hours, so delivery can be delayed by almost four hours.
- Slot generation performs a read per prospective slot to test existence; bulk `getAll` or deterministic merge strategy would be cheaper at larger horizons.
- Some admin screens use unrestricted real-time collection listeners, which should be paginated at large data volume.
- Secrets and signing artifacts require a separate security review. The consumer workspace contains a keystore file and `.env`; ensure sensitive artifacts are excluded from version control and rotated if ever exposed.
- The two backend function copies use different Node/Firebase package versions.

## 11. Verification status

- Next.js production build: passed on 5 September 2026; all reported routes compiled/generated.
- Firebase rule tests: six test groups are present, but execution could not start because Java is not installed/on PATH in the audit environment.
- Flutter static analysis: attempted, but the Flutter analyzer did not finish or emit a result in the available audit window; no pass is claimed.
- No code was changed as part of the audit except adding this documentation file.

## 12. Short AI-ready project description

Kissan Fresh is a Firebase-backed, multi-surface grocery and home-food commerce platform. Customers use a Flutter app with GetX, Hive offline caches, phone OTP, dynamic catalog merchandising, local/voice search, live inventory, wishlist, cart, coupons, Google Maps address selection, delivery slots, Razorpay/COD checkout, order tracking, FCM, PDF receipts, server-driven themes, Crashlytics, App Check, and Shorebird OTA updates. Staff use a Next.js/React web dashboard for catalog, variations, compressed images, stock, categories, ranked sections, daily specials, coupons, riders, slots, orders, invoices, reports, audit logs, permissions, themes, settings, Algolia search, and browser notifications. A separate Flutter admin app provides real-time order monitoring, mobile FCM alerts, cached related-user/rider lookups, version gating, and Excel exports. Firebase Cloud Functions implement scheduled slot generation, atomic order/inventory/coupon/slot/rider allocation, payment-failure refunds, order-status notifications, product-to-Algolia synchronization, scheduled/instant offers, and protected staff administration. Security is enforced primarily with default-deny Firestore/Storage rules and granular ADMIN/MANAGEMENT permissions. The code is optimized with bounded queries, cursor pagination, batched reads/writes, aggregate queries, concurrency limits, cache-aside/stale-while-revalidate patterns, image compression, and topic-based messaging. These are strong scale foundations, but one-million-user production readiness still requires server-authoritative payment/pricing, idempotency, enforced App Check, custom rate limits, hot-document mitigation, committed indexes, async work queues, rollup analytics, observability, and measured load testing.
