import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildFeishuUploadManifest,
  buildFeishuLocalUploadPreview,
  buildFeishuUploadPlan,
  parseFeishuBitableLink,
  selectFeishuImagesForRow
} from '../src/renderer/src/utils/feishuUploadWorkflow.mjs'

test('parses Feishu bitable link tokens from base url', () => {
  const parsed = parseFeishuBitableLink('https://demo.feishu.cn/base/appA1b2C3?table=tbl456&view=vew789')

  assert.deepEqual(parsed, {
    appToken: 'appA1b2C3',
    tableId: 'tbl456',
    viewId: 'vew789'
  })
})

test('builds upload plan with validated rows and folders', () => {
  const plan = buildFeishuUploadPlan({
    token: 'secret-token',
    bitableUrl: 'https://demo.feishu.cn/base/appA1b2C3?table=tbl456',
    attachmentField: '图片附件',
    startRow: 2,
    endRow: 4,
    folders: [
      { folderPath: 'D:/素材/封面', mode: 'sequential', countPerRow: 2 },
      { folderPath: 'D:/素材/内页', mode: 'sequential', countPerRow: 1 }
    ]
  })

  assert.equal(plan.appToken, 'appA1b2C3')
  assert.equal(plan.tableId, 'tbl456')
  assert.equal(plan.attachmentField, '图片附件')
  assert.equal(plan.rowCount, 3)
  assert.equal(plan.totalImagesPerRow, 3)
  assert.equal(plan.estimatedUploadCount, 9)
  assert.equal(plan.tokenProvided, true)
  assert.equal(plan.folders[0].countPerRow, 2)
})

test('selects sequential images for each row and cycles when files are insufficient', () => {
  const selected = selectFeishuImagesForRow(
    { folderPath: 'D:/素材/封面', mode: 'sequential', countPerRow: 2, cursor: 1 },
    ['a.png', 'b.png', 'c.png'],
    1
  )

  assert.deepEqual(selected, ['a.png', 'b.png'])
})

test('builds local preview rows from multiple material folders', () => {
  const plan = buildFeishuUploadPlan({
    bitableUrl: 'https://demo.feishu.cn/base/appA1b2C3?table=tbl456',
    attachmentField: '图片附件',
    startRow: 1,
    endRow: 2,
    folders: [
      { folderPath: 'D:/素材/封面', mode: 'sequential', countPerRow: 1 },
      { folderPath: 'D:/素材/内页', mode: 'sequential', countPerRow: 2 }
    ]
  })

  const preview = buildFeishuLocalUploadPreview(plan, {
    'D:/素材/封面': ['cover-1.png'],
    'D:/素材/内页': ['page-1.png', 'page-2.png', 'page-3.png']
  })

  assert.equal(preview.rows.length, 2)
  assert.deepEqual(preview.rows[0].imagePaths, ['cover-1.png', 'page-1.png', 'page-2.png'])
  assert.deepEqual(preview.rows[1].imagePaths, ['cover-1.png', 'page-3.png', 'page-1.png'])
  assert.equal(preview.missingFolders.length, 0)
})

test('rejects invalid Feishu upload plan inputs', () => {
  assert.throws(
    () => buildFeishuUploadPlan({
      bitableUrl: 'https://demo.feishu.cn/base/appA1b2C3',
      attachmentField: '',
      folders: [{ folderPath: 'D:/素材' }]
    }),
    /附件字段/
  )

  assert.throws(
    () => buildFeishuUploadPlan({
      bitableUrl: 'https://demo.feishu.cn/base/appA1b2C3',
      attachmentField: '图片',
      startRow: 9,
      endRow: 2,
      folders: [{ folderPath: 'D:/素材' }]
    }),
    /结束行/
  )
})

test('builds copyable Feishu upload manifest from local preview', () => {
  const plan = buildFeishuUploadPlan({
    token: 'secret-token',
    bitableUrl: 'https://demo.feishu.cn/base/appA1b2C3?table=tbl456&view=vew789',
    attachmentField: '图片附件',
    startRow: 3,
    endRow: 4,
    folders: [{ folderPath: 'D:/素材/封面', mode: 'sequential', countPerRow: 1 }]
  })
  const preview = buildFeishuLocalUploadPreview(plan, {
    'D:/素材/封面': ['cover-1.png', 'cover-2.png']
  })

  const manifest = buildFeishuUploadManifest(preview, {
    title: '七下英语上传清单',
    includeTokenHint: true
  })

  assert.equal(manifest.schemaVersion, 'feishu-upload-manifest/v1')
  assert.equal(manifest.title, '七下英语上传清单')
  assert.deepEqual(manifest.target, {
    appToken: 'appA1b2C3',
    tableId: 'tbl456',
    viewId: 'vew789',
    attachmentField: '图片附件'
  })
  assert.deepEqual(manifest.rows, [
    { rowNumber: 3, imagePaths: ['cover-1.png'], imageCount: 1, ready: true },
    { rowNumber: 4, imagePaths: ['cover-2.png'], imageCount: 1, ready: true }
  ])
  assert.deepEqual(manifest.warnings, [])
  assert.equal(manifest.meta.tokenProvided, true)
})

test('manifest records missing images and table warnings', () => {
  const plan = buildFeishuUploadPlan({
    bitableUrl: 'https://demo.feishu.cn/base/appA1b2C3',
    attachmentField: '图片附件',
    startRow: 1,
    endRow: 1,
    folders: [{ folderPath: 'D:/空文件夹', countPerRow: 2 }]
  })
  const preview = buildFeishuLocalUploadPreview(plan, {
    'D:/空文件夹': []
  })

  const manifest = buildFeishuUploadManifest(preview)

  assert.equal(manifest.rows[0].ready, false)
  assert.ok(manifest.warnings.some(item => item.includes('tableId')))
  assert.ok(manifest.warnings.some(item => item.includes('D:/空文件夹')))
})
