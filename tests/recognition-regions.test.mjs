import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const {
  describeRecognitionRegions,
  filterOcrWordsByRegions,
  normalizeRecognitionRegions,
  textFromOcrWords
} = require('../src/shared/recognitionRegions.cjs')

test('normalizes recognition regions into bounded percentages', () => {
  const [region] = normalizeRecognitionRegions([
    { x: -5, y: 96, width: 120, height: 20, angle: -15, text: 'title' }
  ])

  assert.equal(region.x, 0)
  assert.equal(region.y, 96)
  assert.equal(region.width, 100)
  assert.equal(region.height, 4)
  assert.equal(region.angle, 345)
  assert.equal(region.text, 'title')
})

test('filters OCR words by include and exclude regions', () => {
  const words = [
    { text: 'left', bbox: { x0: 10, y0: 10, x1: 30, y1: 30 } },
    { text: 'middle', bbox: { x0: 45, y0: 10, x1: 55, y1: 30 } },
    { text: 'right', bbox: { x0: 80, y0: 10, x1: 95, y1: 30 } }
  ]

  const filtered = filterOcrWordsByRegions(words, [
    { x: 0, y: 0, width: 70, height: 50 },
    { x: 40, y: 0, width: 30, height: 50, excluded: true }
  ], { width: 100, height: 100 })

  assert.deepEqual(filtered.map(word => word.text), ['left'])
})

test('keeps words outside excluded regions when no include region exists', () => {
  const words = [
    { text: 'keep', bbox: { x0: 10, y0: 10, x1: 20, y1: 20 } },
    { text: 'drop', bbox: { x0: 80, y0: 10, x1: 90, y1: 20 } }
  ]

  const filtered = filterOcrWordsByRegions(words, [
    { x: 70, y: 0, width: 30, height: 40, excluded: true }
  ], { width: 100, height: 100 })

  assert.equal(textFromOcrWords(filtered), 'keep')
})

test('describes remove-text region rules for API prompts', () => {
  const prompt = describeRecognitionRegions([
    { x: 12, y: 8, width: 30, height: 20, text: 'header' },
    { x: 80, y: 80, width: 10, height: 10, excluded: true }
  ], { action: 'removeText' })

  assert.match(prompt, /区域约束/)
  assert.match(prompt, /保留区/)
  assert.match(prompt, /排除区/)
  assert.match(prompt, /header/)
})
