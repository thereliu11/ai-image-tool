import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildAsyncPollUrl,
  extractAsyncTaskInfo,
  extractImagePayloadFromAsyncResult,
  isAsyncTaskFinished
} from '../src/renderer/src/utils/asyncTaskPolling.mjs'

test('extracts async task ids from common provider response shapes', () => {
  assert.deepEqual(extractAsyncTaskInfo({ data: { task_id: 'tsk_001' } }), {
    taskId: 'tsk_001',
    statusUrl: ''
  })
  assert.deepEqual(extractAsyncTaskInfo({ data: { data: { id: 'job_002', status_url: '/v1/tasks/job_002' } } }), {
    taskId: 'job_002',
    statusUrl: '/v1/tasks/job_002'
  })
})

test('builds provider-agnostic polling URLs', () => {
  assert.equal(buildAsyncPollUrl('https://ai.example.com/v1', { taskId: 'tsk_001' }), 'https://ai.example.com/v1/tasks/tsk_001')
  assert.equal(buildAsyncPollUrl('https://ai.example.com/v1', { statusUrl: '/jobs/tsk_001' }), 'https://ai.example.com/jobs/tsk_001')
})

test('detects completed async tasks and extracts image payload', () => {
  assert.equal(isAsyncTaskFinished({ status: 'succeeded' }), true)
  assert.equal(isAsyncTaskFinished({ data: { status: 'processing' } }), false)
  assert.deepEqual(extractImagePayloadFromAsyncResult({ data: { output: [{ b64_json: 'abc' }] } }), {
    type: 'base64',
    value: 'abc'
  })
  assert.deepEqual(extractImagePayloadFromAsyncResult({ data: { result_url: 'https://example.com/a.jpg' } }), {
    type: 'url',
    value: 'https://example.com/a.jpg'
  })
})
