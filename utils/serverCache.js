const GLOBAL_KEY = Symbol.for('laffy.serverCache');

function getGlobalStore() {
  const globalObject = globalThis;
  if (!globalObject[GLOBAL_KEY]) {
    globalObject[GLOBAL_KEY] = {};
  }
  return globalObject[GLOBAL_KEY];
}

function ensureStore(name) {
  const globalStore = getGlobalStore();
  if (!globalStore[name]) {
    globalStore[name] = {
      entries: new Map(),
      inFlight: new Map(),
    };
  }
  return globalStore[name];
}

function cleanupEntries(store, now) {
  const maxChecks = 50;
  let checked = 0;
  for (const [key, entry] of store.entries) {
    if (entry.expiresAt && entry.expiresAt <= now) {
      store.entries.delete(key);
    }
    checked += 1;
    if (checked >= maxChecks) break;
  }
}

export function getCachedValue(storeName, key) {
  const store = ensureStore(storeName);
  const entry = store.entries.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt && entry.expiresAt <= Date.now()) {
    store.entries.delete(key);
    return undefined;
  }
  return entry.value;
}

export function setCachedValue(storeName, key, value, ttlMs) {
  const store = ensureStore(storeName);
  if (!Number.isFinite(ttlMs) || ttlMs <= 0) {
    store.entries.delete(key);
    return;
  }
  const now = Date.now();
  cleanupEntries(store, now);
  store.entries.set(key, {
    value,
    expiresAt: now + ttlMs,
  });
}

export function resolveWithCache(storeName, key, ttlMs, factory) {
  const store = ensureStore(storeName);
  const now = Date.now();
  cleanupEntries(store, now);
  const cached = store.entries.get(key);
  if (cached && (!cached.expiresAt || cached.expiresAt > now)) {
    return Promise.resolve(cached.value);
  }
  if (store.inFlight.has(key)) {
    return store.inFlight.get(key);
  }
  const executor = Promise.resolve()
    .then(() => factory())
    .then((value) => {
      if (Number.isFinite(ttlMs) && ttlMs > 0) {
        store.entries.set(key, { value, expiresAt: Date.now() + ttlMs });
      }
      return value;
    })
    .catch((error) => {
      store.entries.delete(key);
      throw error;
    })
    .finally(() => {
      store.inFlight.delete(key);
    });
  store.inFlight.set(key, executor);
  return executor;
}

export function clearCache(storeName) {
  const store = ensureStore(storeName);
  store.entries.clear();
  store.inFlight.clear();
}
