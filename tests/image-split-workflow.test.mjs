import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildImageSplitOutputName,
  buildImageSplitPlan,
  normalizeImageSplitRequest
} from '../src/renderer/src/utils/imageSplitWorkflow.mjs'

test('normalizes image split request with safe defaults and bounds', () => {
  const request = normalizeImageSplitRequest({
    imagePaths: ['a.png', '', 'b.jpg'],
    direction: 'diagonal',
    targetSize: 99999,
    overlap: -30,
    format: 'bmp',
    outputName: '  cards  '
  })

  assert.deepEqual(request.imagePaths, ['a.png', 'b.jpg'])
  assert.equal(request.direction, 'vertical')
  assert.equal(request.targetSize, 4096)
  assert.equal(request.overlap, 0)
  assert.equal(request.format, 'png')
  assert.equal(request.outputName, 'cards')
})

test('builds vertical split slices with overlap for long teaching images', () => {
  const plan = buildImageSplitPlan({
    imagePaths: ['long.png'],
    targetSize: 1000,
    overlap: 100,
    outputName: 'lesson-card'
  }, {
    'long.png': { width: 800, height: 2500 }
  })

  assert.equal(plan.totalCount, 3)
  assert.deepEqual(plan.slices.map(slice => ({
    left: slice.left,
    top: slice.top,
    width: slice.width,
    height: slice.height
  })), [
    { left: 0, top: 0, width: 800, height: 1000 },
    { left: 0, top: 900, width: 800, height: 1000 },
    { left: 0, top: 1800, width: 800, height: 700 }
  ])
  assert.equal(plan.slices[0].outputName, 'lesson-card_001.png')
  assert.equal(plan.slices[2].outputName, 'lesson-card_003.png')
})

test('keeps short images as one slice and names outputs predictably', () => {
  const plan = buildImageSplitPlan({
    imagePaths: ['short.jpg'],
    targetSize: 1365,
    format: 'jpeg'
  }, {
    'short.jpg': { width: 900, height: 1200 }
  })

  assert.equal(plan.totalCount, 1)
  assert.equal(plan.slices[0].top, 0)
  assert.equal(plan.slices[0].height, 1200)
  assert.equal(plan.slices[0].outputName, 'short_001.jpeg')
  assert.equal(buildImageSplitOutputName('unit 1/home', 12, 'webp'), 'unit_1_home_012.webp')
})
