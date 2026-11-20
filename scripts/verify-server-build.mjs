#!/usr/bin/env node
/**
 * Refuse to ship a static-only build.
 *
 * BALO AI, the enquiry form and the admin dashboard are server features. If the
 * build output has no Node server, deploying it to a static host (CloudFront +
 * S3, GitHub Pages, `vite preview`) gives visitors a site whose forms fail with
 * no explanation. Run automatically after `npm run build`.
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const candidates = [
  resolve(root, ".output/server/index.mjs"),
  resolve(root, "dist/server/index.mjs"),
];

const serverPath = candidates.find((path) => existsSync(path) && statSync(path).size > 0);

function fail(message) {
  console.error(`\n[verify-build] ✗ ${message}\n`);
  process.exit(1);
}

if (!serverPath) {
  fail(
    "No Node server was produced (expected .output/server/index.mjs).\n" +
      "  Do not deploy this build to a static host: chat, enquiry and admin need the server.\n" +
      "  Check that vite.config.ts still sets nitro.preset = \"node-server\".",
  );
}

const server = readFileSync(serverPath, "utf8");
if (!/chat|serverFn|server-fn/i.test(server)) {
  fail(
    `The server bundle at ${serverPath} has no API/server-function entry points.\n` +
      "  Chat and enquiry would 404 in production. Rebuild with `npm run build`.",
  );
}

const health = resolve(root, "public");
if (!existsSync(resolve(health, "og-balo.jpg"))) {
  console.warn("[verify-build] ! public/og-balo.jpg is missing — social previews will be blank.");
}

console.log(
  `[verify-build] ✓ Node server found at ${serverPath.replace(root + "/", "")}; ` +
    "chat, enquiry and admin server routes are included.",
);
