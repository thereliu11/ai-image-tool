import test from 'node:test'
import assert from 'node:assert/strict'
import { diagnoseGenerationError } from '../src/renderer/src/utils/errorDiagnosis.mjs'

test('diagnoses rate limit and quota errors with actionable guidance', () => {
  const diagnosis = diagnoseGenerationError('Request failed with status code 429: quota exceeded')

  assert.equal(diagnosis.code, 'rate_limit')
  assert.equal(diagnosis.title, '接口限流或额度不足')
  assert.match(diagnosis.summary, /429/)
  assert.ok(diagnosis.actions.includes('把并发数调到 1'))
  assert.ok(diagnosis.actions.includes('检查 API 余额或更换 API Key'))
})

test('diagnoses invalid api key and timeout errors', () => {
  const keyDiagnosis = diagnoseGenerationError({ message: '401 Unauthorized invalid api key' })
  const timeoutDiagnosis = diagnoseGenerationError(new Error('API request timeout ETIMEDOUT'))

  assert.equal(keyDiagnosis.code, 'invalid_key')
  assert.match(keyDiagnosis.summary, /API Key/)
  assert.equal(timeoutDiagnosis.code, 'timeout')
  assert.ok(timeoutDiagnosis.actions.includes('检查网络或代理设置'))
})

test('falls back to original message for unknown generation errors', () => {
  const diagnosis = diagnoseGenerationError('unexpected provider response')

  assert.equal(diagnosis.code, 'unknown')
  assert.equal(diagnosis.title, '未知错误')
  assert.match(diagnosis.summary, /unexpected provider response/)
})

test('diagnoses provider responses that contain no generated image', () => {
  const diagnosis = diagnoseGenerationError('Gemini响应格式错误：未找到图片数据')

  assert.equal(diagnosis.code, 'no_image_payload')
  assert.equal(diagnosis.title, '接口没有返回图片')
  assert.ok(diagnosis.actions.includes('确认当前模型支持图片生成而不是只支持文字回复'))
})
