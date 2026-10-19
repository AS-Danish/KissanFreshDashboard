import { createRequire } from "node:module";
import { resolve } from "node:path";
import { readFileSync, existsSync } from "node:fs";

// Load environment variables from .env.local if present
const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, "utf8");
  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const APP_ID = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || "FDBQVGPYJY";
const ADMIN_KEY = process.env.NEXT_PUBLIC_ALGOLIA_ADMIN_API_KEY || process.env.ALGOLIA_ADMIN_KEY || "7c9380ef3b3e8e2c22514224aa06e1e1";
const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "kissanfresh-a72c1";

if (!APP_ID || !ADMIN_KEY) {
  console.error("Missing Algolia credentials. Please set NEXT_PUBLIC_ALGOLIA_APP_ID and NEXT_PUBLIC_ALGOLIA_ADMIN_API_KEY.");
  process.exit(1);
}

// Dynamically require algoliasearch
const require = createRequire(import.meta.url);
const algoliasearch = require("algoliasearch");
const client = algoliasearch(APP_ID, ADMIN_KEY);

// Auth with Firebase Tools token
if (!process.env.APPDATA) throw new Error("APPDATA is unavailable.");
const auth = require(resolve(process.env.APPDATA, "npm/node_modules/firebase-tools/lib/auth.js"));
const account = auth.getGlobalDefaultAccount();
if (!account?.tokens?.refresh_token) {
  throw new Error("No authenticated Firebase CLI session found. Run 'firebase login' first.");
}
const tokens = await auth.getAccessToken(account.tokens.refresh_token, account.tokens.scopes);
const authorization = `Bearer ${tokens.access_token}`;

function base(projectId) {
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
}

async function fetchFirestoreDocuments(collectionName) {
  let pageToken;
  const docs = [];
  do {
    const query = new URLSearchParams({ pageSize: "300" });
    if (pageToken) query.set("pageToken", pageToken);
    const url = `${base(PROJECT_ID)}/${collectionName}?${query}`;
    const res = await fetch(url, {
      headers: {
        authorization,
        "content-type": "application/json",
      },
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to list documents from ${collectionName}: ${res.status} ${err}`);
    }
    const data = await res.json();
    if (data.documents) {
      docs.push(...data.documents);
    }
    pageToken = data.nextPageToken;
  } while (pageToken);
  return docs;
}

// Convert Firestore REST document format to plain JS object
function decodeValue(value) {
  if (!value || typeof value !== "object") return value;
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return parseInt(value.integerValue, 10);
  if ("doubleValue" in value) return parseFloat(value.doubleValue);
  if ("booleanValue" in value) return value.booleanValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("nullValue" in value) return null;
  if ("mapValue" in value) {
    const out = {};
    const fields = value.mapValue.fields || {};
    for (const key of Object.keys(fields)) {
      out[key] = decodeValue(fields[key]);
    }
    return out;
  }
  if ("arrayValue" in value) {
    const values = value.arrayValue.values || [];
    return values.map(decodeValue);
  }
  return value;
}

function decodeDocument(rawDoc) {
  const out = {};
  const fields = rawDoc.fields || {};
  for (const key of Object.keys(fields)) {
    out[key] = decodeValue(fields[key]);
  }
  const parts = rawDoc.name.split("/");
  out.id = parts[parts.length - 1];
  return out;
}

async function syncProducts() {
  console.log("Fetching products from Firestore...");
  const rawDocs = await fetchFirestoreDocuments("products");
  console.log(`Found ${rawDocs.length} products.`);
  
  const records = rawDocs.map((raw) => {
    const data = decodeDocument(raw);
    return {
      objectID: data.id,
      name: data.name || "",
      description: data.description || "",
      category: data.category || "",
      price: Number(data.price) || 0,
      mrp: Number(data.mrp) || 0,
      discountPercentage: Number(data.discountPercentage) || 0,
      image: Array.isArray(data.images) && data.images.length > 0 ? data.images[0] : (data.image || null),
      productOrigin: data.productOrigin || "kissan-fresh",
      inStock: data.inStock !== false,
      tags: Array.isArray(data.tags) ? data.tags : [],
      hasVariations: Boolean(data.hasVariations),
      unit: data.unit || "",
      unitValue: data.unitValue ? String(data.unitValue) : "",
    };
  });

  const index = client.initIndex("products");
  console.log(`Uploading ${records.length} records to Algolia 'products' index...`);
  await index.saveObjects(records);
  console.log("Products sync complete!");
}

async function syncOrders() {
  console.log("Fetching orders from Firestore...");
  const rawDocs = await fetchFirestoreDocuments("orders");
  console.log(`Found ${rawDocs.length} orders.`);

  const records = rawDocs.map((raw) => {
    const data = decodeDocument(raw);
    const orderId = data.id;

    const items = Array.isArray(data.items) ? data.items.map((item) => ({
      productId: item.productId || item.id || null,
      title: item.title || item.name || "",
      price: Number(item.price) || 0,
      mrp: Number(item.mrp) || 0,
      quantity: Number(item.quantity) || 1,
      unit: item.unit || "",
      image: item.image || (Array.isArray(item.images) && item.images[0]) || null,
    })) : [];

    const orderDate = data.orderDate || data.createdAt || new Date().toISOString();

    return {
      objectID: orderId,
      id: orderId,
      path: `orders/${orderId}`,
      orderNumber: data.orderNumber || orderId,
      orderDate: orderDate,
      userId: data.userId || null,
      customerName: data.customerName || null,
      status: (data.status || "PENDING").toUpperCase(),
      orderType: (data.orderType || data.paymentMethod || "ONLINE").toUpperCase(),
      paymentMethod: (data.paymentMethod || data.orderType || "ONLINE").toUpperCase(),
      paymentStatus: (data.paymentStatus || "pending").toLowerCase(),
      totalAmount: data.totalAmount != null ? Number(data.totalAmount) : 0,
      subtotal: data.subtotal != null ? Number(data.subtotal) : 0,
      deliveryFee: data.deliveryFee != null ? Number(data.deliveryFee) : 0,
      discount: data.discount != null ? Number(data.discount) : 0,
      couponDiscount: data.couponDiscount != null ? Number(data.couponDiscount) : 0,
      walletAppliedPaise: Number(data.walletAppliedPaise) || 0,
      debugAdjustedAmountPaise: Number(data.debugAdjustedAmountPaise) || 0,
      slotId: data.slotId || null,
      riderId: data.riderId || null,
      deliveryInstruction: data.deliveryInstruction || null,
      deliveryAddress: data.deliveryAddress || data.address || null,
      phoneNumber: data.phoneNumber || data.phone || data.userPhone || null,
      latitude: data.latitude != null ? Number(data.latitude) : null,
      longitude: data.longitude != null ? Number(data.longitude) : null,
      items: items,
      createdAt: data.createdAt ? new Date(data.createdAt).getTime() : Date.now(),
      updatedAt: data.updatedAt ? new Date(data.updatedAt).getTime() : Date.now(),
      assignedAt: data.assignedAt ? new Date(data.assignedAt).getTime() : null,
    };
  });

  const index = client.initIndex("orders");
  console.log(`Uploading ${records.length} records to Algolia 'orders' index...`);
  // Upload in chunks of 500
  for (let i = 0; i < records.length; i += 500) {
    const chunk = records.slice(i, i + 500);
    await index.saveObjects(chunk);
    console.log(`Uploaded batch ${i + 1} to ${Math.min(i + 500, records.length)}`);
  }
  console.log("Orders sync complete!");
}

const args = process.argv.slice(2);
const doProducts = args.includes("--products") || args.includes("--all") || args.length === 0;
const doOrders = args.includes("--orders") || args.includes("--all") || args.length === 0;

if (doProducts) await syncProducts();
if (doOrders) await syncOrders();

console.log("All requested syncs finished successfully.");
