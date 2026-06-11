import assert from 'node:assert/strict'
import {
  ApiKeyRotator,
  CancellationRegistry,
  chunkItems,
  getRateLimitDelayMs,
  normalizeImageQuality
} from '../src/shared/batchControls.mjs'

assert.deepEqual(chunkItems([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]])
assert.deepEqual(chunkItems([1, 2], 0), [[1, 2]])
assert.deepEqual(chunkItems([], 20), [])

assert.equal(getRateLimitDelayMs({ requests: 1, perSeconds: 2 }), 2000)
assert.equal(getRateLimitDelayMs({ requests: 4, perSeconds: 2 }), 500)
assert.equal(getRateLimitDelayMs({ requests: 0, perSeconds: 2 }), 0)

assert.equal(normalizeImageQuality('low'), 'low')
assert.equal(normalizeImageQuality('medium'), 'medium')
assert.equal(normalizeImageQuality('high'), 'high')
assert.equal(normalizeImageQuality('bad-value'), 'high')
assert.equal(normalizeImageQuality(undefined), 'high')

const rotator = new ApiKeyRotator(['a', 'b', 'c'])
assert.equal(rotator.next(), 'a')
assert.equal(rotator.next(), 'b')
rotator.skip('b')
assert.equal(rotator.next(), 'c')
assert.equal(rotator.next(), 'a')
rotator.skip('a')
rotator.skip('c')
assert.equal(rotator.next(), 'b')

const registry = new CancellationRegistry()
const jobId = registry.create()
assert.equal(registry.isCanceled(jobId), false)
registry.cancel(jobId)
assert.equal(registry.isCanceled(jobId), true)
registry.finish(jobId)
assert.equal(registry.isCanceled(jobId), false)

console.log('batch-controls tests passed')
