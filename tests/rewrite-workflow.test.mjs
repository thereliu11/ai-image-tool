import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getRewriteRatioOptions,
  buildRewriteSteps,
  normalizeRewriteRequest
} from '../src/renderer/src/utils/rewriteWorkflow.mjs'

test('rewrite ratio options include 3:4 for Xiaohongshu vertical images', () => {
  const ratios = getRewriteRatioOptions()

  assert.ok(ratios.some(option => option.value === '3:4' && option.label.includes('小红书')))
})

test('normalizes rewrite request with page range and preserve-original mode', () => {
  const request = normalizeRewriteRequest({
    inputPath: 'D:/demo/book.pdf',
    mode: 'replace',
    outputFormat: 'pptx',
    pageRange: '1-3,5',
    ratio: '3:4',
    preserveOriginal: true
  })

  assert.deepEqual(request, {
    inputPath: 'D:/demo/book.pdf',
    mode: 'replace',
    outputFormat: 'pptx',
    pageRange: '1-3,5',
    ratio: '3:4',
    preserveOriginal: true
  })
})

test('rewrite steps reflect the selected mode and output format', () => {
  const steps = buildRewriteSteps({ mode: 'replace', outputFormat: 'docx', preserveOriginal: true })

  assert.deepEqual(steps.map(step => step.title), [
    '解析原始文件',
    '保留原版页面',
    '套用新模板',
    '生成图文分离 Word',
    '保存到作品集'
  ])
})
