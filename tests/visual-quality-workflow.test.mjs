import test from 'node:test'
import assert from 'node:assert/strict'
import {
  evaluateVisualQualityMetrics,
  summarizeVisualQuality
} from '../src/renderer/src/utils/visualQualityWorkflow.mjs'

test('passes visual quality when ratio and readability metrics are healthy', () => {
  const result = evaluateVisualQualityMetrics({
    width: 1200,
    height: 1600,
    brightness: 0.56,
    contrast: 0.24,
    sharpness: 120
  }, {
    targetRatio: '3:4'
  })

  assert.equal(result.needsReview, false)
  assert.ok(result.score >= 85)
  assert.deepEqual(result.warnings, [])
})

test('treats 1024x1365 as the exact Xiaohongshu 3:4 target', () => {
  const result = evaluateVisualQualityMetrics({
    width: 1024,
    height: 1365,
    brightness: 0.56,
    contrast: 0.24,
    sharpness: 120
  }, {
    targetRatio: '1024x1365'
  })

  assert.equal(result.needsReview, false)
  assert.equal(result.ratioDelta, 0)
})

test('flags visual quality issues without changing generation status', () => {
  const result = evaluateVisualQualityMetrics({
    width: 1536,
    height: 1024,
    brightness: 0.18,
    contrast: 0.05,
    sharpness: 12,
    status: '已完成'
  }, {
    targetRatio: '3:4'
  })

  assert.equal(result.needsReview, true)
  assert.equal(result.status, '已完成')
  assert.ok(result.score < 70)
  assert.ok(result.warnings.includes('比例偏差较大'))
  assert.ok(result.warnings.includes('画面偏暗'))
  assert.ok(result.warnings.includes('对比度偏低'))
  assert.ok(result.warnings.includes('清晰度偏低'))
})

test('summarizes visual quality results', () => {
  assert.deepEqual(summarizeVisualQuality([
    { needsReview: false },
    { needsReview: true },
    { error: 'metadata failed' }
  ]), {
    total: 3,
    passed: 1,
    review: 1,
    failed: 1
  })
})
