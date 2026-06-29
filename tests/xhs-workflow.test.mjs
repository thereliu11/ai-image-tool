import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildXhsPrompt,
  createXhsCards,
  summarizeXhsCards
} from '../src/renderer/src/utils/xhsWorkflow.mjs'

test('builds a structured Xiaohongshu image prompt from form fields', () => {
  const prompt = buildXhsPrompt({
    template: 'cover',
    style: '小红书爆款风',
    grade: '四年级',
    subject: '数学',
    ratio: '3:4',
    quality: 'medium',
    title: '四年级下册数学易错应用题',
    subtitle: '抓住易错点，提升解题能力',
    points: '和差倍问题\n长方形面积应用\n单位换算'
  })

  assert.match(prompt, /小红书/)
  assert.match(prompt, /四年级数学/)
  assert.match(prompt, /3:4/)
  assert.match(prompt, /1\. 和差倍问题/)
})

test('creates editable XHS cards with stable ids and pending status', () => {
  const cards = createXhsCards({
    count: 3,
    title: '英语重点短语',
    points: ['词组转换', '短语记忆']
  })

  assert.equal(cards.length, 3)
  assert.deepEqual(cards.map(card => card.status), ['pending', 'pending', 'pending'])
  assert.ok(cards[0].id.startsWith('xhs-card-1-'))
})

test('summarizes XHS card progress for the workbench footer', () => {
  const cards = [
    { status: 'completed' },
    { status: 'failed' },
    { status: 'pending' },
    { status: 'running' }
  ]

  assert.deepEqual(summarizeXhsCards(cards), {
    total: 4,
    completed: 1,
    failed: 1,
    pending: 1,
    running: 1
  })
})
