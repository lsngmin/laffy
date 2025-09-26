function heatmapCellKey(slug, bucket) {
  return `heatmap:${slug}:${bucket}`;
}

function heatmapZoneKey(slug, bucket) {
  return `heatmap:${slug}:${bucket}:zones`;
}

function heatmapEventKey(slug, bucket) {
  return `heatmap:${slug}:${bucket}:events`;
}

function heatmapMetaKey(slug, bucket) {
  return `heatmap:${slug}:${bucket}:meta`;
}

function normalizeCell(cell) {
  if (!cell) return null;
  const index = Number(cell.cell);
  if (!Number.isInteger(index) || index < 0) return null;
  const total = Math.max(0, Math.round(Number(cell.total) || 0));
  const pointermove = Math.max(0, Math.round(Number(cell.pointermove) || 0));
  const pointerdown = Math.max(0, Math.round(Number(cell.pointerdown) || 0));
  const scroll = Math.max(0, Math.round(Number(cell.scroll) || 0));
  if (!total && !pointermove && !pointerdown && !scroll) return null;
  return { cell: index, total, pointermove, pointerdown, scroll };
}

function normalizeZone(zone) {
  if (!zone) return null;
  const label = typeof zone.zone === "string" ? zone.zone.trim() : "";
  if (!label) return null;
  const type = typeof zone.type === "string" && zone.type.trim() ? zone.type.trim() : "custom";
  const count = Math.max(0, Math.round(Number(zone.count) || 0));
  if (!count) return null;
  return { zone: label.slice(0, 80), type: type.slice(0, 40), count };
}

function normalizeEvents(events) {
  if (!events || typeof events !== "object") return {};
  return Object.entries(events).reduce((acc, [key, value]) => {
    if (typeof key !== "string" || !key.trim()) return acc;
    const count = Math.max(0, Math.round(Number(value) || 0));
    if (!count) return acc;
    acc[key.trim().slice(0, 40)] = count;
    return acc;
  }, {});
}

export async function recordHeatmapBatch({
  slug,
  viewportBucket,
  cells = [],
  zones = [],
  events = {},
  viewerId,
  sampleCount = 0,
}) {
  const safeSlug = typeof slug === "string" ? slug.trim() : "";
  if (!safeSlug) return;
  const bucket = typeof viewportBucket === "string" && viewportBucket.trim()
    ? viewportBucket.trim().slice(0, 40)
    : "unknown";

  const normalizedCells = cells
    .map((cell) => normalizeCell(cell))
    .filter((cell) => cell);
  const normalizedZones = zones
    .map((zone) => normalizeZone(zone))
    .filter((zone) => zone);
  const normalizedEvents = normalizeEvents(events);
  const normalizedSamples = Math.max(0, Math.round(Number(sampleCount) || 0));

  if (
    normalizedCells.length === 0 &&
    normalizedZones.length === 0 &&
    Object.keys(normalizedEvents).length === 0 &&
    !normalizedSamples
  ) {
    return;
  }

  const { hasUpstash } = await import("./redisClient");
  if (hasUpstash()) {
    try {
      await recordWithRedis({
        slug: safeSlug,
        bucket,
        cells: normalizedCells,
        zones: normalizedZones,
        events: normalizedEvents,
        viewerId,
        sampleCount: normalizedSamples,
      });
      return;
    } catch (error) {
      console.warn("[heatmap] Redis write failed, falling back to memory", error);
    }
  }

  const store = getMemoryStore();
  await store.write({
    slug: safeSlug,
    bucket,
    cells: normalizedCells,
    zones: normalizedZones,
    events: normalizedEvents,
    sampleCount: normalizedSamples,
    viewerId,
  });
}

async function recordWithRedis({ slug, bucket, cells, zones, events, sampleCount, viewerId }) {
  const { redisCommand } = await import("./redisClient");
  const cellKey = heatmapCellKey(slug, bucket);
  const zoneKey = heatmapZoneKey(slug, bucket);
  const eventKey = heatmapEventKey(slug, bucket);
  const metaKey = heatmapMetaKey(slug, bucket);

  const commands = [];

  cells.forEach((cell) => {
    if (cell.total) commands.push(["HINCRBY", cellKey, `c:${cell.cell}`, String(cell.total)]);
    if (cell.pointermove)
      commands.push(["HINCRBY", cellKey, `c:${cell.cell}:pointermove`, String(cell.pointermove)]);
    if (cell.pointerdown)
      commands.push(["HINCRBY", cellKey, `c:${cell.cell}:pointerdown`, String(cell.pointerdown)]);
    if (cell.scroll) commands.push(["HINCRBY", cellKey, `c:${cell.cell}:scroll`, String(cell.scroll)]);
  });

  zones.forEach((zone) => {
    const field = `${zone.zone}:${zone.type}`;
    commands.push(["HINCRBY", zoneKey, field, String(zone.count)]);
  });

  Object.entries(events).forEach(([type, count]) => {
    commands.push(["HINCRBY", eventKey, type, String(count)]);
  });

  if (sampleCount) {
    commands.push(["HINCRBY", metaKey, "samples", String(sampleCount)]);
  }

  if (typeof viewerId === "string" && viewerId) {
    commands.push(["PFADD", `${metaKey}:viewers`, viewerId]);
  }

  if (!commands.length) return;

  await Promise.all(commands.map((command) => redisCommand(command)));
}

function getMemoryStore() {
  if (!global.__heatmapMemStore) {
    global.__heatmapMemStore = new Map();
  }
  if (!global.__heatmapMemIndex) {
    global.__heatmapMemIndex = new Map();
  }

  function registerBucket(slug, bucket) {
    if (!slug || !bucket) return;
    const slugKey = String(slug);
    let set = global.__heatmapMemIndex.get(slugKey);
    if (!set) {
      set = new Set();
      global.__heatmapMemIndex.set(slugKey, set);
    }
    set.add(String(bucket));
  }

  function ensureEntry(slug, bucket) {
    const key = `${slug}::${bucket}`;
    const current = global.__heatmapMemStore.get(key);
    if (current) return current;
    const entry = {
      cells: new Map(),
      zones: new Map(),
      events: new Map(),
      samples: 0,
      viewers: new Set(),
    };
    global.__heatmapMemStore.set(key, entry);
    registerBucket(slug, bucket);
    return entry;
  }

  function getEntry(slug, bucket) {
    const key = `${slug}::${bucket}`;
    return global.__heatmapMemStore.get(key) || null;
  }

  return {
    async write({ slug, bucket, cells, zones, events, sampleCount, viewerId }) {
      const entry = ensureEntry(slug, bucket);

      cells.forEach((cell) => {
        const current = entry.cells.get(cell.cell) || { total: 0, pointermove: 0, pointerdown: 0, scroll: 0 };
        current.total += cell.total;
        current.pointermove += cell.pointermove;
        current.pointerdown += cell.pointerdown;
        current.scroll += cell.scroll;
        entry.cells.set(cell.cell, current);
      });

      zones.forEach((zone) => {
        const key = `${zone.zone}:${zone.type}`;
        entry.zones.set(key, (entry.zones.get(key) || 0) + zone.count);
      });

      Object.entries(events).forEach(([type, count]) => {
        entry.events.set(type, (entry.events.get(type) || 0) + count);
      });

      if (sampleCount) {
        entry.samples += sampleCount;
      }

      if (typeof viewerId === "string" && viewerId) {
        if (!entry.viewers) entry.viewers = new Set();
        entry.viewers.add(viewerId);
      }

      registerBucket(slug, bucket);
    },

    async read({ slug, bucket }) {
      const entry = getEntry(slug, bucket);
      if (!entry) {
        return { cells: [], zones: [], events: [], samples: 0, viewers: 0 };
      }

      const cells = Array.from(entry.cells.entries()).map(([cell, value]) => ({
        cell: Number(cell),
        total: Number(value?.total) || 0,
        pointermove: Number(value?.pointermove) || 0,
        pointerdown: Number(value?.pointerdown) || 0,
        scroll: Number(value?.scroll) || 0,
      }));

      const zones = Array.from(entry.zones.entries()).map(([key, count]) => {
        const lastIdx = key.lastIndexOf(":");
        const zone = lastIdx >= 0 ? key.slice(0, lastIdx) : key;
        const type = lastIdx >= 0 ? key.slice(lastIdx + 1) : "custom";
        return { zone, type, count: Number(count) || 0 };
      });

      const events = Array.from(entry.events.entries()).map(([type, count]) => ({
        type,
        count: Number(count) || 0,
      }));

      return {
        cells,
        zones,
        events,
        samples: Number(entry.samples) || 0,
        viewers: entry.viewers instanceof Set ? entry.viewers.size : 0,
      };
    },

    async listPairs({ slug } = {}) {
      const entries = [];
      const slugKeys = slug ? [slug] : Array.from(global.__heatmapMemIndex.keys());
      slugKeys.forEach((slugKey) => {
        const bucketSet = global.__heatmapMemIndex.get(slugKey);
        if (!bucketSet) return;
        bucketSet.forEach((bucket) => {
          entries.push({ slug: slugKey, bucket });
        });
      });
      return entries;
    },
  };
}

async function listHeatmapPairs({ slug } = {}) {
  const { hasUpstash } = await import("./redisClient");
  if (hasUpstash()) {
    return listPairsFromRedis({ slug });
  }
  const store = getMemoryStore();
  return store.listPairs({ slug });
}

async function listPairsFromRedis({ slug } = {}) {
  const { redisCommand } = await import("./redisClient");
  const targetSlug = typeof slug === "string" && slug.trim() ? slug.trim() : null;
  const matchPattern = targetSlug ? `heatmap:${targetSlug}:*` : "heatmap:*";
  const pairs = [];
  let cursor = "0";
  const seen = new Set();

  do {
    const result = await redisCommand(["SCAN", cursor, "MATCH", matchPattern, "COUNT", "200"], {
      allowReadOnly: true,
    });
    if (!Array.isArray(result) || result.length < 2) break;
    cursor = result[0];
    const keys = Array.isArray(result[1]) ? result[1] : [];
    keys.forEach((key) => {
      if (typeof key !== "string" || !key.startsWith("heatmap:")) return;
      const parts = key.split(":");
      if (parts.length < 3) return;
      const slugPart = parts[1];
      const bucketPart = parts[2];
      if (!slugPart || !bucketPart) return;
      if (targetSlug && slugPart !== targetSlug) return;
      const pairKey = `${slugPart}::${bucketPart}`;
      if (seen.has(pairKey)) return;
      seen.add(pairKey);
      pairs.push({ slug: slugPart, bucket: bucketPart });
    });
  } while (cursor !== "0");

  return pairs;
}

async function readHeatmapBucket({ slug, bucket }) {
  const { hasUpstash } = await import("./redisClient");
  if (hasUpstash()) {
    return readBucketFromRedis({ slug, bucket });
  }
  const store = getMemoryStore();
  return store.read({ slug, bucket });
}

async function readBucketFromRedis({ slug, bucket }) {
  const { redisCommand } = await import("./redisClient");
  const cellKey = heatmapCellKey(slug, bucket);
  const zoneKey = heatmapZoneKey(slug, bucket);
  const eventKey = heatmapEventKey(slug, bucket);
  const metaKey = heatmapMetaKey(slug, bucket);

  const [cellFields, zoneFields, eventFields, sampleValue, viewerValue] = await Promise.all([
    redisCommand(["HGETALL", cellKey], { allowReadOnly: true }).catch(() => []),
    redisCommand(["HGETALL", zoneKey], { allowReadOnly: true }).catch(() => []),
    redisCommand(["HGETALL", eventKey], { allowReadOnly: true }).catch(() => []),
    redisCommand(["HGET", metaKey, "samples"], { allowReadOnly: true }).catch(() => 0),
    redisCommand(["PFCOUNT", `${metaKey}:viewers`], { allowReadOnly: true }).catch(() => 0),
  ]);

  const cells = [];
  const cellMap = new Map();
  if (Array.isArray(cellFields)) {
    for (let i = 0; i < cellFields.length; i += 2) {
      const field = cellFields[i];
      const value = Number(cellFields[i + 1]) || 0;
      if (typeof field !== "string" || !field.startsWith("c:")) continue;
      const parts = field.split(":");
      const index = Number(parts[1]);
      if (!Number.isInteger(index) || index < 0) continue;
      const metric = parts[2] || "total";
      const target = cellMap.get(index) || { cell: index, total: 0, pointermove: 0, pointerdown: 0, scroll: 0 };
      if (metric === "total") target.total = value;
      else if (metric === "pointermove") target.pointermove = value;
      else if (metric === "pointerdown") target.pointerdown = value;
      else if (metric === "scroll") target.scroll = value;
      cellMap.set(index, target);
    }
  }
  cellMap.forEach((value) => {
    cells.push(value);
  });

  const zones = [];
  if (Array.isArray(zoneFields)) {
    for (let i = 0; i < zoneFields.length; i += 2) {
      const field = zoneFields[i];
      const value = Number(zoneFields[i + 1]) || 0;
      if (typeof field !== "string" || !field) continue;
      const lastIdx = field.lastIndexOf(":");
      const zone = lastIdx >= 0 ? field.slice(0, lastIdx) : field;
      const type = lastIdx >= 0 ? field.slice(lastIdx + 1) : "custom";
      zones.push({ zone, type, count: value });
    }
  }

  const events = [];
  if (Array.isArray(eventFields)) {
    for (let i = 0; i < eventFields.length; i += 2) {
      const key = eventFields[i];
      const value = Number(eventFields[i + 1]) || 0;
      if (typeof key !== "string" || !key) continue;
      events.push({ type: key, count: value });
    }
  }

  return {
    cells,
    zones,
    events,
    samples: Number(sampleValue) || 0,
    viewers: Number(viewerValue) || 0,
  };
}

const DEFAULT_GRID_COLUMNS = 12;

function withShare(total, value) {
  if (!total) return 0;
  const numeric = Number(value) || 0;
  return numeric > 0 ? numeric / total : 0;
}

function aggregateBucketSummary({ slug, bucket, raw, cellLimit, zoneLimit, eventLimit }) {
  if (!raw) {
    return null;
  }

  const cells = Array.isArray(raw.cells) ? raw.cells : [];
  const zones = Array.isArray(raw.zones) ? raw.zones : [];
  const events = Array.isArray(raw.events) ? raw.events : [];
  const totalCell = cells.reduce((acc, cell) => acc + (Number(cell.total) || 0), 0);
  const totalPointermove = cells.reduce((acc, cell) => acc + (Number(cell.pointermove) || 0), 0);
  const totalPointerdown = cells.reduce((acc, cell) => acc + (Number(cell.pointerdown) || 0), 0);
  const totalScroll = cells.reduce((acc, cell) => acc + (Number(cell.scroll) || 0), 0);
  const zoneTotal = zones.reduce((acc, zone) => acc + (Number(zone.count) || 0), 0);
  const eventTotal = events.reduce((acc, event) => acc + (Number(event.count) || 0), 0);

  if (!raw.samples && !totalCell && !zoneTotal && !eventTotal) {
    return null;
  }

  const normalizedCells = cells
    .map((cell) => {
      const cellIndex = Number(cell.cell);
      if (!Number.isInteger(cellIndex) || cellIndex < 0) return null;
      const column = cellIndex % DEFAULT_GRID_COLUMNS;
      const row = Math.floor(cellIndex / DEFAULT_GRID_COLUMNS);
      return {
        cell: cellIndex,
        total: Number(cell.total) || 0,
        pointermove: Number(cell.pointermove) || 0,
        pointerdown: Number(cell.pointerdown) || 0,
        scroll: Number(cell.scroll) || 0,
        share: withShare(totalCell, cell.total),
        row,
        column,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.total - a.total);

  const normalizedZones = zones
    .map((zone) => ({
      zone: zone.zone,
      type: zone.type,
      count: Number(zone.count) || 0,
      share: withShare(zoneTotal, zone.count),
    }))
    .filter((zone) => zone.count > 0)
    .sort((a, b) => b.count - a.count);

  const normalizedEvents = events
    .map((event) => ({
      type: event.type,
      count: Number(event.count) || 0,
      share: withShare(eventTotal, event.count),
    }))
    .filter((event) => event.count > 0)
    .sort((a, b) => b.count - a.count);

  const limitedCells = cellLimit > 0 ? normalizedCells.slice(0, cellLimit) : normalizedCells;
  const limitedZones = zoneLimit > 0 ? normalizedZones.slice(0, zoneLimit) : normalizedZones;
  const limitedEvents = eventLimit > 0 ? normalizedEvents.slice(0, eventLimit) : normalizedEvents;

  return {
    slug,
    bucket,
    samples: Number(raw.samples) || 0,
    viewerCount: Number(raw.viewers) || 0,
    totalInteractions: totalCell,
    totalZones: zoneTotal,
    totalEvents: eventTotal,
    pointerRate: withShare(totalCell, totalPointermove),
    clickRate: withShare(totalCell, totalPointerdown),
    scrollRate: withShare(totalCell, totalScroll),
    cells: limitedCells,
    zones: limitedZones,
    events: limitedEvents,
  };
}

function mergeTop(items, limit, keySelector) {
  const map = new Map();
  items.forEach((item) => {
    const key = keySelector(item);
    if (!key) return;
    const current = map.get(key) || { ...item, count: 0 };
    current.count += Number(item.count) || 0;
    current.share = 0;
    map.set(key, current);
  });
  const merged = Array.from(map.values()).sort((a, b) => (b.count || 0) - (a.count || 0));
  const total = merged.reduce((acc, item) => acc + (Number(item.count) || 0), 0);
  const normalized = merged.map((item) => ({
    ...item,
    share: withShare(total, item.count),
  }));
  return limit > 0 ? normalized.slice(0, limit) : normalized;
}

export async function getHeatmapInsights({
  slug,
  limit = 5,
  bucketLimit = 3,
  cellLimit = 6,
  zoneLimit = 5,
  eventLimit = 5,
} = {}) {
  const safeSlug = typeof slug === "string" ? slug.trim() : "";
  const pairs = await listHeatmapPairs({ slug: safeSlug || undefined });
  const availableSlugSet = new Set(pairs.map((pair) => pair.slug));
  const filteredPairs = safeSlug ? pairs.filter((pair) => pair.slug === safeSlug) : pairs;

  if (!filteredPairs.length) {
    return {
      generatedAt: new Date().toISOString(),
      slugs: [],
      availableSlugs: Array.from(availableSlugSet).sort(),
    };
  }

  const bucketSnapshots = await Promise.all(
    filteredPairs.map(async (pair) => {
      const raw = await readHeatmapBucket({ slug: pair.slug, bucket: pair.bucket });
      return aggregateBucketSummary({
        slug: pair.slug,
        bucket: pair.bucket,
        raw,
        cellLimit,
        zoneLimit,
        eventLimit,
      });
    })
  );

  const slugMap = new Map();

  bucketSnapshots.forEach((snapshot) => {
    if (!snapshot) return;
    const existing = slugMap.get(snapshot.slug) || {
      slug: snapshot.slug,
      buckets: [],
      totalSamples: 0,
      totalViewerCount: 0,
      totalInteractions: 0,
    };
    existing.buckets.push(snapshot);
    existing.totalSamples += snapshot.samples;
    existing.totalViewerCount += snapshot.viewerCount;
    existing.totalInteractions += snapshot.totalInteractions;
    slugMap.set(snapshot.slug, existing);
  });

  let slugEntries = Array.from(slugMap.values()).map((entry) => {
    entry.buckets.sort((a, b) => b.samples - a.samples || b.totalInteractions - a.totalInteractions);
    const limitedBuckets = bucketLimit > 0 ? entry.buckets.slice(0, bucketLimit) : entry.buckets;
    const aggregatedZones = mergeTop(
      entry.buckets.flatMap((bucket) => bucket.zones.map((zone) => ({ ...zone }))),
      zoneLimit,
      (item) => `${item.zone}:${item.type}`
    ).map((zone) => ({
      zone: zone.zone,
      type: zone.type,
      count: zone.count,
      share: zone.share,
    }));
    const aggregatedEvents = mergeTop(
      entry.buckets.flatMap((bucket) => bucket.events.map((event) => ({ ...event }))),
      eventLimit,
      (item) => item.type
    ).map((event) => ({
      type: event.type,
      count: event.count,
      share: event.share,
    }));

    return {
      slug: entry.slug,
      buckets: limitedBuckets,
      totalSamples: entry.totalSamples,
      totalViewerCount: entry.totalViewerCount,
      totalInteractions: entry.totalInteractions,
      topZones: aggregatedZones,
      topEvents: aggregatedEvents,
    };
  });

  slugEntries.sort((a, b) => b.totalSamples - a.totalSamples || b.totalInteractions - a.totalInteractions);

  if (limit > 0 && !safeSlug) {
    slugEntries = slugEntries.slice(0, limit);
  }

  return {
    generatedAt: new Date().toISOString(),
    slugs: slugEntries,
    availableSlugs: Array.from(availableSlugSet).sort(),
  };
}
