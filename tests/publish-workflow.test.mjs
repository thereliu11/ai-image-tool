import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildPublishPlan,
  buildPublishTextVariants
} from '../src/renderer/src/utils/publishWorkflow.mjs'

test('builds Xiaohongshu publish plan with title variants and tags', () => {
  const plan = buildPublishPlan({
    title: '四年级下册数学易错应用题',
    grade: '四年级',
    subject: '数学',
    count: 8
  })

  assert.equal(plan.titles.length, 5)
  assert.equal(plan.tags.includes('#四年级数学'), true)
  assert.match(plan.suggestedTime, /晚/)
})

test('builds publish text variants for teaching materials', () => {
  const variants = buildPublishTextVariants({
    title: '七下英语必背短语',
    count: 6,
    sellingPoint: '按单元整理，适合考前复习'
  })

  assert.equal(variants.length, 3)
  assert.match(variants[0], /七下英语必背短语/)
  assert.match(variants[0], /6/)
})
