#!/usr/bin/env node
/* eslint-disable no-console */
const { list, put } = require('@vercel/blob');
const { buildLatestMeta, normalizeMeta, LATEST_SCHEMA_VERSION } = require('../utils/metaNormalizer');

async function main() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    console.error('[migrate-meta] BLOB_READ_WRITE_TOKEN is required to run this script.');
    process.exit(1);
  }

  const { blobs } = await list({ prefix: 'content/', token });
  const metaFiles = blobs.filter((blob) => blob.pathname.endsWith('.json'));

  let updatedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (const blob of metaFiles) {
    try {
      const res = await fetch(blob.url, { cache: 'no-store' });
      if (!res.ok) {
        failedCount += 1;
        console.warn(`[migrate-meta] Failed to fetch ${blob.pathname}: ${res.status}`);
        continue;
      }

      const meta = await res.json();
      const normalized = normalizeMeta(meta);
      if (!normalized) {
        failedCount += 1;
        console.warn(`[migrate-meta] Skipping ${blob.pathname}: unable to normalize`);
        continue;
      }

      if (meta && meta.schemaVersion === LATEST_SCHEMA_VERSION) {
        skippedCount += 1;
        continue;
      }

      const latest = buildLatestMeta({
        ...normalized,
        summary: normalized.summary || normalized.description,
      });

      await put(blob.pathname, JSON.stringify(latest, null, 2), {
        token,
        access: 'public',
        contentType: 'application/json',
        addRandomSuffix: false,
        allowOverwrite: true,
      });

      updatedCount += 1;
    } catch (error) {
      failedCount += 1;
      console.error(`[migrate-meta] Failed to migrate ${blob.pathname}:`, error);
    }
  }

  console.log(`[migrate-meta] Completed. updated=${updatedCount}, skipped=${skippedCount}, failed=${failedCount}`);
}

main().catch((error) => {
  console.error('[migrate-meta] Unexpected error:', error);
  process.exit(1);
});
