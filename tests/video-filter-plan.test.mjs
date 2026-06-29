import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { buildVideoFilterGraph } = require('../src/shared/videoFilterPlan.cjs')

test('builds long-scroll motion filter for teaching long images', () => {
  const graph = buildVideoFilterGraph({
    imageCount: 1,
    mode: 'long-scroll',
    durationPerImage: 3,
    transition: 'none',
    resolution: '1080p'
  })

  assert.equal(graph.width, 1920)
  assert.equal(graph.height, 1080)
  assert.equal(graph.outputLabel, 'v0')
  assert.match(graph.filter, /zoompan/)
  assert.match(graph.filter, /on\*\(ih-oh\)\/90/)
})

test('builds fade transition graph for multiple images', () => {
  const graph = buildVideoFilterGraph({
    imageCount: 3,
    mode: 'multi-scroll',
    durationPerImage: 2,
    transition: 'fade',
    resolution: '720p'
  })

  assert.equal(graph.width, 1280)
  assert.equal(graph.height, 720)
  assert.equal(graph.outputLabel, 'xf2')
  assert.match(graph.filter, /xfade=transition=fade/)
  assert.match(graph.filter, /offset=1\.5/)
  assert.match(graph.filter, /offset=3/)
})

test('maps slide transition to horizontal xfade animation', () => {
  const graph = buildVideoFilterGraph({
    imageCount: 2,
    mode: 'horizontal-switch',
    durationPerImage: 2,
    transition: 'slide'
  })

  assert.equal(graph.outputLabel, 'xf1')
  assert.match(graph.filter, /transition=slideleft/)
  assert.match(graph.filter, /x='min/)
})

test('uses concat when transition is disabled', () => {
  const graph = buildVideoFilterGraph({
    imageCount: 2,
    mode: 'single-scroll',
    durationPerImage: 2,
    transition: 'none'
  })

  assert.equal(graph.outputLabel, 'outv')
  assert.match(graph.filter, /concat=n=2:v=1:a=0/)
})
