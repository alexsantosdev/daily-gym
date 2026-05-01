export function normalizeRepsValue(value: unknown, fallback = "0"): string {
  if (typeof value === "string") {
    const normalized = value.trim()
    return normalized.length > 0 ? normalized : fallback
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return fallback
    }

    return String(value)
  }

  return fallback
}

export function extractRepsNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback
  }

  if (typeof value === "string") {
    const normalized = value.replace(",", ".").trim()
    const direct = Number(normalized)
    if (Number.isFinite(direct)) {
      return direct
    }

    const matched = normalized.match(/\d+(\.\d+)?/)
    if (matched) {
      const parsed = Number(matched[0])
      if (Number.isFinite(parsed)) {
        return parsed
      }
    }
  }

  return fallback
}
