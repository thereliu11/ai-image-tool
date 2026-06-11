import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createTaskRecord,
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
