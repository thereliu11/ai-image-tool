export function parsePageRanges(input, maxPage) {
  const max = Number(maxPage) || 0
  if (max <= 0) return []

  const text = String(input || '').trim()
  if (!text) {
    return Array.from({ length: max }, (_, index) => index + 1)
  }

  const pages = new Set()
  for (const rawPart of text.split(',')) {
    const part = rawPart.trim()
    if (!part) continue

    const rangeMatch = part.match(/^(\d+)\s*-\s*(\d+)$/)
    if (rangeMatch) {
      const start = Number(rangeMatch[1])
      const end = Number(rangeMatch[2])
      const low = Math.min(start, end)
      const high = Math.max(start, end)
      for (let page = low; page <= high; page += 1) {
        if (page >= 1 && page <= max) pages.add(page)
      }
      continue
    }

    const page = Number(part)
    if (Number.isInteger(page) && page >= 1 && page <= max) {
      pages.add(page)
    }
  }

  return [...pages].sort((a, b) => a - b)
}
