import { createRequire } from "node:module";
import { resolve } from "node:path";

const SOURCE_PROJECT = "kissanfresh-a72c1";
const DESTINATION_PROJECT = "kissan-fresh-development";
const SAFE_ROOT_COLLECTIONS = new Set([
  "products",
  "categories",
  "sections",
  "coupons",
  "todays_specials",
  "app_config",
  "config",
  "offer_notifications",
]);
const APPLY = process.argv.includes("--apply");
const VERIFY_DESTINATION = process.argv.includes("--verify-destination");

if (!process.env.APPDATA) throw new Error("APPDATA is unavailable.");
const require = createRequire(import.meta.url);
const auth = require(resolve(process.env.APPDATA,
  "npm/node_modules/firebase-tools/lib/auth.js"));
const account = auth.getGlobalDefaultAccount();
if (!account?.tokens?.refresh_token) {
  throw new Error("No authenticated Firebase CLI session was found.");
}
const tokens = await auth.getAccessToken(
  account.tokens.refresh_token,
  account.tokens.scopes,
);
const authorization = `Bearer ${tokens.access_token}`;

function base(projectId) {
  return `https://firestore.googleapis.com/v1/projects/${projectId}` +
    "/databases/(default)/documents";
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      authorization,
      "content-type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${response.status} ${response.statusText}: ${body}`);
  }
  return response.status === 204 ? {} : response.json();
}

async function listCollectionIds(projectId, documentPath = "") {
  const suffix = documentPath ? `/${documentPath}` : "";
  let pageToken;
  const ids = [];
  do {
    const body = await request(`${base(projectId)}${suffix}:listCollectionIds`, {
      method: "POST",
      body: JSON.stringify({ pageSize: 1000, ...(pageToken ? { pageToken } : {}) }),
    });
    ids.push(...(body.collectionIds || []));
    pageToken = body.nextPageToken;
  } while (pageToken);
  return ids.sort();
}

async function listDocuments(projectId, collectionPath) {
  let pageToken;
  const documents = [];
  do {
    const query = new URLSearchParams({ pageSize: "300" });
    if (pageToken) query.set("pageToken", pageToken);
    const body = await request(`${base(projectId)}/${collectionPath}?${query}`);
    documents.push(...(body.documents || []));
    pageToken = body.nextPageToken;
  } while (pageToken);
  return documents;
}

function relativeDocumentPath(documentName) {
  return documentName.split("/documents/")[1];
}

async function collectTree(collectionPath, output) {
  const documents = await listDocuments(SOURCE_PROJECT, collectionPath);
  for (const document of documents) {
    output.push(document);
    const documentPath = relativeDocumentPath(document.name);
    const childCollections = await listCollectionIds(SOURCE_PROJECT, documentPath);
    for (const child of childCollections) {
      await collectTree(`${documentPath}/${child}`, output);
    }
  }
}

async function createDocuments(documents) {
  const sourcePrefix = `projects/${SOURCE_PROJECT}/databases/(default)/documents/`;
  const destinationPrefix = `projects/${DESTINATION_PROJECT}/databases/(default)/documents/`;
  for (let offset = 0; offset < documents.length; offset += 200) {
    const chunk = documents.slice(offset, offset + 200);
    const writes = chunk.map((document) => ({
      update: {
        name: document.name.replace(sourcePrefix, destinationPrefix),
        fields: document.fields || {},
      },
      currentDocument: { exists: false },
    }));
    await request(`${base(DESTINATION_PROJECT)}:commit`, {
      method: "POST",
      body: JSON.stringify({ writes }),
    });
    console.log(`Created ${Math.min(offset + chunk.length, documents.length)}/${documents.length} documents.`);
  }
}

if (VERIFY_DESTINATION) {
  const destinationRoots = await listCollectionIds(DESTINATION_PROJECT);
  let total = 0;
  let productionReferenceDocuments = 0;
  for (const collectionId of destinationRoots.filter((id) => SAFE_ROOT_COLLECTIONS.has(id))) {
    const documents = await listDocuments(DESTINATION_PROJECT, collectionId);
    total += documents.length;
    productionReferenceDocuments += documents.filter((document) =>
      JSON.stringify(document.fields || {}).includes(SOURCE_PROJECT)).length;
    console.log(`${collectionId}: ${documents.length} document(s)`);
  }
  console.log(`Development safe-root total: ${total}`);
  console.log(`Documents still referencing production assets: ${productionReferenceDocuments}`);
  process.exit(0);
}

const rootCollections = await listCollectionIds(SOURCE_PROJECT);
const selected = rootCollections.filter((id) => SAFE_ROOT_COLLECTIONS.has(id));
const excluded = rootCollections.filter((id) => !SAFE_ROOT_COLLECTIONS.has(id));
const documents = [];
for (const collectionId of selected) {
  const before = documents.length;
  await collectTree(collectionId, documents);
  console.log(`${collectionId}: ${documents.length - before} document(s)`);
}

console.log(`Selected collections: ${selected.join(", ") || "none"}`);
console.log(`Excluded collections: ${excluded.join(", ") || "none"}`);
console.log(`Total documents: ${documents.length}`);

if (!APPLY) {
  console.log("Dry run only. Re-run with --apply to create missing development documents.");
  process.exit(0);
}
if (documents.length === 0) throw new Error("No safe documents were found to copy.");
await createDocuments(documents);
console.log(`Copied ${documents.length} non-sensitive documents to ${DESTINATION_PROJECT}.`);
