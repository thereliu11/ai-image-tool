import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildLayoutClonePrompt,
  createLayoutTemplateRecord,
  validateReferenceImages
} from '../src/renderer/src/utils/layoutTemplateWorkflow.mjs'

test('validates layout clone reference image count', () => {
  assert.throws(() => validateReferenceImages(['a.png', 'b.png']), /至少上传 3 张/)
  assert.throws(() => validateReferenceImages(['1.png', '2.png', '3.png', '4.png', '5.png', '6.png']), /最多上传 5 张/)
  assert.deepEqual(validateReferenceImages(['1.png', '2.png', '3.png']), ['1.png', '2.png', '3.png'])
})

test('builds a reusable layout clone prompt from references', () => {
  const prompt = buildLayoutClonePrompt({
    name: '清爽英语短语页',
    styleNote: '白底，蓝色标题，红笔圈重点',
    ratio: '3:4',
    referenceImages: ['D:/ref/a.png', 'D:/ref/b.png', 'D:/ref/c.png']
  })

  assert.match(prompt, /清爽英语短语页/)
  assert.match(prompt, /3:4/)
  assert.match(prompt, /白底，蓝色标题/)
  assert.match(prompt, /参考图数量：3/)
})

test('creates layout template records with reference images and metadata', () => {
  const record = createLayoutTemplateRecord({
    name: '清爽英语短语页',
    styleNote: '白底，蓝色标题，红笔圈重点',
    ratio: '3:4',
    referenceImages: ['D:/ref/a.png', 'D:/ref/b.png', 'D:/ref/c.png'],
    timestamp: '2026-06-27T10:00:00.000Z'
  })

  assert.equal(record.name, '清爽英语短语页')
  assert.equal(record.type, 'layoutClone')
  assert.equal(record.referenceImages.length, 3)
  assert.equal(record.metadata.ratio, '3:4')
  assert.match(record.prompt, /克隆这些参考图的版式规律/)
})
