export function unwrapList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>
    for (const val of Object.values(obj)) {
      if (Array.isArray(val)) return val as T[]
    }
  }
  return []
}

export function unwrapObject<T>(data: unknown): T | null {
  if (!data || typeof data !== 'object') return null
  const obj = data as Record<string, unknown>
  if ('id' in obj) return obj as T
  for (const val of Object.values(obj)) {
    if (val && typeof val === 'object' && 'id' in (val as object)) return val as T
  }
  return obj as T
}
