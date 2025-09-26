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
  };
}
