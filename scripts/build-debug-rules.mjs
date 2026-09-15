import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const sourcePath = resolve("firestore.rules");
const targetPath = resolve(".generated", "firestore.debug.rules");
const source = await readFile(sourcePath, "utf8");
const marker = "    match /{document=**} {";
if (!source.includes(marker)) throw new Error("Could not find Firestore catch-all rule.");

const debugRules = `    // Debug-only wallet data. All mutations use trusted Cloud Functions.\n` +
`    match /debug_wallet_accounts/{userId} {\n` +
`      allow read: if owns(userId) || can('Order Management');\n` +
`      allow write: if false;\n` +
`    }\n\n` +
`    match /debug_wallet_entries/{entryId} {\n` +
`      allow get, list: if signedIn() && resource.data.userId == request.auth.uid\n` +
`        || can('Order Management');\n` +
`      allow write: if false;\n` +
`    }\n\n` +
`    match /debug_order_adjustments/{adjustmentId} {\n` +
`      allow get, list: if signedIn() && resource.data.userId == request.auth.uid\n` +
`        || can('Order Management');\n` +
`      allow write: if false;\n` +
`    }\n\n`;

await mkdir(resolve(".generated"), { recursive: true });
await writeFile(targetPath, source.replace(marker, debugRules + marker));
console.log(`Generated ${targetPath}`);
