import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildAdvancedWatermarkPayload,
  buildPdfImagesRequest,
  buildVideoCreateRequest,
  buildPdfExportPlan,
  buildVideoCreatePlan,
  buildSceneComposeRequest,
  normalizeAdvancedCollageRequest,
  normalizeSceneComposeRequest,
  normalizeWatermarkRequest
} from '../src/renderer/src/utils/toolboxAdvancedWorkflow.mjs'

test('normalizes advanced collage options for high-resolution batch export', () => {
  const request = normalizeAdvancedCollageRequest({
    imagePaths: ['1.png', '2.png', '3.png'],
    layout: '2x2',
    scale: 3,
    gap: -10,
    borderWidth: 4,
    borderColor: '#1d4ed8',
    background: '#f8fafc',
    exportZip: true
  })

  assert.equal(request.layout, '2x2')
  assert.equal(request.options.scale, 2)
  assert.equal(request.options.gap, 0)
  assert.equal(request.options.borderWidth, 4)
  assert.equal(request.options.exportZip, true)
})

test('normalizes watermark with font and logo mode', () => {
  const request = normalizeWatermarkRequest({
    text: 'AI教辅',
    mode: 'logo',
    logoPath: 'logo.png',
    fontFamily: 'KaiTi',
    opacity: 120
  })

  assert.equal(request.mode, 'logo')
  assert.equal(request.logoPath, 'logo.png')
  assert.equal(request.fontFamily, 'KaiTi')
  assert.equal(request.opacity, 100)
})

test('builds video and PDF export plans with missing document options', () => {
  const video = buildVideoCreatePlan({
    mode: 'long-scroll',
    imagePaths: ['a.png', 'b.png'],
    durationPerImage: 1.5,
    transition: 'slide'
  })
  const pdf = buildPdfExportPlan({
    pageRange: '1-2,4',
    resolution: '2x',
    downloadMode: 'zip'
  }, { totalPages: 5 })

  assert.equal(video.mode, 'long-scroll')
  assert.equal(video.transition, 'slide')
  assert.deepEqual(pdf.pages, [1, 2, 4])
  assert.equal(pdf.resolution, '2x')
  assert.equal(pdf.downloadMode, 'zip')
})

test('builds executable toolbox IPC payloads from advanced options', () => {
  const watermark = buildAdvancedWatermarkPayload({
    inputPath: 'cover.png',
    mode: 'text',
    text: '试看页',
    fontFamily: 'KaiTi',
    position: 'center',
    opacity: 45
  })
  const video = buildVideoCreateRequest({
    imagePaths: ['1.png', '2.png'],
    mode: 'horizontal-switch',
    durationPerImage: 3,
    transition: 'fade',
    resolution: '720p'
  })
  const pdf = buildPdfImagesRequest({
    inputPath: 'book.pdf',
    pageRange: '2-4',
    resolution: '2x',
    downloadMode: 'zip'
  }, { totalPages: 5 })

  assert.equal(watermark.inputPath, 'cover.png')
  assert.equal(watermark.text, '试看页')
  assert.equal(watermark.fontFamily, 'KaiTi')
  assert.equal(watermark.opacity, 45)
  assert.equal(video.duration, 3)
  assert.equal(video.mode, 'horizontal-switch')
  assert.equal(video.transition, 'fade')
  assert.deepEqual(pdf.pages, [2, 3, 4])
  assert.equal(pdf.options.scale, 2)
  assert.equal(pdf.options.exportZip, true)
})

test('normalizes scene compose options for background mockup export', () => {
  const request = normalizeSceneComposeRequest({
    backgroundPath: 'desk.png',
    overlayPath: 'page.png',
    preset: 'paper-center',
    opacity: 130,
    blend: 'multiply',
    fit: 'cover'
  })

  assert.equal(request.backgroundPath, 'desk.png')
  assert.equal(request.overlayPath, 'page.png')
  assert.equal(request.opacity, 100)
  assert.equal(request.blend, 'multiply')
  assert.equal(request.fit, 'cover')
  assert.equal(request.points.length, 4)
  assert.deepEqual(request.points[0], { x: 22, y: 10 })
})

test('builds scene compose IPC payload with custom bounded points', () => {
  const request = buildSceneComposeRequest({
    backgroundPath: 'bg.jpg',
    overlayPath: 'result.jpg',
    preset: 'custom',
    points: [
      { x: -10, y: 8 },
      { x: 120, y: 9 },
      { x: 91, y: 96 },
      { x: 10, y: 97 }
    ],
    opacity: 55,
    blend: 'screen',
    fit: 'contain'
  })

  assert.equal(request.backgroundPath, 'bg.jpg')
  assert.equal(request.overlayPath, 'result.jpg')
  assert.equal(request.options.opacity, 55)
  assert.equal(request.options.blend, 'screen')
  assert.equal(request.options.fit, 'contain')
  assert.deepEqual(request.options.points[0], { x: 0, y: 8 })
  assert.deepEqual(request.options.points[1], { x: 100, y: 9 })
})
