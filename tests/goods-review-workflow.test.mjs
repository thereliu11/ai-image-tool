import test from 'node:test'
import assert from 'node:assert/strict'
import {
  filterGoodsForReview,
  getGoodsReviewStats,
  getNextReviewItem
} from '../src/renderer/src/utils/goodsReviewWorkflow.mjs'

const goods = [
  { id: 1, title: 'page_001.png', status: 'completed', selected: true, generatedImage: 'out-1.png' },
  { id: 2, title: 'page_002.png', status: 'failed', selected: true, error: '429' },
  { id: 3, title: 'math_cover.png', status: 'pending', selected: false },
  { id: 4, title: 'page_004.png', status: 'failed', selected: false, error: 'timeout' }
]

test('summarizes goods review states for the workbench strip', () => {
  const stats = getGoodsReviewStats(goods)

  assert.deepEqual(stats, {
    total: 4,
    selected: 2,
    pending: 1,
    running: 0,
    completed: 1,
    failed: 2
  })
})

test('filters goods by status, selected state and keyword', () => {
  assert.deepEqual(
    filterGoodsForReview(goods, { status: 'failed' }).map(item => item.id),
    [2, 4]
  )
  assert.deepEqual(
    filterGoodsForReview(goods, { selectedOnly: true, status: 'failed' }).map(item => item.id),
    [2]
  )
  assert.deepEqual(
    filterGoodsForReview(goods, { keyword: 'cover' }).map(item => item.id),
    [3]
  )
})

test('finds the next review item after the current item and wraps around', () => {
  assert.equal(getNextReviewItem(goods, 2, { status: 'failed' })?.id, 4)
  assert.equal(getNextReviewItem(goods, 4, { status: 'failed' })?.id, 2)
  assert.equal(getNextReviewItem(goods, 1, { status: 'running' }), null)
})
