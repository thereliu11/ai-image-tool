import test from 'node:test'
import assert from 'node:assert/strict'
import {
  applyQualityResultsToItems,
  createQualityQueue,
  summarizeQualityResults
} from '../src/renderer/src/utils/qualityWorkflow.mjs'

test('creates quality queues from completed items only', () => {
  const queue = createQualityQueue([
    { id: 1, referenceImage: 'a.png', generatedImage: 'a-out.png', status: '已完成' },
    { id: 2, referenceImage: 'b.png', status: '待生成' },
    { id: 3, generatedImage: 'c-out.png', status: '已完成' }
  ])

  assert.deepEqual(queue.map(item => item.id), [1])
})

test('applies quality results without automatic retry', () => {
  const items = [{ id: 1, status: '已完成' }, { id: 2, status: '已完成' }]
  const next = applyQualityResultsToItems(items, [
    { id: 1, score: 92, needsReview: false },
    { id: 2, score: 61, needsReview: true }
  ])

  assert.equal(next[0].qualityStatus, 'passed')
  assert.equal(next[1].qualityStatus, 'review')
  assert.equal(next[1].status, '已完成')
})

test('summarizes quality review results', () => {
  assert.deepEqual(summarizeQualityResults([
    { needsReview: false },
    { needsReview: true },
    { error: 'OCR failed' }
  ]), {
    total: 3,
    passed: 1,
    review: 1,
    failed: 1
  })
})
