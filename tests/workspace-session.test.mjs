import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createWorkspaceSnapshot,
  restoreWorkspaceSnapshot
} from '../src/renderer/src/utils/workspaceSession.mjs'

test('creates and restores workspace snapshots for generation sessions', () => {
  const snapshot = createWorkspaceSnapshot({
    goodsList: [{ id: 1, title: 'a.png', status: '待生成' }],
    promptText: '清爽重点笔记风',
    selectedTemplate: '默认',
    selectedSize: '3:4',
    activeTab: 'create',
    timestamp: 123
  })

  assert.equal(snapshot.version, 1)
  assert.equal(snapshot.goodsList.length, 1)

  const restored = restoreWorkspaceSnapshot(JSON.stringify(snapshot))
  assert.equal(restored.promptText, '清爽重点笔记风')
  assert.equal(restored.activeTab, 'create')
})
