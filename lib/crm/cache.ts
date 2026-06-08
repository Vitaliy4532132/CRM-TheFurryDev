// ── In-memory cache для CRM данных ───────────────────────────────────────────
// TTL: 30 секунд. После create/update/delete — инвалидируется немедленно.

type CacheEntry<T> = {
  data:      T
  timestamp: number
}

const cache = new Map<string, CacheEntry<unknown>>()
const CACHE_TTL = 30 * 1000 // 30 секунд

export function getCached<T>(key: string): T | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key)
    return null
  }
  return entry.data as T
}

export function setCached<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() })
}

// Удаляет все ключи, начинающиеся с одного из переданных префиксов
export function invalidateCache(...keys: string[]): void {
  keys.forEach(key => {
    for (const k of cache.keys()) {
      if (k.startsWith(key)) cache.delete(k)
    }
  })
}

export function invalidateAll(): void {
  cache.clear()
}
