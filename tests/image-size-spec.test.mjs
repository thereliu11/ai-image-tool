import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getImageSizeOptions,
  normalizeImageSizeRequest,
  resolveImageSizeForProvider
} from '../src/shared/imageSizeSpec.mjs'

test('image size options expose exact Xiaohongshu 3:4 and common publish ratios', () => {
  const options = getImageSizeOptions()

  assert.ok(options.some(option => option.value === '3:4' && option.requestSize === '1024x1365'))
  assert.ok(options.some(option => option.value === '1024x1536' && option.ratio === '2:3'))
  assert.ok(options.some(option => option.value === '1024x1792' && option.ratio === '9:16'))
})

test('normalizes ratio and legacy size values into a stable generation spec', () => {
  assert.deepEqual(
    normalizeImageSizeRequest('3:4'),
    {
      value: '3:4',
      ratio: '3:4',
      label: '小红书 3:4',
      requestSize: '1024x1365',
      targetWidth: 1242,
      targetHeight: 1656,
      promptHint: '请使用 3:4 小红书竖版构图，画面主体完整，适合手机阅读。'
    }
  )

  const legacy = normalizeImageSizeRequest('1024x1536')
  assert.equal(legacy.ratio, '2:3')
  assert.equal(legacy.requestSize, '1024x1536')
})

test('resolves provider-specific 3:4 size for gpt-image-2 compatible endpoints', () => {
  const lupo = resolveImageSizeForProvider('3:4', {
    provider: 'lupoapi',
    model: 'gpt-image-2'
  })
  const legacyOpenAI = resolveImageSizeForProvider('3:4', {
    provider: 'openai',
    model: 'gpt-image-1'
  })

  assert.equal(lupo.requestSize, '1024x1365')
  assert.equal(legacyOpenAI.requestSize, '1024x1536')
  assert.match(legacyOpenAI.promptHint, /3:4/)
})
