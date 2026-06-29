import test from 'node:test'
import assert from 'node:assert/strict'
import {
  recoverInterruptedItems,
  summarizeResumeCandidates
} from '../src/renderer/src/utils/resumeWorkflow.mjs'

test('recovers only interrupted items and never retries failed items automatically', () => {
  const items = [
    { id: 1, status: '生成中', error: 'stopped' },
    { id: 2, status: 'running', generatedImage: null },
    { id: 3, status: '失败', error: '429' },
    { id: 4, status: '已完成', generatedImage: 'ok.jpg' }
  ]

  const recovered = recoverInterruptedItems(items)

  assert.equal(recovered[0].status, '待生成')
  assert.equal(recovered[0].error, null)
  assert.equal(recovered[1].status, '待生成')
  assert.equal(recovered[2].status, '失败')
  assert.equal(recovered[2].error, '429')
  assert.equal(recovered[3].status, '已完成')
})

test('summarizes manual resume candidates separately from failed items', () => {
  const summary = summarizeResumeCandidates([
    { id: 1, status: '生成中' },
    { id: 2, status: 'pending' },
    { id: 3, status: '失败' },
    { id: 4, status: 'completed' }
  ])

  assert.deepEqual(summary, {
    interrupted: 1,
    pending: 1,
    failed: 1,
    completed: 1
  })
})
