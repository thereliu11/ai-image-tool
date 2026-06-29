import test from 'node:test'
import assert from 'node:assert/strict'
import { cleanupPaths } from '../scripts/buildCleanup.cjs'

test('continues build cleanup when one temporary path cannot be removed', () => {
  const calls = []
  const warnings = []
  const ok = cleanupPaths(['first-temp', 'second-temp'], {
    remove: path => {
      calls.push(path)
      if (path === 'first-temp') {
        const error = new Error('EPERM')
        error.code = 'EPERM'
        throw error
      }
    },
    logger: {
      warn: message => warnings.push(message)
    }
  })

  assert.equal(ok, false)
  assert.deepEqual(calls, ['first-temp', 'second-temp'])
  assert.equal(warnings.length, 1)
  assert.match(warnings[0], /first-temp/)
})
