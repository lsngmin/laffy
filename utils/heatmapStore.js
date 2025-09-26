const HEATMAP_INDEX_KEY = "heatmap:index";

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

function heatmapBucketIndexKey(slug) {
  return `heatmap:${slug}:buckets`;
}

function heatmapSlugViewerKey(slug) {
  return `heatmap:${slug}:viewers`;
}

function heatmapSlugMetaKey(slug) {
  return `heatmap:${slug}:meta`;
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
  const bucketIndexKey = heatmapBucketIndexKey(slug);
  const slugViewerKey = heatmapSlugViewerKey(slug);
  const slugMetaKey = heatmapSlugMetaKey(slug);

  const commands = [];

  commands.push(["SADD", HEATMAP_INDEX_KEY, slug]);
  commands.push(["SADD", bucketIndexKey, bucket]);

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
    commands.push(["HINCRBY", slugMetaKey, "samples", String(sampleCount)]);
  }

  if (typeof viewerId === "string" && viewerId) {
    commands.push(["PFADD", `${metaKey}:viewers`, viewerId]);
    commands.push(["PFADD", slugViewerKey, viewerId]);
  }

  if (!commands.length) return;

  await Promise.all(commands.map((command) => redisCommand(command)));
}

function getMemoryStore() {
  if (!global.__heatmapMemStore) {
    global.__heatmapMemStore = new Map();
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
    return entry;
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
    },
    async listSummaries({ slugs } = {}) {
      const entries = Array.from(global.__heatmapMemStore.entries());
      const slugFilter = Array.isArray(slugs) && slugs.length ? new Set(slugs) : null;
      const slugAggregates = new Map();
      const globalViewers = new Set();
      let totalBuckets = 0;

      entries.forEach(([key, value]) => {
        const [slug, bucket] = key.split("::");
        if (!slug || !bucket) return;
        if (slugFilter && !slugFilter.has(slug)) return;

        const aggregate = ensureAggregate(slugAggregates, slug);
        const bucketSummary = buildBucketSummaryFromMemory(bucket, value);
        if (!bucketSummary) return;

        aggregate.bucketSummaries.push(bucketSummary);
        aggregate.sampleTotal += bucketSummary.samples;
        aggregate.bucketCount += 1;
        mergeTotals(aggregate.totals, bucketSummary.cellTotals);
        mergeCells(aggregate.cellMap, bucketSummary.cells);
        mergeZones(aggregate.zoneMap, bucketSummary.zones);
        mergeEvents(aggregate.eventMap, bucketSummary.events);

        if (value?.viewers instanceof Set) {
          value.viewers.forEach((viewer) => {
            aggregate.viewerSet.add(viewer);
            globalViewers.add(viewer);
          });
        }

        totalBuckets += 1;
      });

      const slugsArray = finalizeAggregates(slugAggregates);
      const totalSamples = slugsArray.reduce((sum, entry) => sum + entry.totalSamples, 0);

      return {
        slugs: slugsArray,
        totals: {
          samples: totalSamples,
          viewers: globalViewers.size,
          slugCount: slugsArray.length,
          bucketCount: totalBuckets,
        },
        generatedAt: new Date().toISOString(),
      };
    },
  };
}

function ensureAggregate(map, slug) {
  if (map.has(slug)) return map.get(slug);
  const aggregate = {
    slug,
    bucketSummaries: [],
    viewerSet: new Set(),
    viewerEstimate: 0,
    sampleTotal: 0,
    bucketCount: 0,
    totals: { total: 0, pointermove: 0, pointerdown: 0, scroll: 0 },
    cellMap: new Map(),
    zoneMap: new Map(),
    eventMap: new Map(),
  };
  map.set(slug, aggregate);
  return aggregate;
}

function buildBucketSummaryFromMemory(bucket, entry) {
  if (!entry) return null;
  const cells = Array.from(entry.cells?.entries?.() || [], ([cellIndex, counts]) => ({
    cell: Number(cellIndex),
    total: Number(counts?.total) || 0,
    pointermove: Number(counts?.pointermove) || 0,
    pointerdown: Number(counts?.pointerdown) || 0,
    scroll: Number(counts?.scroll) || 0,
  })).sort((a, b) => a.cell - b.cell);

  const zones = Array.from(entry.zones?.entries?.() || [], ([key, count]) => {
    const { zone, type } = splitZoneKey(key);
    return { zone, type, count: Number(count) || 0 };
  }).filter((zone) => zone.count > 0);

  zones.sort((a, b) => b.count - a.count);

  const events = Array.from(entry.events?.entries?.() || [], ([type, count]) => ({
    type,
    count: Number(count) || 0,
  })).filter((event) => event.count > 0);

  events.sort((a, b) => b.count - a.count);

  const samples = Number(entry.samples) || 0;
  const viewers = entry.viewers instanceof Set ? entry.viewers.size : 0;
  const cellTotals = calculateCellTotals(cells);
  const maxCellTotal = cells.reduce((max, cell) => Math.max(max, cell.total), 0);

  return {
    bucket,
    samples,
    viewers,
    cells,
    zones,
    events,
    cellTotals,
    maxCellTotal,
  };
}

function splitZoneKey(key) {
  if (typeof key !== "string") {
    return { zone: "", type: "custom" };
  }
  const trimmed = key.trim();
  const idx = trimmed.lastIndexOf(":");
  if (idx === -1) {
    return { zone: trimmed, type: "custom" };
  }
  const zone = trimmed.slice(0, idx);
  const type = trimmed.slice(idx + 1) || "custom";
  return { zone, type };
}

function mergeTotals(target, source) {
  if (!target || !source) return;
  target.total += Number(source.total) || 0;
  target.pointermove += Number(source.pointermove) || 0;
  target.pointerdown += Number(source.pointerdown) || 0;
  target.scroll += Number(source.scroll) || 0;
}

function mergeCells(target, cells) {
  if (!target || !Array.isArray(cells)) return;
  cells.forEach((cell) => {
    if (typeof cell?.cell !== "number") return;
    const current = target.get(cell.cell) || {
      cell: cell.cell,
      total: 0,
      pointermove: 0,
      pointerdown: 0,
      scroll: 0,
    };
    current.total += Number(cell.total) || 0;
    current.pointermove += Number(cell.pointermove) || 0;
    current.pointerdown += Number(cell.pointerdown) || 0;
    current.scroll += Number(cell.scroll) || 0;
    target.set(cell.cell, current);
  });
}

function mergeZones(target, zones) {
  if (!target || !Array.isArray(zones)) return;
  zones.forEach((zone) => {
    if (!zone || typeof zone.zone !== "string") return;
    const key = `${zone.zone}::${zone.type || "custom"}`;
    const current = target.get(key) || { zone: zone.zone, type: zone.type || "custom", count: 0 };
    current.count += Number(zone.count) || 0;
    target.set(key, current);
  });
}

function mergeEvents(target, events) {
  if (!target || !Array.isArray(events)) return;
  events.forEach((event) => {
    if (!event || typeof event.type !== "string") return;
    const type = event.type;
    const current = target.get(type) || 0;
    target.set(type, current + (Number(event.count) || 0));
  });
}

function calculateCellTotals(cells) {
  if (!Array.isArray(cells)) {
    return { total: 0, pointermove: 0, pointerdown: 0, scroll: 0 };
  }
  return cells.reduce(
    (acc, cell) => {
      acc.total += Number(cell.total) || 0;
      acc.pointermove += Number(cell.pointermove) || 0;
      acc.pointerdown += Number(cell.pointerdown) || 0;
      acc.scroll += Number(cell.scroll) || 0;
      return acc;
    },
    { total: 0, pointermove: 0, pointerdown: 0, scroll: 0 }
  );
}

function finalizeAggregates(aggregateMap) {
  const result = [];
  aggregateMap.forEach((aggregate) => {
    const finalized = finalizeAggregate(aggregate);
    if (finalized) {
      result.push(finalized);
    }
  });
  result.sort((a, b) => b.totalSamples - a.totalSamples);
  return result;
}

function finalizeAggregate(aggregate) {
  if (!aggregate) return null;

  const zoneSummary = Array.from(aggregate.zoneMap.values()).sort((a, b) => b.count - a.count);
  const eventSummary = Array.from(aggregate.eventMap.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);
  const cells = Array.from(aggregate.cellMap.values()).sort((a, b) => a.cell - b.cell);
  const maxCellIndex = cells.reduce((max, cell) => Math.max(max, cell.cell), -1);
  const maxCellTotal = cells.reduce((max, cell) => Math.max(max, cell.total), 0);
  const columns = 12;
  const rows = maxCellIndex >= 0 ? Math.ceil((maxCellIndex + 1) / columns) : 0;

  const totals = {
    total: aggregate.totals.total,
    pointermove: aggregate.totals.pointermove,
    pointerdown: aggregate.totals.pointerdown,
    scroll: aggregate.totals.scroll,
  };

  const totalViewers = aggregate.viewerSet
    ? aggregate.viewerSet.size
    : Number(aggregate.viewerEstimate) || 0;

  return {
    slug: aggregate.slug,
    totalSamples: aggregate.sampleTotal,
    totalViewers,
    bucketSummaries: aggregate.bucketSummaries,
    zoneSummary,
    eventSummary,
    cellSummary: {
      columns,
      rows,
      cells,
      maxTotal: maxCellTotal,
      totals,
    },
  };
}

export async function listHeatmapSummaries({ slugs } = {}) {
  const { hasUpstash } = await import("./redisClient");
  if (hasUpstash()) {
    return listHeatmapSummariesFromRedis({ slugs });
  }
  const store = getMemoryStore();
  return store.listSummaries({ slugs });
}

async function listHeatmapSummariesFromRedis({ slugs } = {}) {
  const { redisCommand } = await import("./redisClient");

  let slugList = Array.isArray(slugs) && slugs.length ? slugs : [];
  if (!slugList.length) {
    try {
      const raw = await redisCommand(["SMEMBERS", HEATMAP_INDEX_KEY], { allowReadOnly: true });
      slugList = Array.isArray(raw) ? raw : [];
    } catch (error) {
      console.warn("[heatmap] Failed to read slug index", error);
      slugList = [];
    }
  }

  const normalizedSlugs = slugList
    .map((slug) => (typeof slug === "string" ? slug.trim() : ""))
    .filter((slug) => slug.length > 0);

  if (!normalizedSlugs.length) {
    return {
      slugs: [],
      totals: { samples: 0, viewers: 0, slugCount: 0, bucketCount: 0 },
      generatedAt: new Date().toISOString(),
    };
  }

  const slugAggregates = new Map();
  const slugViewerKeys = [];
  let totalBuckets = 0;

  for (const slug of normalizedSlugs) {
    const buckets = await readBucketsForSlug(redisCommand, slug);
    if (!buckets.length) continue;

    const aggregate = ensureAggregate(slugAggregates, slug);
    aggregate.bucketSummaries.length = 0;
    aggregate.sampleTotal = 0;
    aggregate.bucketCount = 0;
    aggregate.totals = { total: 0, pointermove: 0, pointerdown: 0, scroll: 0 };
    aggregate.cellMap = new Map();
    aggregate.zoneMap = new Map();
    aggregate.eventMap = new Map();

    let slugViewerCount = 0;
    try {
      const viewerKey = heatmapSlugViewerKey(slug);
      slugViewerKeys.push(viewerKey);
      const viewerCountRaw = await redisCommand(["PFCOUNT", viewerKey], { allowReadOnly: true });
      slugViewerCount = Number(viewerCountRaw) || 0;
    } catch (error) {
      slugViewerCount = 0;
    }
    aggregate.viewerEstimate = slugViewerCount;
    aggregate.viewerSet = null;

    for (const bucket of buckets) {
      const bucketSummary = await buildBucketSummaryFromRedis(redisCommand, slug, bucket);
      if (!bucketSummary) continue;

      aggregate.bucketSummaries.push(bucketSummary);
      aggregate.sampleTotal += bucketSummary.samples;
      aggregate.bucketCount += 1;
      mergeTotals(aggregate.totals, bucketSummary.cellTotals);
      mergeCells(aggregate.cellMap, bucketSummary.cells);
      mergeZones(aggregate.zoneMap, bucketSummary.zones);
      mergeEvents(aggregate.eventMap, bucketSummary.events);
      totalBuckets += 1;
    }
  }

  const slugsArray = finalizeAggregates(slugAggregates);
  const totalSamples = slugsArray.reduce((sum, entry) => sum + entry.totalSamples, 0);
  let totalViewers = 0;
  if (slugViewerKeys.length) {
    try {
      const combined = await redisCommand(["PFCOUNT", ...slugViewerKeys], { allowReadOnly: true });
      totalViewers = Number(combined) || 0;
    } catch (error) {
      totalViewers = 0;
    }
  }

  return {
    slugs: slugsArray,
    totals: {
      samples: totalSamples,
      viewers: totalViewers,
      slugCount: slugsArray.length,
      bucketCount: totalBuckets,
    },
    generatedAt: new Date().toISOString(),
  };
}

async function readBucketsForSlug(redisCommand, slug) {
  try {
    const raw = await redisCommand(["SMEMBERS", heatmapBucketIndexKey(slug)], { allowReadOnly: true });
    const buckets = Array.isArray(raw) ? raw : [];
    return buckets
      .map((bucket) => (typeof bucket === "string" ? bucket.trim() : ""))
      .filter((bucket) => bucket.length > 0);
  } catch (error) {
    console.warn(`[heatmap] Failed to read buckets for ${slug}`, error);
    return [];
  }
}

async function buildBucketSummaryFromRedis(redisCommand, slug, bucket) {
  try {
    const [cellsRaw, zonesRaw, eventsRaw, metaRaw, viewersRaw] = await Promise.all([
      redisCommand(["HGETALL", heatmapCellKey(slug, bucket)], { allowReadOnly: true }).catch(() => []),
      redisCommand(["HGETALL", heatmapZoneKey(slug, bucket)], { allowReadOnly: true }).catch(() => []),
      redisCommand(["HGETALL", heatmapEventKey(slug, bucket)], { allowReadOnly: true }).catch(() => []),
      redisCommand(["HGETALL", heatmapMetaKey(slug, bucket)], { allowReadOnly: true }).catch(() => []),
      redisCommand(["PFCOUNT", `${heatmapMetaKey(slug, bucket)}:viewers`], { allowReadOnly: true }).catch(() => 0),
    ]);

    const cells = parseCellsHash(cellsRaw);
    const zones = parseZonesHash(zonesRaw);
    const events = parseEventsHash(eventsRaw);
    const meta = parseHash(metaRaw);
    const samples = Number(meta.samples) || 0;
    const viewers = Number(viewersRaw) || 0;
    const cellTotals = calculateCellTotals(cells);
    const maxCellTotal = cells.reduce((max, cell) => Math.max(max, cell.total), 0);

    return {
      bucket,
      samples,
      viewers,
      cells,
      zones,
      events,
      cellTotals,
      maxCellTotal,
    };
  } catch (error) {
    console.warn(`[heatmap] Failed to build bucket summary for ${slug}/${bucket}`, error);
    return null;
  }
}

function parseHash(raw) {
  if (!raw) return {};
  if (Array.isArray(raw)) {
    const result = {};
    for (let i = 0; i < raw.length; i += 2) {
      const key = raw[i];
      const value = raw[i + 1];
      if (typeof key === "string") {
        result[key] = value;
      }
    }
    return result;
  }
  if (typeof raw === "object") return raw;
  return {};
}

function parseCellsHash(raw) {
  const hash = parseHash(raw);
  const cellMap = new Map();
  Object.entries(hash).forEach(([key, value]) => {
    if (typeof key !== "string") return;
    const match = key.match(/^c:(\d+)(?::(pointermove|pointerdown|scroll))?$/);
    if (!match) return;
    const cellIndex = Number(match[1]);
    const metric = match[2] || "total";
    const current = cellMap.get(cellIndex) || {
      cell: cellIndex,
      total: 0,
      pointermove: 0,
      pointerdown: 0,
      scroll: 0,
    };
    const amount = Number(value) || 0;
    if (metric === "total") current.total += amount;
    else if (metric === "pointermove") current.pointermove += amount;
    else if (metric === "pointerdown") current.pointerdown += amount;
    else if (metric === "scroll") current.scroll += amount;
    cellMap.set(cellIndex, current);
  });
  return Array.from(cellMap.values()).sort((a, b) => a.cell - b.cell);
}

function parseZonesHash(raw) {
  const hash = parseHash(raw);
  const zones = Object.entries(hash)
    .map(([key, value]) => {
      const { zone, type } = splitZoneKey(key);
      return { zone, type, count: Number(value) || 0 };
    })
    .filter((zone) => zone.zone && zone.count > 0);
  zones.sort((a, b) => b.count - a.count);
  return zones;
}

function parseEventsHash(raw) {
  const hash = parseHash(raw);
  const events = Object.entries(hash)
    .map(([type, value]) => ({ type, count: Number(value) || 0 }))
    .filter((event) => event.type && event.count > 0);
  events.sort((a, b) => b.count - a.count);
  return events;
}
