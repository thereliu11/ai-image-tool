import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { resolveFfmpegPath } = require('../src/shared/ffmpegResolver.cjs')

test('uses bundled ffmpeg when it can report version', () => {
  const path = resolveFfmpegPath({
    bundledPath: 'C:/app/ffmpeg.exe',
    execFileSync: (candidate) => {
      assert.equal(candidate, 'C:/app/ffmpeg.exe')
      return Buffer.from('ffmpeg version')
    }
  })

  assert.equal(path, 'C:/app/ffmpeg.exe')
})

test('prefers configured ffmpeg path before bundled binary', () => {
  const attempts = []
  const path = resolveFfmpegPath({
    configuredPath: 'D:/Tools/ffmpeg/bin/ffmpeg.exe',
    bundledPath: 'C:/app/ffmpeg.exe',
    execFileSync: (candidate) => {
      attempts.push(candidate)
      return Buffer.from('ffmpeg version')
    }
  })

  assert.equal(path, 'D:/Tools/ffmpeg/bin/ffmpeg.exe')
  assert.deepEqual(attempts, ['D:/Tools/ffmpeg/bin/ffmpeg.exe'])
})

test('falls back when configured ffmpeg path is invalid', () => {
  const attempts = []
  const path = resolveFfmpegPath({
    configuredPath: 'bad.exe',
    bundledPath: 'C:/app/ffmpeg.exe',
    execFileSync: (candidate) => {
      attempts.push(candidate)
      if (candidate === 'bad.exe') throw new Error('bad path')
      return Buffer.from('ffmpeg version')
    }
  })

  assert.equal(path, 'C:/app/ffmpeg.exe')
  assert.deepEqual(attempts, ['bad.exe', 'C:/app/ffmpeg.exe'])
})

test('can require configured ffmpeg path to be valid', () => {
  assert.throws(() => resolveFfmpegPath({
    configuredPath: 'bad.exe',
    requireConfigured: true,
    bundledPath: 'C:/app/ffmpeg.exe',
    execFileSync: (candidate) => {
      if (candidate === 'bad.exe') throw new Error('bad path')
      return Buffer.from('ffmpeg version')
    }
  }), /bad\.exe/)
})

test('falls back to system ffmpeg when bundled binary is invalid', () => {
  const attempts = []
  const path = resolveFfmpegPath({
    bundledPath: 'broken.exe',
    execFileSync: (candidate) => {
      attempts.push(candidate)
      if (candidate === 'broken.exe') throw new Error('spawn EFTYPE')
      return Buffer.from('ffmpeg version')
    }
  })

  assert.equal(path, 'ffmpeg')
  assert.deepEqual(attempts, ['broken.exe', 'ffmpeg'])
})

test('throws clear error when no ffmpeg binary is usable', () => {
  assert.throws(() => resolveFfmpegPath({
    bundledPath: 'broken.exe',
    execFileSync: () => {
      throw new Error('not executable')
    }
  }), /FFmpeg 不可用/)
})
