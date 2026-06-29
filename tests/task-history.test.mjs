import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createGeneratedHistoryRecord,
  createTaskRecord,
  clearTaskRecords,
  deleteTaskRecord,
  createHistoryRedoPayload,
  upsertTaskRecord,
  markTaskRecord,
  filterTaskRecords,
  getTaskHistoryStats
} from '../src/renderer/src/utils/taskHistory.mjs'

test('creates a task history record from a generated item', () => {
  const record = createTaskRecord({
    item: {
      id: 3,
      title: 'page_003.png',
      referenceImage: 'C:/input/page_003.png',
      generatedImage: 'C:/output/page_003.png',
      status: '已完成'
    },
    folderName: '七年级英语',
    provider: 'lupoapi',
    model: 'gpt-image-2',
    mode: 'openaiRedraw',
    prompt: '清爽重点笔记风'
  })

  assert.equal(record.title, 'page_003.png')
  assert.equal(record.reviewStatus, 'pending')
  assert.equal(record.provider, 'lupoapi')
  assert.equal(record.model, 'gpt-image-2')
  assert.ok(record.id.includes('3-page_003.png'))
})

test('upserts, marks, filters and summarizes task history records', () => {
  const first = createTaskRecord({
    item: { id: 1, title: 'a.png', status: '已完成', generatedImage: 'C:/a.png' },
    folderName: '项目A',
    provider: 'openai',
    model: 'gpt-image-2',
    mode: 'openaiRedraw',
    prompt: ''
  })
  const second = createTaskRecord({
    item: { id: 2, title: 'b.png', status: '失败', error: '429' },
    folderName: '项目A',
    provider: 'openai',
    model: 'gpt-image-2',
    mode: 'openaiRedraw',
    prompt: ''
  })

  let records = upsertTaskRecord([], first)
  records = upsertTaskRecord(records, second)
  records = markTaskRecord(records, first.id, 'satisfied')
  records = markTaskRecord(records, second.id, 'review')

  assert.equal(filterTaskRecords(records, 'satisfied').length, 1)
  assert.equal(filterTaskRecords(records, 'review').length, 1)
  assert.equal(filterTaskRecords(records, 'failed').length, 1)
  assert.deepEqual(getTaskHistoryStats(records), {
    total: 2,
    satisfied: 1,
    review: 1,
    failed: 1
  })
})

test('creates generic generated history records for shared history dialog', () => {
  const record = createGeneratedHistoryRecord({
    type: 'textToImage',
    title: '数学资料封面',
    folderName: '文生图',
    generatedImage: 'D:/demo/math.jpg',
    provider: 'lupoapi',
    model: 'gpt-image-2',
    mode: 'cover',
    prompt: '生成数学封面',
    taskId: 'task-001',
    timestamp: '2026-06-27T08:00:00.000Z'
  })

  assert.equal(record.id, 'textToImage-task-001')
  assert.equal(record.type, 'textToImage')
  assert.equal(record.title, '数学资料封面')
  assert.equal(record.generatedImage, 'D:/demo/math.jpg')
  assert.equal(record.reviewStatus, 'pending')
  assert.equal(record.status, 'completed')
})

test('deletes one history record and clears all records', () => {
  const first = createGeneratedHistoryRecord({ taskId: 'a', title: 'A' })
  const second = createGeneratedHistoryRecord({ taskId: 'b', title: 'B' })
  const records = [first, second]

  assert.deepEqual(deleteTaskRecord(records, first.id).map(record => record.id), [second.id])
  assert.deepEqual(clearTaskRecords(records), [])
})

test('creates redo payloads for text-to-image history records', () => {
  const record = createGeneratedHistoryRecord({
    type: 'textToImage',
    title: '英语短语重点页',
    prompt: '生成英语短语重点页',
    provider: 'lupoapi',
    model: 'gpt-image-2',
    mode: 'material',
    metadata: {
      ratio: '3:4',
      quality: 'medium'
    },
    taskId: 'redo-001'
  })

  const payload = createHistoryRedoPayload(record)

  assert.deepEqual(payload, {
    type: 'textToImage',
    title: '英语短语重点页',
    prompt: '生成英语短语重点页',
    ratio: '3:4',
    quality: 'medium',
    mode: 'material'
  })
})
