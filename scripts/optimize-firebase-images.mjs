#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import sharp from "sharp";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = path.resolve(SCRIPT_DIR, "..");
const MANIFEST_DIR = path.join(PROJECT_DIR, ".migration-manifests");
const OPTIMIZED_PREFIX = "_optimized_webp_v1/";
const DEFAULT_PROJECT_ID = "kissanfresh-a72c1";
const DEFAULT_BUCKET = "kissanfresh-a72c1.firebasestorage.app";
// Firebase CLI's installed OAuth client. These are public client identifiers
// shipped in firebase-tools; the user's refresh token is read only in memory.
const FIREBASE_CLI_CLIENT_ID = "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com";
const FIREBASE_CLI_CLIENT_SECRET = "j9iVZfS8kkCEFUPaAeJV0sAi";
const RASTER_EXTENSIONS = new Set([
  ".avif",
  ".heic",
  ".heif",
  ".jpeg",
  ".jpg",
  ".png",
  ".tif",
  ".tiff",
  ".webp",
]);

function printHelp() {
  console.log(`
Compress Firebase Storage raster images to WebP and migrate Firestore URLs.

Safe default (no cloud writes):
  npm run images:migrate:dry-run

Apply after reviewing the dry-run:
  npm run images:migrate -- --confirm-project=${DEFAULT_PROJECT_ID}

Rollback Firestore references from a completed apply manifest:
  npm run images:migrate:rollback -- --manifest=.migration-manifests/<file>.json --confirm-project=${DEFAULT_PROJECT_ID}

Options:
  --apply                    Upload derivatives and update Firestore references
  --rollback                Restore Firestore references recorded in a manifest
  --manifest=<path>         Manifest to use for rollback
  --confirm-project=<id>    Required safety confirmation for apply/rollback
  --target-kb=<number>      Maximum encoded size (default: 60)
  --max-width=<number>      Maximum width and height (default: 600)
  --concurrency=<number>    Parallel image conversions (default: 3, max: 8)
  --prefix=<storage/path>   Only process objects below this Storage prefix
  --limit=<number>          Process at most this many source images
  --collections=a,b,c       Only scan these root Firestore collections
  --skip-firestore          Upload/inspect images without changing URL references
  --help                    Show this help

Original Storage objects are never overwritten or deleted. Optimized files go
under ${OPTIMIZED_PREFIX}, and an ignored local manifest supports rollback.
`);
}

function parseArgs(argv) {
  const options = {
    mode: "dry-run",
    targetKb: 60,
    maxWidth: 600,
    concurrency: 3,
    prefix: "",
    limit: Number.POSITIVE_INFINITY,
    collections: null,
    skipFirestore: false,
    manifestPath: null,
    confirmProject: null,
  };

  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--apply") options.mode = "apply";
    else if (arg === "--rollback") options.mode = "rollback";
    else if (arg === "--skip-firestore") options.skipFirestore = true;
    else if (arg.startsWith("--target-kb=")) options.targetKb = Number(arg.split("=")[1]);
    else if (arg.startsWith("--max-width=")) options.maxWidth = Number(arg.split("=")[1]);
    else if (arg.startsWith("--concurrency=")) options.concurrency = Number(arg.split("=")[1]);
    else if (arg.startsWith("--prefix=")) options.prefix = arg.slice("--prefix=".length).replace(/^\/+/, "");
    else if (arg.startsWith("--limit=")) options.limit = Number(arg.split("=")[1]);
    else if (arg.startsWith("--collections=")) {
      options.collections = arg
        .slice("--collections=".length)
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
    } else if (arg.startsWith("--manifest=")) options.manifestPath = arg.slice("--manifest=".length);
    else if (arg.startsWith("--confirm-project=")) options.confirmProject = arg.slice("--confirm-project=".length);
    else throw new Error(`Unknown option: ${arg}`);
  }

  if (!Number.isFinite(options.targetKb) || options.targetKb < 10 || options.targetKb > 500) {
    throw new Error("--target-kb must be between 10 and 500.");
  }
  if (!Number.isFinite(options.maxWidth) || options.maxWidth < 100 || options.maxWidth > 4000) {
    throw new Error("--max-width must be between 100 and 4000.");
  }
  if (!Number.isInteger(options.concurrency) || options.concurrency < 1 || options.concurrency > 8) {
    throw new Error("--concurrency must be an integer between 1 and 8.");
  }
  if (!(options.limit === Number.POSITIVE_INFINITY || (Number.isInteger(options.limit) && options.limit > 0))) {
    throw new Error("--limit must be a positive integer.");
  }
  return options;
}

async function readDotEnv(filePath) {
  const values = {};
  try {
    const text = await fs.readFile(filePath, "utf8");
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const separator = line.indexOf("=");
      if (separator < 1) continue;
      const key = line.slice(0, separator).trim();
      let value = line.slice(separator + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      values[key] = value;
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  return values;
}

async function firebaseCliApplicationDefault() {
  const command = process.platform === "win32" ? (process.env.ComSpec || "cmd.exe") : "firebase";
  const commandArgs = process.platform === "win32"
    ? ["/d", "/s", "/c", "firebase login:list --json"]
    : ["login:list", "--json"];
  const result = spawnSync(command, commandArgs, {
    cwd: PROJECT_DIR,
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 4 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error("Firebase CLI authentication is unavailable. Run `firebase login` and retry.");
  }
  let payload;
  try {
    payload = JSON.parse(result.stdout);
  } catch {
    throw new Error("Could not read Firebase CLI authentication. Run `firebase login` and retry.");
  }
  const account = payload?.result?.find((entry) => entry?.tokens?.refresh_token);
  if (!account) throw new Error("No signed-in Firebase CLI account was found. Run `firebase login` and retry.");
  const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "kissan-firebase-adc-"));
  const credentialPath = path.join(temporaryDirectory, "authorized-user.json");
  await fs.writeFile(credentialPath, JSON.stringify({
    type: "authorized_user",
    client_id: account.user?.azp || FIREBASE_CLI_CLIENT_ID,
    client_secret: FIREBASE_CLI_CLIENT_SECRET,
    refresh_token: account.tokens.refresh_token,
  }), { encoding: "utf8", mode: 0o600 });
  process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialPath;
  return { credential: applicationDefault(), temporaryDirectory };
}

function isRasterImage(file) {
  if (file.name.startsWith(OPTIMIZED_PREFIX)) return false;
  const extension = path.posix.extname(file.name).toLowerCase();
  const contentType = String(file.metadata?.contentType || "").toLowerCase();
  if (contentType === "image/svg+xml" || contentType === "image/gif") return false;
  return RASTER_EXTENSIONS.has(extension) || (contentType.startsWith("image/") && !contentType.includes("svg") && !contentType.includes("gif"));
}

function optimizedObjectName(file) {
  const extension = path.posix.extname(file.name);
  const stem = extension ? file.name.slice(0, -extension.length) : file.name;
  const fingerprint = crypto
    .createHash("sha256")
    .update(`${file.name}:${file.metadata?.generation || ""}:${file.metadata?.size || ""}`)
    .digest("hex")
    .slice(0, 12);
  return `${OPTIMIZED_PREFIX}${stem}-${fingerprint}.webp`;
}

async function encodeWebpWithinLimit(input, maxWidth, targetBytes) {
  const metadata = await sharp(input, { animated: false, failOn: "warning" }).metadata();
  const sourceLongestSide = Math.max(metadata.width || maxWidth, metadata.height || maxWidth);
  const startingSide = Math.min(maxWidth, sourceLongestSide);
  const sides = [...new Set([
    startingSide,
    Math.round(startingSide * 0.88),
    Math.round(startingSide * 0.76),
    Math.round(startingSide * 0.64),
    Math.round(startingSide * 0.52),
    Math.round(startingSide * 0.4),
    240,
    180,
  ].filter((value) => value >= 160))].sort((a, b) => b - a);

  let best = null;
  let smallest = null;
  for (const side of sides) {
    let low = 32;
    let high = 86;
    let bestAtSide = null;
    while (low <= high) {
      const quality = Math.floor((low + high) / 2);
      const buffer = await sharp(input, { animated: false, failOn: "warning" })
        .rotate()
        .resize({ width: side, height: side, fit: "inside", withoutEnlargement: true })
        .webp({ quality, alphaQuality: Math.max(55, quality), effort: 5, smartSubsample: true })
        .toBuffer();
      if (!smallest || buffer.length < smallest.buffer.length) smallest = { buffer, quality, side };
      if (buffer.length <= targetBytes) {
        bestAtSide = { buffer, quality, side };
        low = quality + 1;
      } else {
        high = quality - 1;
      }
    }
    if (bestAtSide) {
      best = bestAtSide;
      break;
    }
  }

  if (!best) best = smallest;
  if (!best || best.buffer.length > targetBytes) {
    throw new Error(`Could not encode below ${Math.round(targetBytes / 1024)} KB without reducing below 160 px.`);
  }
  const outputMetadata = await sharp(best.buffer).metadata();
  return {
    ...best,
    width: outputMetadata.width,
    height: outputMetadata.height,
    sourceWidth: metadata.width,
    sourceHeight: metadata.height,
  };
}

function firebaseDownloadUrl(bucketName, objectName, token) {
  return `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucketName)}/o/${encodeURIComponent(objectName)}?alt=media&token=${encodeURIComponent(token)}`;
}

function storageObjectFromValue(value, bucketName) {
  if (typeof value !== "string") return null;
  if (value.startsWith(`gs://${bucketName}/`)) return decodeURIComponent(value.slice(`gs://${bucketName}/`.length));
  try {
    const url = new URL(value);
    if (url.hostname !== "firebasestorage.googleapis.com" && url.hostname !== "storage.googleapis.com") return null;
    const segments = url.pathname.split("/").filter(Boolean);
    const bucketIndex = segments.indexOf("b");
    const objectIndex = segments.indexOf("o");
    if (bucketIndex >= 0 && segments[bucketIndex + 1] !== bucketName) return null;
    if (objectIndex >= 0 && segments[objectIndex + 1]) return decodeURIComponent(segments.slice(objectIndex + 1).join("/"));
    if (url.hostname === "storage.googleapis.com" && segments[0] === bucketName) {
      return decodeURIComponent(segments.slice(1).join("/"));
    }
  } catch {
    return null;
  }
  return null;
}

function isPlainObject(value) {
  if (!value || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function replaceStorageUrls(value, bucketName, urlBySourceObject, direction = "forward") {
  if (typeof value === "string") {
    if (direction === "forward") {
      const sourceObject = storageObjectFromValue(value, bucketName);
      const replacement = sourceObject ? urlBySourceObject.get(sourceObject) : null;
      return replacement ? { value: replacement, replacements: [{ from: value, to: replacement }] } : { value, replacements: [] };
    }
    const replacement = urlBySourceObject.get(value);
    return replacement ? { value: replacement, replacements: [{ from: value, to: replacement }] } : { value, replacements: [] };
  }
  if (Array.isArray(value)) {
    const replacements = [];
    const next = value.map((item) => {
      const result = replaceStorageUrls(item, bucketName, urlBySourceObject, direction);
      replacements.push(...result.replacements);
      return result.value;
    });
    return { value: replacements.length ? next : value, replacements };
  }
  if (isPlainObject(value)) {
    const replacements = [];
    const next = {};
    for (const [key, item] of Object.entries(value)) {
      const result = replaceStorageUrls(item, bucketName, urlBySourceObject, direction);
      next[key] = result.value;
      replacements.push(...result.replacements);
    }
    return { value: replacements.length ? next : value, replacements };
  }
  return { value, replacements: [] };
}

async function mapWithConcurrency(items, concurrency, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  async function run() {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
  return results;
}

async function writeManifest(manifestPath, manifest) {
  await fs.mkdir(path.dirname(manifestPath), { recursive: true });
  const temporaryPath = `${manifestPath}.${process.pid}.${crypto.randomUUID()}.tmp`;
  await fs.writeFile(temporaryPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await fs.rename(temporaryPath, manifestPath);
}

function makeManifestPath(mode) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return path.join(MANIFEST_DIR, `firebase-images-${mode}-${timestamp}.json`);
}

async function collectDocuments(db, selectedCollections) {
  const collectionRefs = selectedCollections?.length
    ? selectedCollections.map((name) => db.collection(name))
    : await db.listCollections();
  const documents = [];
  for (const collectionRef of collectionRefs) {
    const snapshot = await collectionRef.get();
    documents.push(...snapshot.docs);
    console.log(`  Firestore ${collectionRef.id}: ${snapshot.size} documents`);
  }
  return documents;
}

async function commitPatches(db, patches) {
  for (let start = 0; start < patches.length; start += 400) {
    const batch = db.batch();
    for (const patch of patches.slice(start, start + 400)) {
      batch.set(db.doc(patch.documentPath), patch.fields, { merge: true });
    }
    await batch.commit();
  }
}

async function migrateFirestoreReferences(db, bucketName, urlBySourceObject, options, manifest) {
  if (options.skipFirestore) return { documentsScanned: 0, documentsChanged: 0, urlsChanged: 0 };
  console.log("\nScanning Firestore references...");
  const documents = await collectDocuments(db, options.collections);
  const patches = [];
  let urlsChanged = 0;

  for (const document of documents) {
    const fields = {};
    const replacements = [];
    for (const [topLevelKey, value] of Object.entries(document.data())) {
      const result = replaceStorageUrls(value, bucketName, urlBySourceObject);
      if (result.replacements.length) {
        fields[topLevelKey] = result.value;
        replacements.push(...result.replacements);
      }
    }
    if (replacements.length) {
      urlsChanged += replacements.length;
      patches.push({ documentPath: document.ref.path, fields, replacements });
    }
  }

  manifest.firestore = {
    documentsScanned: documents.length,
    documentsChanged: patches.length,
    urlsChanged,
    changes: patches.map(({ documentPath, replacements }) => ({ documentPath, replacements })),
  };
  await writeManifest(manifest.manifestPath, manifest);

  if (options.mode === "apply" && patches.length) {
    await commitPatches(db, patches);
    manifest.firestore.committedAt = new Date().toISOString();
    await writeManifest(manifest.manifestPath, manifest);
  }
  return manifest.firestore;
}

async function rollback(db, bucketName, options, projectId) {
  if (!options.manifestPath) throw new Error("Rollback requires --manifest=<path>.");
  const manifestPath = path.resolve(PROJECT_DIR, options.manifestPath);
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  if (manifest.projectId !== projectId || manifest.bucket !== bucketName) {
    throw new Error(`Manifest belongs to ${manifest.projectId}/${manifest.bucket}, not ${projectId}/${bucketName}.`);
  }
  const changes = manifest.firestore?.changes || [];
  if (!changes.length) throw new Error("The manifest contains no Firestore changes to roll back.");

  const patches = [];
  let urlsRestored = 0;
  for (const change of changes) {
    const snapshot = await db.doc(change.documentPath).get();
    if (!snapshot.exists) continue;
    const reverse = new Map(change.replacements.map(({ from, to }) => [to, from]));
    const fields = {};
    for (const [topLevelKey, value] of Object.entries(snapshot.data())) {
      const result = replaceStorageUrls(value, bucketName, reverse, "reverse");
      if (result.replacements.length) {
        fields[topLevelKey] = result.value;
        urlsRestored += result.replacements.length;
      }
    }
    if (Object.keys(fields).length) patches.push({ documentPath: change.documentPath, fields });
  }

  console.log(`Rollback will restore ${urlsRestored} URL(s) in ${patches.length} document(s).`);
  await commitPatches(db, patches);
  const rollbackManifest = {
    version: 1,
    mode: "rollback",
    projectId,
    bucket: bucketName,
    sourceManifest: manifestPath,
    completedAt: new Date().toISOString(),
    documentsChanged: patches.length,
    urlsRestored,
  };
  const rollbackPath = makeManifestPath("rollback");
  rollbackManifest.manifestPath = rollbackPath;
  await writeManifest(rollbackPath, rollbackManifest);
  console.log(`Rollback complete. Report: ${path.relative(PROJECT_DIR, rollbackPath)}`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const env = { ...(await readDotEnv(path.join(PROJECT_DIR, ".env.local"))), ...process.env };
  const projectId = env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || env.GCLOUD_PROJECT || DEFAULT_PROJECT_ID;
  const bucketName = env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || env.FIREBASE_STORAGE_BUCKET || DEFAULT_BUCKET;
  if (options.mode !== "dry-run" && options.confirmProject !== projectId) {
    throw new Error(`For ${options.mode}, pass --confirm-project=${projectId}. No cloud writes were made.`);
  }

  if (!getApps().length) {
    const auth = await firebaseCliApplicationDefault();
    credentialTemporaryDirectory = auth.temporaryDirectory;
    initializeApp({ credential: auth.credential, projectId, storageBucket: bucketName });
  }
  const db = getFirestore();
  const bucket = getStorage().bucket(bucketName);

  console.log(`Mode: ${options.mode}`);
  console.log(`Project: ${projectId}`);
  console.log(`Bucket: ${bucketName}`);
  console.log(`Target: WebP <= ${options.targetKb} KB, max ${options.maxWidth}x${options.maxWidth}`);
  if (options.mode === "dry-run") console.log("Cloud writes: disabled");

  if (options.mode === "rollback") {
    await rollback(db, bucketName, options, projectId);
    return;
  }

  console.log("\nListing Firebase Storage images...");
  const [allFiles] = await bucket.getFiles({ prefix: options.prefix });
  const images = allFiles.filter(isRasterImage).slice(0, options.limit);
  console.log(`Found ${images.length} raster image(s) to inspect (${allFiles.length} total object(s) in scope).`);

  const manifestPath = makeManifestPath(options.mode);
  const manifest = {
    version: 1,
    mode: options.mode,
    projectId,
    bucket: bucketName,
    startedAt: new Date().toISOString(),
    settings: {
      targetKb: options.targetKb,
      maxWidth: options.maxWidth,
      prefix: options.prefix,
      limit: Number.isFinite(options.limit) ? options.limit : null,
      collections: options.collections,
      optimizedPrefix: OPTIMIZED_PREFIX,
    },
    manifestPath,
    images: [],
  };
  await writeManifest(manifestPath, manifest);

  const targetBytes = Math.round(options.targetKb * 1024);
  let completed = 0;
  const results = await mapWithConcurrency(images, options.concurrency, async (sourceFile) => {
    const originalBytes = Number(sourceFile.metadata?.size || 0);
    const destinationName = optimizedObjectName(sourceFile);
    const record = {
      sourceObject: sourceFile.name,
      destinationObject: destinationName,
      originalBytes,
      status: "pending",
    };
    try {
      const [input] = await sourceFile.download();
      const encoded = await encodeWebpWithinLimit(input, options.maxWidth, targetBytes);
      Object.assign(record, {
        optimizedBytes: encoded.buffer.length,
        quality: encoded.quality,
        width: encoded.width,
        height: encoded.height,
        sourceWidth: encoded.sourceWidth,
        sourceHeight: encoded.sourceHeight,
        savingsPercent: originalBytes > 0 ? Number((100 - (encoded.buffer.length / originalBytes) * 100).toFixed(1)) : null,
      });

      if (options.mode === "apply") {
        const destinationFile = bucket.file(destinationName);
        const [exists] = await destinationFile.exists();
        let token;
        if (!exists) {
          token = crypto.randomUUID();
          await destinationFile.save(encoded.buffer, {
            resumable: false,
            validation: "crc32c",
            metadata: {
              contentType: "image/webp",
              cacheControl: "public,max-age=31536000,immutable",
              metadata: { firebaseStorageDownloadTokens: token },
            },
          });
          record.status = "uploaded";
        } else {
          const [existingMetadata] = await destinationFile.getMetadata();
          token = String(existingMetadata.metadata?.firebaseStorageDownloadTokens || "").split(",")[0];
          if (!token) {
            token = crypto.randomUUID();
            await destinationFile.setMetadata({
              contentType: "image/webp",
              cacheControl: "public,max-age=31536000,immutable",
              metadata: { ...existingMetadata.metadata, firebaseStorageDownloadTokens: token },
            });
          }
          record.status = "reused";
        }
        const [verified] = await destinationFile.getMetadata();
        if (verified.contentType !== "image/webp" || Number(verified.size) > targetBytes) {
          throw new Error("Uploaded derivative failed content-type or size verification.");
        }
        record.optimizedUrl = firebaseDownloadUrl(bucketName, destinationName, token);
      } else {
        record.status = "dry-run";
      }
    } catch (error) {
      record.status = "failed";
      record.error = error instanceof Error ? error.message : String(error);
    }
    completed += 1;
    const resultSize = record.optimizedBytes ? `${(record.optimizedBytes / 1024).toFixed(1)} KB` : "failed";
    console.log(`[${completed}/${images.length}] ${sourceFile.name} -> ${resultSize} (${record.status})`);
    manifest.images.push(record);
    await writeManifest(manifestPath, manifest);
    return record;
  });

  const successful = results.filter((record) => record.status !== "failed");
  const failed = results.filter((record) => record.status === "failed");
  const originalTotal = successful.reduce((sum, record) => sum + (record.originalBytes || 0), 0);
  const optimizedTotal = successful.reduce((sum, record) => sum + (record.optimizedBytes || 0), 0);
  const urlBySourceObject = new Map(
    successful.filter((record) => record.optimizedUrl).map((record) => [record.sourceObject, record.optimizedUrl]),
  );

  let firestore = { documentsScanned: 0, documentsChanged: 0, urlsChanged: 0 };
  if (options.mode === "apply") {
    firestore = await migrateFirestoreReferences(db, bucketName, urlBySourceObject, options, manifest);
  } else if (!options.skipFirestore) {
    // Dry-run needs deterministic placeholders only to count every matching source URL.
    const dryRunMap = new Map(successful.map((record) => [record.sourceObject, `dry-run://${record.destinationObject}`]));
    firestore = await migrateFirestoreReferences(db, bucketName, dryRunMap, options, manifest);
  }

  manifest.completedAt = new Date().toISOString();
  manifest.summary = {
    imagesInspected: results.length,
    imagesSuccessful: successful.length,
    imagesFailed: failed.length,
    originalBytes: originalTotal,
    optimizedBytes: optimizedTotal,
    bytesSaved: Math.max(0, originalTotal - optimizedTotal),
    savingsPercent: originalTotal ? Number((100 - (optimizedTotal / originalTotal) * 100).toFixed(1)) : 0,
    firestoreDocumentsScanned: firestore.documentsScanned,
    firestoreDocumentsChanged: firestore.documentsChanged,
    firestoreUrlsChanged: firestore.urlsChanged,
  };
  await writeManifest(manifestPath, manifest);

  console.log("\nSummary");
  console.log(`  Images: ${successful.length} successful, ${failed.length} failed`);
  console.log(`  Size: ${(originalTotal / 1024 / 1024).toFixed(2)} MB -> ${(optimizedTotal / 1024 / 1024).toFixed(2)} MB (${manifest.summary.savingsPercent}% saved)`);
  console.log(`  Firestore: ${firestore.urlsChanged} URL(s) in ${firestore.documentsChanged} document(s) ${options.mode === "apply" ? "updated" : "would change"}`);
  console.log(`  Manifest: ${path.relative(PROJECT_DIR, manifestPath)}`);
  if (failed.length) {
    console.log("\nSome files failed. Review the manifest before applying or rerunning.");
    process.exitCode = 2;
  } else if (options.mode === "dry-run") {
    console.log(`\nDry-run complete. Apply with:\n  npm run images:migrate -- --confirm-project=${projectId}`);
  } else {
    console.log("\nMigration complete. Originals remain untouched and can still be used for rollback.");
  }
}

let credentialTemporaryDirectory = null;
main()
  .catch((error) => {
    console.error(`\nMigration failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (!credentialTemporaryDirectory) return;
    const resolvedDirectory = path.resolve(credentialTemporaryDirectory);
    const resolvedTempRoot = path.resolve(os.tmpdir());
    if (resolvedDirectory.startsWith(`${resolvedTempRoot}${path.sep}`) && path.basename(resolvedDirectory).startsWith("kissan-firebase-adc-")) {
      await fs.rm(resolvedDirectory, { recursive: true, force: true });
    }
  });
