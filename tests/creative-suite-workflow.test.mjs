import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildContentTemplatePrompt,
  buildPresentationPlan,
  buildXhsCampaignPlan,
  getContentTemplateOptions
} from '../src/renderer/src/utils/creativeSuiteWorkflow.mjs'

test('builds one sentence PPT or picture-book plan with editable page prompts', () => {
  const plan = buildPresentationPlan({
    topic: '四年级下册数学易错应用题',
    outputType: 'ppt',
    pageCount: 6,
    ratio: '3:4',
    audience: '小红书老师'
  }, { now: 3000 })

  assert.equal(plan.outputType, 'ppt')
  assert.equal(plan.pages.length, 6)
  assert.match(plan.pages[0].title, /封面/)
  assert.match(plan.prompt, /3:4/)
  assert.match(plan.prompt, /四年级下册数学易错应用题/)
  assert.equal(plan.createdAt, 3000)
})

test('builds Xiaohongshu campaign from one topic with titles, cards and publish copy', () => {
  const campaign = buildXhsCampaignPlan({
    topic: '七下英语必背短语',
    cardCount: 4,
    sellingPoint: '考前冲刺'
  }, { now: 4000 })

  assert.equal(campaign.cards.length, 4)
  assert.ok(campaign.titles.length >= 3)
  assert.ok(campaign.tags.includes('#小红书教辅'))
  assert.match(campaign.publishText, /七下英语必背短语/)
  assert.equal(campaign.createdAt, 4000)
})

test('content rewrite templates produce mode-specific prompts', () => {
  const options = getContentTemplateOptions()
  const prompt = buildContentTemplatePrompt('framework-upgrade', {
    sourceName: '原资料.pdf',
    goal: '保留原结构但更适合销售'
  })

  assert.ok(options.some(option => option.value === 'framework-upgrade'))
  assert.match(prompt, /原资料\.pdf/)
  assert.match(prompt, /保留原结构/)
  assert.match(prompt, /更适合销售/)
})
