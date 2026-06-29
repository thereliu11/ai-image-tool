const IMAGE_FORMATS = new Set(['png', 'jpeg', 'webp'])
const DIRECTIONS = new Set(['vertical', 'horizontal'])

function clampNumber(value, min, max, fallback) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(max, Math.max(min, Math.round(number)))
}

function normalizePathList(paths) {
  if (!Array.isArray(paths)) return []
  return paths
    .map(path => String(path || '').trim())
    .filter(Boolean)
}

function sanitizeName(name, fallback = 'image-split') {
  const text = String(name || '').trim() || fallback
  return text
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '') || fallback
}

function getBaseName(imagePath) {
  const rawName = String(imagePath || '')
    .split(/[\\/]/)
    .pop() || 'image'
  return rawName.replace(/\.[^.]+$/, '')
}

function getDimension(metadata, key) {
  const value = Number(metadata?.[key])
  return Number.isFinite(value) && value > 0 ? Math.round(value) : 0
}

export function buildImageSplitOutputName(baseName, index, format = 'png') {
  const safeBase = sanitizeName(baseName)
  const safeFormat = IMAGE_FORMATS.has(format) ? format : 'png'
  return `${safeBase}_${String(index).padStart(3, '0')}.${safeFormat}`
}

export function normalizeImageSplitRequest(input = {}) {
  const targetSize = clampNumber(input.targetSize ?? input.targetHeight, 200, 4096, 1365)
  const maxOverlap = Math.max(0, targetSize - 1)

  return {
    imagePaths: normalizePathList(input.imagePaths),
    direction: DIRECTIONS.has(input.direction) ? input.direction : 'vertical',
    targetSize,
    overlap: clampNumber(input.overlap, 0, maxOverlap, 0),
    format: IMAGE_FORMATS.has(input.format) ? input.format : 'png',
    outputName: sanitizeName(input.outputName, '')
  }
}

export function buildImageSplitPlan(input = {}, metadataByPath = {}) {
  const request = normalizeImageSplitRequest(input)
  const slices = []
  const issues = []

  request.imagePaths.forEach((imagePath) => {
    const metadata = metadataByPath[imagePath] || {}
    const width = getDimension(metadata, 'width')
    const height = getDimension(metadata, 'height')

    if (!width || !height) {
      issues.push({ imagePath, reason: 'missing-dimensions' })
      return
    }

    const totalLength = request.direction === 'vertical' ? height : width
    const crossLength = request.direction === 'vertical' ? width : height
    const step = Math.max(1, request.targetSize - request.overlap)
    const sourceBase = request.outputName || getBaseName(imagePath)

    for (let offset = 0; offset < totalLength; offset += step) {
      const sliceLength = Math.min(request.targetSize, totalLength - offset)
      const index = slices.length + 1
      const isVertical = request.direction === 'vertical'

      slices.push({
        imagePath,
        index,
        left: isVertical ? 0 : offset,
        top: isVertical ? offset : 0,
        width: isVertical ? crossLength : sliceLength,
        height: isVertical ? sliceLength : crossLength,
        outputName: buildImageSplitOutputName(sourceBase, index, request.format)
      })

      if (offset + request.targetSize >= totalLength) break
    }
  })

  return {
    ...request,
    slices,
    issues,
    totalCount: slices.length
  }
}
