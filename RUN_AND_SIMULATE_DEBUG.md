# Run and simulate Kissan Fresh development

The development app and dashboard use Firebase project
`kissan-fresh-development`. Production is not involved except that some copied
catalog documents still reference production-hosted product images.

## 1. Run the Flutter app from Android Studio

1. Open `C:\Users\asdan\StudioProjects\kissan-fresh-app` in Android Studio.
2. Wait for Flutter/Gradle synchronization to finish.
3. Start an Android emulator or connect a USB-debugging-enabled Android phone.
4. In the Run/Debug selector, choose **00 - Kissan Fresh Dev**. This shared
   configuration is intentionally sorted first and supplies the `dev` flavor,
   `lib/main_dev.dart`, and `config/dev.json` automatically.
5. Click Run or Debug.

If Android Studio instead shows an automatically generated `main.dart`
configuration, that now works too: the Flutter project declares `dev` as its
default flavor and `lib/main.dart` boots the development environment.

Equivalent terminal command:

```powershell
cd C:\Users\asdan\StudioProjects\kissan-fresh-app
flutter run --flavor dev -t lib/main_dev.dart --dart-define-from-file=config/dev.json
```

The installed application is named **Kissan Fresh Debug** and uses package ID
`com.kissanfresh.app.debug`, so it can coexist with production.

For a manual Flutter login, open the dashboard repository's gitignored
`.debug-test-credentials.json`, use the `phone.number` value without `+91` in
the phone field, and then use its fixed `phone.otp`. No SMS is sent.

## 2. Run the development dashboard

```powershell
cd C:\KissanFreshDashboard
npm run dev:debug
```

Open `http://localhost:3000`. If that port is occupied, Next.js prints the
alternative URL. Sign in with the `admin.email` and `admin.password` values in
the gitignored `.debug-test-credentials.json` file.

## 3. Simulate wallet credit manually

1. In the Flutter dev app, log in with the test phone and fixed OTP.
2. Finish onboarding, add an address inside the supported service area, add a
   product, select one of tomorrow's seeded slots, and place an order using
   Razorpay test mode or COD if offered.
3. Open that order in Dashboard > Order Management.
4. In **Debug: unavailable items — wallet credit or bank refund**, enter the
   unavailable/damaged quantity for one or more item lines. **Kissan Fresh
   wallet** is selected by default; enter a reason and click Preview.
5. Confirm once. Repeated clicks are protected by an idempotency key and the
   server prevents refunding more than the purchased quantity.
6. In the Flutter app, open Settings > Kissan Fresh Wallet and pull to refresh.
7. Place another order. The debug checkout automatically uses wallet balance
   first and sends only any remainder to Razorpay.

## 4. Admin-only original-payment refund

Customers cannot withdraw wallet balance in the app. If they contact the owner
and an admin approves a payout, the admin may choose **Bank / original payment
source — admin only** in the order adjustment card. For a captured Razorpay
payment, Razorpay returns the amount to the original UPI/card/bank route; the
dashboard never accepts or stores arbitrary customer bank-account details.

## 5. Simulate unavailable source refund fallback

For a COD order or synthetic order without a Razorpay payment ID:

1. Choose **Bank / original payment source — admin only** in the dashboard
   adjustment card.
2. Confirmation is rejected because there is no captured source payment.
3. The backend releases the refundable-quantity reservation.
4. Select the same item again and issue **Kissan Fresh wallet** credit.

## 6. Automated live-cloud simulation

The automated test creates isolated synthetic orders and verifies source-refund
rejection, reservation release, wallet credit and wallet-funded checkout:

```powershell
cd C:\KissanFreshDashboard
npm run test:debug:wallet-e2e
```

Expected result:

```text
PASS source refund unavailable -> reservation released
PASS admin wallet credit: 10000 paise
PASS wallet-funded checkout: KF-......
PASS ending wallet balance restored to 0 paise
```

To refresh synthetic users, the debug product, rider and tomorrow's slots:

```powershell
npm run data:debug:seed
```

## 7. Simulate a successful Razorpay source refund

This requires a captured Razorpay test payment; a fake payment ID is correctly
rejected. Place an online order through the Flutter dev app using Razorpay's
test checkout, wait until the payment is captured, then select **Original
payment source — admin only** for an item in the dashboard. Verify the refund in the
Razorpay test dashboard and in `debug_order_adjustments`.

Never use a live Razorpay payment in this environment.
