import test from 'node:test'
import assert from 'node:assert/strict'
import { parsePageRanges } from '../src/shared/pageRange.mjs'

test('parses comma separated page ranges', () => {
  assert.deepEqual(parsePageRanges('1-3,5', 8), [1, 2, 3, 5])
})

test('deduplicates and clamps page ranges', () => {
  assert.deepEqual(parsePageRanges('2,2,4-9', 5), [2, 4, 5])
})

test('returns all pages when input is blank', () => {
  assert.deepEqual(parsePageRanges('', 3), [1, 2, 3])
})
