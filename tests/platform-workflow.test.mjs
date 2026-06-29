import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildAnnouncementCards,
  buildFeedbackRecord,
  buildHelpSections,
  normalizeLocalProfile
} from '../src/renderer/src/utils/platformWorkflow.mjs'

test('normalizes local profile for desktop-only account center', () => {
  const profile = normalizeLocalProfile({
    nickname: '',
    role: 'teacher',
    cloudSync: true,
    workspace: 'E:/demo'
  }, { now: 1000 })

  assert.equal(profile.nickname, '本地用户')
  assert.equal(profile.role, 'teacher')
  assert.equal(profile.cloudSync, false)
  assert.equal(profile.workspace, 'E:/demo')
  assert.equal(profile.updatedAt, 1000)
})

test('builds feedback record with screenshot attachments and priority', () => {
  const record = buildFeedbackRecord({
    type: 'bug',
    content: '高级拼图导出后尺寸不对',
    contact: 'wechat',
    screenshots: ['a.png', '', 'b.png', 'c.png', 'd.png']
  }, { now: 2000 })

  assert.equal(record.type, 'bug')
  assert.equal(record.status, 'pending')
  assert.equal(record.priority, 'high')
  assert.deepEqual(record.screenshots, ['a.png', 'b.png', 'c.png'])
  assert.equal(record.createdAt, 2000)
})

test('help and announcement content covers platform and toolbox gaps', () => {
  const help = buildHelpSections()
  const announcements = buildAnnouncementCards('0.0.9')

  assert.ok(help.some(section => section.id === 'toolbox' && section.items.some(item => /拼图/.test(item.title))))
  assert.ok(help.some(section => section.id === 'separation' && section.items.some(item => /区域/.test(item.title))))
  assert.equal(announcements[0].version, '0.0.9')
  assert.ok(announcements[0].highlights.some(item => /百宝箱/.test(item)))
})
