import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createRecognitionRegion,
  createRecognitionRegionFromDrag,
  nudgeRecognitionRegion,
  pickCanvasColor,
  toggleRecognitionRegion
} from '../src/renderer/src/utils/separationRegionWorkflow.mjs'

test('creates and toggles OCR recognition regions for manual correction', () => {
  const region = createRecognitionRegion({
    x: 10,
    y: 20,
    width: 30,
    height: 15,
    angle: -15,
    text: '中考'
  }, { now: 5000 })

  assert.equal(region.id, 'region-5000')
  assert.equal(region.angle, 345)
  assert.equal(region.text, '中考')

  const excluded = toggleRecognitionRegion(region, true)
  assert.equal(excluded.excluded, true)
})

test('nudges regions with keyboard-like fine tuning', () => {
  const region = createRecognitionRegion({ x: 10, y: 20, width: 30, height: 15 }, { now: 5000 })
  const nudged = nudgeRecognitionRegion(region, { dx: 1, dy: -2, dw: 3, dh: 4 })

  assert.equal(nudged.x, 11)
  assert.equal(nudged.y, 18)
  assert.equal(nudged.width, 33)
  assert.equal(nudged.height, 19)
})

test('creates OCR recognition region from reverse canvas drag', () => {
  const region = createRecognitionRegionFromDrag(
    { x: 72, y: 64 },
    { x: 18, y: 22 },
    { now: 7000, text: 'answer area' }
  )

  assert.equal(region.id, 'region-7000')
  assert.equal(region.x, 18)
  assert.equal(region.y, 22)
  assert.equal(region.width, 54)
  assert.equal(region.height, 42)
  assert.equal(region.text, 'answer area')

  const tiny = createRecognitionRegionFromDrag({ x: 12, y: 12 }, { x: 12.2, y: 12.3 }, { now: 7001 })
  assert.equal(tiny.width, 1)
  assert.equal(tiny.height, 1)
})

test('picks canvas color from RGBA pixel data for brush repair', () => {
  const pixels = new Uint8ClampedArray([
    255, 255, 255, 255,
    29, 78, 216, 255,
    0, 0, 0, 255,
    34, 197, 94, 255
  ])

  assert.equal(pickCanvasColor(pixels, { width: 2, x: 1, y: 0 }), '#1d4ed8')
  assert.equal(pickCanvasColor(pixels, { width: 2, x: 1, y: 1 }), '#22c55e')
})
