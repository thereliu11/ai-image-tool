import test from 'node:test'
import assert from 'node:assert/strict'
import {
  applyFontToTextLayers,
  buildSeparationExportPayload,
  createBrushLayer,
  createHistoryState,
  createMaskLayer,
  createSeparationPages,
  createTextLayer,
  duplicateLayer,
  getBatchSeparationCandidates,
  layersFromOcrText,
  layersFromOcrResult,
  nudgeLayer,
  removeLayer,
  pushHistoryState,
  redoHistoryState,
  summarizeSeparationPages,
  toggleLayerLock,
  undoHistoryState,
  updateLayer,
  upsertLayer
} from '../src/renderer/src/utils/separationWorkspace.mjs'

test('creates separation pages from image paths with pending status', () => {
  const pages = createSeparationPages([
    'C:/demo/page_001.png',
    'C:/demo/page_002.jpg'
  ], { timestamp: 12345 })

  assert.equal(pages.length, 2)
  assert.deepEqual(pages.map(page => page.name), ['page_001.png', 'page_002.jpg'])
  assert.deepEqual(pages.map(page => page.status), ['pending', 'pending'])
  assert.deepEqual(pages.map(page => page.id), [
    'separation-page-1-12345',
    'separation-page-2-12345'
  ])
  assert.deepEqual(pages[0].layers, [])
})

test('creates editable text, mask and brush layers with stable defaults', () => {
  const text = createTextLayer({ text: 'Unit 1', x: 10, y: 12, timestamp: 100 })
  const mask = createMaskLayer({ x: 5, y: 6, width: 20, height: 10, timestamp: 101 })
  const brush = createBrushLayer({ x: 50, y: 55, size: 8, timestamp: 102 })

  assert.equal(text.type, 'text')
  assert.equal(text.text, 'Unit 1')
  assert.equal(text.fontFamily, 'Microsoft YaHei')
  assert.equal(text.color, '#111827')
  assert.equal(mask.type, 'mask')
  assert.equal(mask.fill, '#ffffff')
  assert.equal(mask.opacity, 100)
  assert.deepEqual(
    { x: brush.x, y: brush.y, width: brush.width, height: brush.height, radius: brush.radius },
    { x: 50, y: 55, width: 8, height: 8, radius: 999 }
  )
})

test('adds, updates, nudges and removes layers without mutating the source page', () => {
  const page = createSeparationPages(['D:/demo/a.png'], { timestamp: 200 })[0]
  const layer = createTextLayer({ text: 'Hello', x: 20, y: 30, timestamp: 201 })
  const withLayer = upsertLayer(page, layer)
  const updated = updateLayer(withLayer, layer.id, { x: 24 })
  const nudged = nudgeLayer(updated, layer.id, { dx: -4, dy: 5 })
  const removed = removeLayer(nudged, layer.id)

  assert.equal(page.layers.length, 0)
  assert.equal(withLayer.layers.length, 1)
  assert.deepEqual({ x: nudged.layers[0].x, y: nudged.layers[0].y }, { x: 20, y: 35 })
  assert.equal(removed.layers.length, 0)
})

test('converts OCR text into editable text layers and applies font in batch', () => {
  const layers = layersFromOcrText('Unit 1\n重点短语\n\n句型转换', { timestamp: 300 })
  const pages = createSeparationPages(['D:/demo/a.png'], { timestamp: 301 })
  const withLayers = [{ ...pages[0], layers }]
  const patched = applyFontToTextLayers(withLayers, 'KaiTi')

  assert.deepEqual(layers.map(layer => layer.text), ['Unit 1', '重点短语', '句型转换'])
  assert.ok(layers[1].y > layers[0].y)
  assert.deepEqual(patched[0].layers.map(layer => layer.fontFamily), ['KaiTi', 'KaiTi', 'KaiTi'])
})

test('converts positioned OCR words into line-aligned editable layers', () => {
  const layers = layersFromOcrResult({
    text: 'Unit Home\nstudy',
    metadata: { width: 1000, height: 2000 },
    words: [
      { text: 'Home', bbox: { x0: 170, y0: 104, x1: 240, y1: 134 } },
      { text: 'Unit', bbox: { x0: 100, y0: 100, x1: 160, y1: 130 } },
      { text: 'study', bbox: { x0: 100, y0: 200, x1: 190, y1: 232 } }
    ]
  }, { timestamp: 302 })

  assert.equal(layers.length, 2)
  assert.deepEqual(layers.map(layer => layer.text), ['Unit Home', 'study'])
  assert.equal(layers[0].x, 10)
  assert.equal(layers[0].y, 5)
  assert.equal(layers[0].width, 14)
  assert.equal(layers[1].y, 10)
})

test('builds export payload for selected pages and summarizes progress', () => {
  const pages = createSeparationPages([
    'C:/demo/page_001.png',
    'C:/demo/page_002.png'
  ], { timestamp: 400 }).map((page, index) => ({
    ...page,
    status: index === 0 ? 'completed' : 'pending',
    layers: index === 0 ? [createTextLayer({ text: 'A', timestamp: 401 })] : []
  }))

  const payload = buildSeparationExportPayload({
    pages,
    selectedPageIds: [pages[0].id],
    format: 'pptx',
    selectedOnly: true,
    outputName: '英语重点短语'
  })

  assert.equal(payload.format, 'pptx')
  assert.equal(payload.outputName, '英语重点短语')
  assert.equal(payload.pages.length, 1)
  assert.equal(payload.pages[0].layers[0].text, 'A')
  assert.deepEqual(summarizeSeparationPages(pages), {
    total: 2,
    pending: 1,
    ocr: 0,
    editing: 0,
    completed: 1,
    failed: 0
  })
})

test('builds export payload from absolute page ranges and pdf format', () => {
  const pages = createSeparationPages([
    'C:/demo/page_001.png',
    'C:/demo/page_002.png',
    'C:/demo/page_003.png',
    'C:/demo/page_004.png',
    'C:/demo/page_005.png'
  ], { timestamp: 450 })

  const payload = buildSeparationExportPayload({
    pages,
    format: 'pdf',
    pageRange: '1,3-4',
    outputName: 'partial-export'
  })

  assert.equal(payload.format, 'pdf')
  assert.deepEqual(payload.pages.map(page => page.name), [
    'page_001.png',
    'page_003.png',
    'page_004.png'
  ])
  assert.equal(payload.pageRange, '1,3-4')
})

test('intersects page ranges with selected page ids when selected-only is enabled', () => {
  const pages = createSeparationPages([
    'C:/demo/page_001.png',
    'C:/demo/page_002.png',
    'C:/demo/page_003.png',
    'C:/demo/page_004.png'
  ], { timestamp: 451 })

  const payload = buildSeparationExportPayload({
    pages,
    selectedPageIds: [pages[1].id, pages[3].id],
    selectedOnly: true,
    pageRange: '1-3',
    format: 'images'
  })

  assert.deepEqual(payload.pages.map(page => page.name), ['page_002.png'])
})

test('finds manual batch separation candidates from selected unfinished pages', () => {
  const pages = createSeparationPages([
    'C:/demo/page_001.png',
    'C:/demo/page_002.png',
    'C:/demo/page_003.png'
  ], { timestamp: 452 }).map((page, index) => ({
    ...page,
    status: index === 1 ? 'completed' : page.status
  }))

  const candidates = getBatchSeparationCandidates(pages, [pages[0].id, pages[1].id])

  assert.deepEqual(candidates.map(page => page.name), ['page_001.png'])
})

test('tracks undo and redo history for separation pages', () => {
  const first = createSeparationPages(['D:/a.png'], { timestamp: 1 })
  const second = [{ ...first[0], layers: [createTextLayer({ text: 'A', timestamp: 2 })] }]
  let history = createHistoryState(first)

  history = pushHistoryState(history, second)
  assert.equal(history.canUndo, true)

  history = undoHistoryState(history)
  assert.equal(history.present[0].layers.length, 0)
  assert.equal(history.canRedo, true)

  history = redoHistoryState(history)
  assert.equal(history.present[0].layers.length, 1)
})

test('duplicates, locks and rotates layers for richer editing', () => {
  const page = createSeparationPages(['D:/demo/a.png'], { timestamp: 500 })[0]
  const layer = createTextLayer({ text: '重点', x: 20, y: 30, timestamp: 501 })
  const withLayer = upsertLayer(page, layer)
  const duplicated = duplicateLayer(withLayer, layer.id, { timestamp: 502 })

  assert.equal(duplicated.layers.length, 2)
  assert.notEqual(duplicated.layers[1].id, layer.id)
  assert.equal(duplicated.layers[1].text, '重点')
  assert.equal(duplicated.layers[1].x, 22)

  const locked = toggleLayerLock(duplicated, layer.id, true)
  const unchanged = updateLayer(locked, layer.id, { x: 80, rotation: 45 })
  assert.equal(unchanged.layers[0].x, 20)
  assert.equal(unchanged.layers[0].rotation, 0)

  const unlocked = toggleLayerLock(unchanged, layer.id, false)
  const rotated = updateLayer(unlocked, layer.id, { rotation: 370 })
  assert.equal(rotated.layers[0].rotation, 10)
})
