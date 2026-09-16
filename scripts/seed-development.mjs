import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createRequire } from "node:module";

const PROJECT_ID = "kissan-fresh-development";
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
if (!API_KEY) throw new Error("Load .env.debug.local before running this script.");

const credentials = JSON.parse(await readFile(resolve(".debug-test-credentials.json"), "utf8"));
const require = createRequire(import.meta.url);
const auth = require(resolve(process.env.APPDATA,
  "npm/node_modules/firebase-tools/lib/auth.js"));
const account = auth.getGlobalDefaultAccount();
const tokens = await auth.getAccessToken(account.tokens.refresh_token, account.tokens.scopes);
const authorization = `Bearer ${tokens.access_token}`;

async function jsonRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { "content-type": "application/json", ...(options.headers || {}) },
  });
  const body = await response.json();
  if (!response.ok) throw new Error(`${response.status}: ${JSON.stringify(body)}`);
  return body;
}

await jsonRequest(
  `https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT_ID}/config?updateMask=signIn.email`,
  {
    method: "PATCH",
    headers: { authorization },
    body: JSON.stringify({ signIn: { email: { enabled: true, passwordRequired: true } } }),
  },
);
await jsonRequest(
  `https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT_ID}/config?updateMask=signIn.phoneNumber`,
  {
    method: "PATCH",
    headers: { authorization },
    body: JSON.stringify({
      signIn: {
        phoneNumber: {
          enabled: true,
          testPhoneNumbers: { [credentials.phone.number]: credentials.phone.otp },
        },
      },
    }),
  },
);

async function ensureUser({ email, password }) {
  const endpoint = (method) =>
    `https://identitytoolkit.googleapis.com/v1/accounts:${method}?key=${API_KEY}`;
  try {
    return await jsonRequest(endpoint("signInWithPassword"), {
      method: "POST",
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    });
  } catch (error) {
    if (!String(error.message).includes("EMAIL_NOT_FOUND") &&
        !String(error.message).includes("INVALID_LOGIN_CREDENTIALS")) throw error;
    return jsonRequest(endpoint("signUp"), {
      method: "POST",
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    });
  }
}

const [adminUser, customerUser] = await Promise.all([
  ensureUser(credentials.admin),
  ensureUser(credentials.customer),
]);

function value(input) {
  if (input === null) return { nullValue: null };
  if (input instanceof Date) return { timestampValue: input.toISOString() };
  if (Array.isArray(input)) return { arrayValue: { values: input.map(value) } };
  if (typeof input === "boolean") return { booleanValue: input };
  if (typeof input === "number") {
    return Number.isInteger(input) ? { integerValue: String(input) } : { doubleValue: input };
  }
  if (typeof input === "object") {
    return { mapValue: { fields: fields(input) } };
  }
  return { stringValue: String(input) };
}

function fields(object) {
  return Object.fromEntries(Object.entries(object).map(([key, item]) => [key, value(item)]));
}

const documentBase = `projects/${PROJECT_ID}/databases/(default)/documents`;
const writes = [];
function setDocument(path, data) {
  writes.push({ update: { name: `${documentBase}/${path}`, fields: fields(data) } });
}

setDocument(`users/${adminUser.localId}`, {
  id: adminUser.localId,
  name: "Development Admin",
  email: credentials.admin.email,
  role: "ADMIN",
  permissions: {},
  debugAccount: true,
  createdAt: new Date(),
});
setDocument(`users/${customerUser.localId}`, {
  id: customerUser.localId,
  name: "Development Customer",
  email: credentials.customer.email,
  phoneNumber: "+919999900001",
  role: "user",
  debugAccount: true,
  onboardingCompleted: true,
  createdAt: new Date(),
});
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
  createdAt: new Date(),
});
setDocument("riders/debug-rider-001", {
  riderId: "RDEBUG1",
  name: "Development Rider",
  phone: "+919999900002",
  vehicleNumber: "MH-DEBUG-01",
  status: "ACTIVE",
  totalDeliveries: 0,
  rating: 5,
  debugOnly: true,
  createdAt: new Date(),
});

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
});
const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
const date = dateFormatter.format(tomorrow);
for (const hour of [8, 10, 12, 14, 16, 18]) {
  const hh = String(hour).padStart(2, "0");
  const end = String(hour + 1).padStart(2, "0");
  const slotId = `${date}_${hh}`;
  setDocument(`slots/${slotId}`, {
    startTime: new Date(`${date}T${hh}:00:00+05:30`),
    endTime: new Date(`${date}T${end}:00:00+05:30`),
    isActive: true,
    isLocked: false,
    capacity: 6,
    assignedOrders: 0,
    debugOnly: true,
    createdAt: new Date(),
  });
  setDocument(`slots/${slotId}/riders/debug-rider-001`, {
    riderId: "RDEBUG1",
    maxOrders: 6,
    assignedOrders: 0,
    debugOnly: true,
    createdAt: new Date(),
  });
}
setDocument("config/slots", { activeHours: [8, 10, 12, 14, 16, 18] });

await jsonRequest(`https://firestore.googleapis.com/v1/${documentBase}:commit`, {
  method: "POST",
  headers: { authorization },
  body: JSON.stringify({ writes }),
});

console.log(`Seeded admin user ${adminUser.localId}`);
console.log(`Seeded customer user ${customerUser.localId}`);
console.log("Seeded 1 product, 1 rider, 6 tomorrow slots and slot assignments.");
console.log("Enabled the configured Firebase test phone number for Flutter login.");
