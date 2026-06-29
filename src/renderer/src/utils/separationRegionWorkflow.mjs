function toNumber(value, fallback) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function clampPercent(value, fallback = 0) {
  return Math.min(100, Math.max(0, toNumber(value, fallback)))
}

function normalizeAngle(value) {
  const angle = toNumber(value, 0) % 360
  return angle < 0 ? angle + 360 : angle
}

function toHex(value) {
  return Math.max(0, Math.min(255, Number(value) || 0)).toString(16).padStart(2, '0')
}

export function createRecognitionRegion(input = {}, options = {}) {
  const now = options.now ?? Date.now()
  return {
    id: input.id || `region-${now}`,
    x: clampPercent(input.x, 0),
    y: clampPercent(input.y, 0),
    width: Math.max(1, clampPercent(input.width, 20)),
    height: Math.max(1, clampPercent(input.height, 8)),
    angle: normalizeAngle(input.angle),
    text: String(input.text || '').trim(),
    excluded: Boolean(input.excluded),
    createdAt: now,
    updatedAt: now
  }
}

export function createRecognitionRegionFromDrag(start = {}, end = {}, options = {}) {
  const minWidth = Math.max(1, toNumber(options.minWidth, 1))
  const minHeight = Math.max(1, toNumber(options.minHeight, 1))
  const x1 = clampPercent(start.x, 0)
  const y1 = clampPercent(start.y, 0)
  const x2 = clampPercent(end.x, x1)
  const y2 = clampPercent(end.y, y1)

  let x = Math.min(x1, x2)
  let y = Math.min(y1, y2)
  let width = Math.max(minWidth, Math.abs(x2 - x1))
  let height = Math.max(minHeight, Math.abs(y2 - y1))

  width = Math.min(100, width)
  height = Math.min(100, height)
  if (x + width > 100) x = Math.max(0, 100 - width)
  if (y + height > 100) y = Math.max(0, 100 - height)

  return createRecognitionRegion({
    id: options.id,
    x,
    y,
    width,
    height,
    angle: options.angle,
    text: options.text,
    excluded: options.excluded
  }, options)
}

export function toggleRecognitionRegion(region, excluded = true, options = {}) {
  return {
    ...region,
    excluded: Boolean(excluded),
    updatedAt: options.now ?? Date.now()
  }
}

export function nudgeRecognitionRegion(region, delta = {}, options = {}) {
  return {
    ...region,
    x: clampPercent(toNumber(region.x, 0) + toNumber(delta.dx, 0), region.x),
    y: clampPercent(toNumber(region.y, 0) + toNumber(delta.dy, 0), region.y),
    width: Math.max(1, clampPercent(toNumber(region.width, 1) + toNumber(delta.dw, 0), region.width)),
    height: Math.max(1, clampPercent(toNumber(region.height, 1) + toNumber(delta.dh, 0), region.height)),
    angle: normalizeAngle(toNumber(region.angle, 0) + toNumber(delta.da, 0)),
    updatedAt: options.now ?? Date.now()
  }
}

export function pickCanvasColor(pixels, options = {}) {
  const width = Math.max(1, Number(options.width) || 1)
  const x = Math.max(0, Math.floor(Number(options.x) || 0))
  const y = Math.max(0, Math.floor(Number(options.y) || 0))
  const index = (y * width + x) * 4
  if (!pixels || index + 2 >= pixels.length) {
    return '#ffffff'
  }
  return `#${toHex(pixels[index])}${toHex(pixels[index + 1])}${toHex(pixels[index + 2])}`
}
