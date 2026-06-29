const pageStatuses = new Set(['pending', 'ocr', 'editing', 'completed', 'failed'])
const exportFormats = new Set(['images', 'pptx', 'docx', 'pdf'])

function now(options = {}) {
  return options.timestamp || Date.now()
}

function basename(filePath) {
  return String(filePath || '').split(/[\\/]/).filter(Boolean).pop() || '未命名图片'
}

function toNumber(value, fallback) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function clampPercent(value, fallback = 0) {
  return Math.min(100, Math.max(0, toNumber(value, fallback)))
}

function normalizeRotation(value, fallback = 0) {
  const normalized = toNumber(value, fallback) % 360
  return normalized < 0 ? normalized + 360 : normalized
}

function normalizeText(text, fallback = '') {
  return String(text ?? fallback).trim()
}

function roundPercent(value) {
  return Math.round(toNumber(value, 0) * 100) / 100
}

function parsePageRange(pageRange, total) {
  const raw = normalizeText(pageRange)
  if (!raw) return null

  const selected = new Set()
  raw
    .replace(/，/g, ',')
    .split(',')
    .map(part => part.trim())
    .filter(Boolean)
    .forEach(part => {
      const range = part.match(/^(\d+)\s*[-~]\s*(\d+)$/)
      if (range) {
        const start = Math.max(1, Number(range[1]))
        const end = Math.min(total, Number(range[2]))
        if (start <= end) {
          for (let page = start; page <= end; page += 1) selected.add(page)
        } else {
          for (let page = start; page >= end; page -= 1) selected.add(page)
        }
        return
      }

      const page = Number(part)
      if (Number.isInteger(page) && page >= 1 && page <= total) {
        selected.add(page)
      }
    })

  return selected
}

function createLayerId(type, timestamp, suffix = '') {
  const normalizedSuffix = suffix ? `-${suffix}` : ''
  return `separation-${type}-${timestamp}${normalizedSuffix}`
}

function cloneLayer(layer) {
  return {
    ...layer,
    rotation: normalizeRotation(layer.rotation, 0),
    locked: Boolean(layer.locked),
    visible: layer.visible !== false
  }
}

export function createSeparationPages(imagePaths = [], options = {}) {
  const timestamp = now(options)
  return imagePaths
    .filter(Boolean)
    .map((imagePath, index) => ({
      id: `separation-page-${index + 1}-${timestamp}`,
      name: basename(imagePath),
      imagePath,
      status: 'pending',
      layers: [],
      note: '',
      createdAt: timestamp,
      updatedAt: timestamp
    }))
}

export function createTextLayer(options = {}) {
  const timestamp = now(options)
  return {
    id: options.id || createLayerId('text', timestamp),
    type: 'text',
    text: normalizeText(options.text, '双击编辑文字') || '双击编辑文字',
    x: clampPercent(options.x, 12),
    y: clampPercent(options.y, 12),
    width: clampPercent(options.width, 36),
    height: clampPercent(options.height, 8),
    fontFamily: options.fontFamily || 'Microsoft YaHei',
    fontSize: Math.max(8, toNumber(options.fontSize, 18)),
    color: options.color || '#111827',
    fontWeight: options.fontWeight || '500',
    align: options.align || 'left',
    rotation: normalizeRotation(options.rotation, 0),
    locked: Boolean(options.locked),
    visible: options.visible !== false,
    createdAt: timestamp,
    updatedAt: timestamp
  }
}

export function createMaskLayer(options = {}) {
  const timestamp = now(options)
  return {
    id: options.id || createLayerId('mask', timestamp),
    type: 'mask',
    x: clampPercent(options.x, 20),
    y: clampPercent(options.y, 20),
    width: clampPercent(options.width, 24),
    height: clampPercent(options.height, 10),
    fill: options.fill || '#ffffff',
    opacity: Math.min(100, Math.max(1, toNumber(options.opacity, 100))),
    radius: Math.max(0, toNumber(options.radius, 1.5)),
    rotation: normalizeRotation(options.rotation, 0),
    locked: Boolean(options.locked),
    visible: options.visible !== false,
    createdAt: timestamp,
    updatedAt: timestamp
  }
}

export function createBrushLayer(options = {}) {
  const timestamp = now(options)
  const size = Math.max(1, clampPercent(options.size, 6))
  return {
    id: options.id || createLayerId('brush', timestamp),
    type: 'brush',
    x: clampPercent(options.x, 50),
    y: clampPercent(options.y, 50),
    width: size,
    height: size,
    fill: options.fill || '#ffffff',
    opacity: Math.min(100, Math.max(1, toNumber(options.opacity, 100))),
    radius: 999,
    rotation: normalizeRotation(options.rotation, 0),
    locked: Boolean(options.locked),
    visible: options.visible !== false,
    createdAt: timestamp,
    updatedAt: timestamp
  }
}

export function upsertLayer(page, layer) {
  const timestamp = Date.now()
  const layers = Array.isArray(page?.layers) ? page.layers.map(cloneLayer) : []
  const nextLayer = cloneLayer({ ...layer, updatedAt: timestamp })
  const index = layers.findIndex(item => item.id === nextLayer.id)

  if (index >= 0) {
    layers[index] = nextLayer
  } else {
    layers.push(nextLayer)
  }

  return {
    ...page,
    status: pageStatuses.has(page?.status) && page.status !== 'pending' ? page.status : 'editing',
    layers,
    updatedAt: timestamp
  }
}

export function updateLayer(page, layerId, patch = {}) {
  const timestamp = Date.now()
  return {
    ...page,
    status: page?.status === 'completed' ? 'editing' : (page?.status || 'editing'),
    layers: (page?.layers || []).map(layer => {
      if (layer.id !== layerId) return cloneLayer(layer)
      if (layer.locked && patch.locked === undefined && patch.visible === undefined) {
        return cloneLayer(layer)
      }
      return cloneLayer({
        ...layer,
        ...patch,
        x: patch.x === undefined ? layer.x : clampPercent(patch.x, layer.x),
        y: patch.y === undefined ? layer.y : clampPercent(patch.y, layer.y),
        width: patch.width === undefined ? layer.width : clampPercent(patch.width, layer.width),
        height: patch.height === undefined ? layer.height : clampPercent(patch.height, layer.height),
        rotation: patch.rotation === undefined ? layer.rotation : normalizeRotation(patch.rotation, layer.rotation),
        locked: patch.locked === undefined ? Boolean(layer.locked) : Boolean(patch.locked),
        updatedAt: timestamp
      })
    }),
    updatedAt: timestamp
  }
}

export function nudgeLayer(page, layerId, delta = {}) {
  const layer = (page?.layers || []).find(item => item.id === layerId)
  if (!layer) return page
  return updateLayer(page, layerId, {
    x: clampPercent((layer.x || 0) + toNumber(delta.dx, 0), layer.x),
    y: clampPercent((layer.y || 0) + toNumber(delta.dy, 0), layer.y)
  })
}

export function removeLayer(page, layerId) {
  const timestamp = Date.now()
  return {
    ...page,
    status: page?.status === 'completed' ? 'editing' : (page?.status || 'editing'),
    layers: (page?.layers || []).filter(layer => layer.id !== layerId).map(cloneLayer),
    updatedAt: timestamp
  }
}

export function duplicateLayer(page, layerId, options = {}) {
  const timestamp = now(options)
  const source = (page?.layers || []).find(layer => layer.id === layerId)
  if (!source) return page
  const copy = cloneLayer({
    ...source,
    id: createLayerId(source.type || 'layer', timestamp, 'copy'),
    x: clampPercent((source.x || 0) + 2, source.x),
    y: clampPercent((source.y || 0) + 2, source.y),
    locked: false,
    createdAt: timestamp,
    updatedAt: timestamp
  })
  return {
    ...page,
    status: page?.status === 'completed' ? 'editing' : (page?.status || 'editing'),
    layers: [...(page?.layers || []).map(cloneLayer), copy],
    updatedAt: timestamp
  }
}

export function toggleLayerLock(page, layerId, locked = true) {
  return updateLayer(page, layerId, { locked: Boolean(locked) })
}

export function layersFromOcrText(text = '', options = {}) {
  const timestamp = now(options)
  return String(text || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .slice(0, 80)
    .map((line, index) => createTextLayer({
      id: createLayerId('text', timestamp, index + 1),
      text: line,
      x: 8,
      y: Math.min(92, 8 + index * 5.2),
      width: 84,
      height: 4.6,
      fontSize: index === 0 ? 20 : 15,
      fontWeight: index === 0 ? '700' : '500',
      timestamp: timestamp + index
    }))
}

function ocrWordToRect(word, metadata = {}) {
  const imageWidth = toNumber(metadata.width, 0)
  const imageHeight = toNumber(metadata.height, 0)
  const bbox = word?.bbox || word?.box
  const text = normalizeText(word?.text)
  if (!text || !bbox || imageWidth <= 0 || imageHeight <= 0) return null

  const x0 = toNumber(bbox.x0 ?? bbox.left, NaN)
  const y0 = toNumber(bbox.y0 ?? bbox.top, NaN)
  const x1 = toNumber(bbox.x1 ?? (bbox.left + bbox.width), NaN)
  const y1 = toNumber(bbox.y1 ?? (bbox.top + bbox.height), NaN)
  if (![x0, y0, x1, y1].every(Number.isFinite)) return null

  const left = roundPercent((Math.min(x0, x1) / imageWidth) * 100)
  const top = roundPercent((Math.min(y0, y1) / imageHeight) * 100)
  const right = roundPercent((Math.max(x0, x1) / imageWidth) * 100)
  const bottom = roundPercent((Math.max(y0, y1) / imageHeight) * 100)

  return {
    text,
    x0: clampPercent(left),
    y0: clampPercent(top),
    x1: clampPercent(right),
    y1: clampPercent(bottom),
    centerY: clampPercent((top + bottom) / 2),
    height: Math.max(0.5, bottom - top)
  }
}

function appendWordToLine(line, word) {
  line.words.push(word)
  line.x0 = Math.min(line.x0, word.x0)
  line.y0 = Math.min(line.y0, word.y0)
  line.x1 = Math.max(line.x1, word.x1)
  line.y1 = Math.max(line.y1, word.y1)
  line.centerY = (line.y0 + line.y1) / 2
  line.height = Math.max(0.5, line.y1 - line.y0)
}

export function layersFromOcrResult(result = {}, options = {}) {
  const metadata = result?.metadata || {}
  const positionedWords = (Array.isArray(result?.words) ? result.words : [])
    .map(word => ocrWordToRect(word, metadata))
    .filter(Boolean)
    .sort((a, b) => a.centerY - b.centerY || a.x0 - b.x0)

  if (!positionedWords.length) {
    return layersFromOcrText(result?.text || result, options)
  }

  const lines = []
  for (const word of positionedWords) {
    const current = lines[lines.length - 1]
    const tolerance = current ? Math.max(1.2, Math.max(current.height, word.height) * 0.9) : 0
    if (!current || Math.abs(word.centerY - current.centerY) > tolerance) {
      lines.push({
        words: [word],
        x0: word.x0,
        y0: word.y0,
        x1: word.x1,
        y1: word.y1,
        centerY: word.centerY,
        height: word.height
      })
    } else {
      appendWordToLine(current, word)
    }
  }

  const timestamp = now(options)
  return lines
    .slice(0, 80)
    .map((line, index) => {
      const words = line.words.sort((a, b) => a.x0 - b.x0)
      const text = words.map(word => word.text).join(' ')
      const height = Math.max(2, roundPercent(line.y1 - line.y0))
      return createTextLayer({
        id: createLayerId('text', timestamp, index + 1),
        text,
        x: roundPercent(line.x0),
        y: roundPercent(line.y0),
        width: Math.max(4, roundPercent(line.x1 - line.x0)),
        height,
        fontSize: Math.max(10, Math.min(22, Math.round(height * 5))),
        fontWeight: index === 0 ? '700' : '500',
        timestamp: timestamp + index
      })
    })
}

export function applyFontToTextLayers(pages = [], fontFamily) {
  const selectedFont = String(fontFamily || '').trim()
  if (!selectedFont) return pages

  return pages.map(page => ({
    ...page,
    layers: (page.layers || []).map(layer => layer.type === 'text'
      ? { ...cloneLayer(layer), fontFamily: selectedFont, updatedAt: Date.now() }
      : cloneLayer(layer)),
    updatedAt: Date.now()
  }))
}

export function buildSeparationExportPayload(options = {}) {
  const format = exportFormats.has(options.format) ? options.format : 'images'
  const selectedIds = new Set(options.selectedPageIds || [])
  const sourcePages = Array.isArray(options.pages) ? options.pages : []
  const pageRange = normalizeText(options.pageRange)
  const rangeSet = parsePageRange(pageRange, sourcePages.length)
  const rangedPages = rangeSet === null
    ? sourcePages
    : sourcePages.filter((page, index) => rangeSet.has(index + 1))
  const selectedOnly = Boolean(options.selectedOnly)
  const pages = (selectedOnly && selectedIds.size
    ? rangedPages.filter(page => selectedIds.has(page.id))
    : rangedPages
  ).map(page => ({
    id: page.id,
    name: page.name,
    imagePath: page.imagePath,
    layers: (page.layers || []).map(layer => ({
      id: layer.id,
      type: layer.type,
      text: layer.text,
      x: layer.x,
      y: layer.y,
      width: layer.width,
      height: layer.height,
      fontFamily: layer.fontFamily,
      fontSize: layer.fontSize,
      color: layer.color,
      fontWeight: layer.fontWeight,
      align: layer.align,
      fill: layer.fill,
      opacity: layer.opacity,
      radius: layer.radius,
      rotation: layer.rotation || 0,
      locked: Boolean(layer.locked),
      visible: layer.visible !== false
    }))
  }))

  return {
    format,
    outputName: normalizeText(options.outputName, '图文分离导出') || '图文分离导出',
    selectedOnly,
    pageRange,
    pages
  }
}

export function summarizeSeparationPages(pages = []) {
  return pages.reduce((summary, page) => {
    const status = pageStatuses.has(page?.status) ? page.status : 'pending'
    summary.total += 1
    summary[status] += 1
    return summary
  }, {
    total: 0,
    pending: 0,
    ocr: 0,
    editing: 0,
    completed: 0,
    failed: 0
  })
}

export function getBatchSeparationCandidates(pages = [], selectedPageIds = []) {
  const selectedIds = new Set(selectedPageIds || [])
  const sourcePages = Array.isArray(pages) ? pages : []
  const scopedPages = selectedIds.size
    ? sourcePages.filter(page => selectedIds.has(page.id))
    : sourcePages

  return scopedPages.filter(page => (
    page?.imagePath &&
    (!page.status || page.status === 'pending' || page.status === 'failed')
  ))
}

function clonePages(pages = []) {
  return JSON.parse(JSON.stringify(Array.isArray(pages) ? pages : []))
}

export function createHistoryState(pages = []) {
  return {
    past: [],
    present: clonePages(pages),
    future: [],
    canUndo: false,
    canRedo: false
  }
}

export function pushHistoryState(history, nextPages = [], limit = 30) {
  const past = [...(history?.past || []), clonePages(history?.present || [])].slice(-limit)
  return {
    past,
    present: clonePages(nextPages),
    future: [],
    canUndo: past.length > 0,
    canRedo: false
  }
}

export function undoHistoryState(history) {
  const past = history?.past || []
  if (!past.length) return history
  const previous = past[past.length - 1]
  const nextPast = past.slice(0, -1)
  const future = [clonePages(history.present || []), ...(history.future || [])]
  return {
    past: nextPast,
    present: clonePages(previous),
    future,
    canUndo: nextPast.length > 0,
    canRedo: future.length > 0
  }
}

export function redoHistoryState(history) {
  const future = history?.future || []
  if (!future.length) return history
  const next = future[0]
  const nextFuture = future.slice(1)
  const past = [...(history.past || []), clonePages(history.present || [])]
  return {
    past,
    present: clonePages(next),
    future: nextFuture,
    canUndo: past.length > 0,
    canRedo: nextFuture.length > 0
  }
}
