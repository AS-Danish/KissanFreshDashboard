import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const PROJECT_ID = "kissan-fresh-development";
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const credentials = JSON.parse(await readFile(resolve(".debug-test-credentials.json"), "utf8"));

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { "content-type": "application/json", ...(options.headers || {}) },
  });
  const body = await response.json();
  if (!response.ok || body.error) {
    const error = new Error(JSON.stringify(body.error || body));
    error.body = body;
    throw error;
  }
  return body;
}

async function signIn({ email, password }) {
  return request(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`, {
    method: "POST",
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
}

async function callable(name, idToken, data = {}) {
  const body = await request(
    `https://us-central1-${PROJECT_ID}.cloudfunctions.net/${name}`,
    {
      method: "POST",
      headers: { authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ data }),
    },
  );
  return body.result;
}

function value(input) {
  if (input === null) return { nullValue: null };
  if (input instanceof Date) return { timestampValue: input.toISOString() };
  if (Array.isArray(input)) return { arrayValue: { values: input.map(value) } };
  if (typeof input === "boolean") return { booleanValue: input };
  if (typeof input === "number") {
    return Number.isInteger(input) ? { integerValue: String(input) } : { doubleValue: input };
  }
  if (typeof input === "object") return { mapValue: { fields: fields(input) } };
  return { stringValue: String(input) };
}
function fields(object) {
  return Object.fromEntries(Object.entries(object).map(([key, item]) => [key, value(item)]));
}

const require = createRequire(import.meta.url);
const cliAuth = require(resolve(process.env.APPDATA,
  "npm/node_modules/firebase-tools/lib/auth.js"));
const account = cliAuth.getGlobalDefaultAccount();
const tokens = await cliAuth.getAccessToken(account.tokens.refresh_token, account.tokens.scopes);
const adminAuthorization = `Bearer ${tokens.access_token}`;
const documentBase = `projects/${PROJECT_ID}/databases/(default)/documents`;

async function setDocument(path, data) {
  await request(`https://firestore.googleapis.com/v1/${documentBase}/${path}`, {
    method: "PATCH",
    headers: { authorization: adminAuthorization },
    body: JSON.stringify({ fields: fields(data) }),
  });
}

const [adminUser, customerUser] = await Promise.all([
  signIn(credentials.admin),
  signIn(credentials.customer),
]);
const walletBefore = await callable("getDebugWallet", customerUser.idToken);
const startingBalance = Number(walletBefore.balancePaise || 0);
const runId = Date.now().toString(36);
const refundOrderId = `KF-E2E-${runId}`;

await setDocument(`orders/${refundOrderId}`, {
  id: refundOrderId,
  userId: customerUser.localId,
  customerName: "Development Customer",
  status: "ASSIGNED",
  paymentStatus: "paid",
  orderType: "COD_TEST",
  subtotal: 200,
  discount: 0,
  couponDiscount: 0,
  deliveryFee: 30,
  totalAmount: 230,
  orderDate: new Date(),
  items: [{
    productId: "debug-wallet-test-product",
    variationId: null,
    title: "Debug Wallet Test Product",
    unit: "1 item",
    quantity: 2,
    price: 100,
    mrp: 100,
  }],
  debugOnly: true,
});

let sourceRefundRejected = false;
try {
  await callable("createDebugOrderAdjustment", adminUser.idToken, {
    orderId: refundOrderId,
    lines: [{ lineIndex: 0, quantity: 1 }],
    destination: "SOURCE_REFUND",
    reason: "E2E source-refund-unavailable test",
    idempotencyKey: `source_fail_${runId}`,
  });
} catch (error) {
  sourceRefundRejected = error.message.includes("Source refund is unavailable") ||
    error.message.includes("FAILED_PRECONDITION");
}
if (!sourceRefundRejected) throw new Error("Expected source refund to be rejected.");

const preview = await callable("previewDebugOrderAdjustment", adminUser.idToken, {
  orderId: refundOrderId,
  lines: [{ lineIndex: 0, quantity: 1 }],
});
if (Number(preview.amountPaise) !== 10000) {
  throw new Error(`Expected a 10000 paise preview, received ${preview.amountPaise}.`);
}

const credit = await callable("createDebugOrderAdjustment", adminUser.idToken, {
  orderId: refundOrderId,
  lines: [{ lineIndex: 0, quantity: 1 }],
  destination: "WALLET",
  reason: "E2E damaged item wallet credit",
  idempotencyKey: `wallet_credit_${runId}`,
});
if (credit.status !== "SUCCEEDED" || Number(credit.amountPaise) !== 10000) {
  throw new Error(`Wallet credit failed: ${JSON.stringify(credit)}`);
}

const afterCredit = await callable("getDebugWallet", customerUser.idToken);
if (Number(afterCredit.balancePaise) !== startingBalance + 10000) {
  throw new Error("Wallet balance did not increase atomically.");
}

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
});
const tomorrow = dateFormatter.format(new Date(Date.now() + 24 * 60 * 60 * 1000));

// Keep this test self-contained. The dashboard seed command may have been run
// on an earlier day, so never assume tomorrow's product/slot/rider fixtures
// still exist when verifying wallet-funded checkout.
await Promise.all([
  setDocument("products/debug-wallet-test-product", {
    title: "Debug Wallet Test Product",
    name: "Debug Wallet Test Product",
    productType: "grocery",
    price: 100,
    mrp: 100,
    stockCount: 50,
    inStock: true,
    hasVariations: false,
    debugOnly: true,
  }),
  setDocument(`slots/${tomorrow}_08`, {
    isActive: true,
    isLocked: false,
    capacity: 6,
    assignedOrders: 0,
    debugOnly: true,
  }),
  setDocument(`slots/${tomorrow}_08/riders/debug-rider-001`, {
    riderId: "RDEBUG1",
    assignedOrders: 0,
    maxOrders: 6,
    debugOnly: true,
  }),
]);

const checkout = await callable("createOrder", customerUser.idToken, {
  order: {
    id: "",
    userId: customerUser.localId,
    orderNumber: `E2E-${runId}`,
    items: [{
      productId: "debug-wallet-test-product",
      variationId: null,
      title: "Debug Wallet Test Product",
      unit: "1 item",
      quantity: 1,
      price: 100,
      mrp: 100,
    }],
    totalAmount: 100,
    subtotal: 100,
    discount: 0,
    couponDiscount: 0,
    deliveryFee: 0,
    orderDate: new Date().toISOString(),
    status: "PROCESSING",
    deliveryAddress: "Development test address",
    paymentStatus: "paid",
    orderType: "Wallet",
    slotId: `${tomorrow}_08`,
    walletAppliedPaise: 10000,
  },
});
if (!checkout.success || !checkout.orderId) {
  throw new Error(`Wallet checkout failed: ${JSON.stringify(checkout)}`);
}

const afterDebit = await callable("getDebugWallet", customerUser.idToken);
if (Number(afterDebit.balancePaise) !== startingBalance) {
  throw new Error(`Expected ending balance ${startingBalance}, received ${afterDebit.balancePaise}.`);
}

console.log("PASS source refund unavailable -> reservation released");
console.log("PASS admin wallet credit: 10000 paise");
console.log(`PASS wallet-funded checkout: ${checkout.orderId}`);
console.log(`PASS ending wallet balance restored to ${startingBalance} paise`);
