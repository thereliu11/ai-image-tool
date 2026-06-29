import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildXhsGoodsDownloadPlan,
  classifyXhsAssetUrl,
  extractUrlsFromShareText,
  sanitizeDownloadFileName
} from '../src/renderer/src/utils/xhsGoodsDownloadWorkflow.mjs'

test('extracts clean urls from Xiaohongshu share text', () => {
  const urls = extractUrlsFromShareText(`
    这套资料很好看 https://www.xiaohongshu.com/explore/65abc?xsec_token=token。
    图片直链：https://img.example.com/a/b/cover.png?imageView2/2/w/1080，
    短链 http://xhslink.com/a/abcDEF
  `)

  assert.deepEqual(urls, [
    'https://www.xiaohongshu.com/explore/65abc?xsec_token=token',
    'https://img.example.com/a/b/cover.png?imageView2/2/w/1080',
    'http://xhslink.com/a/abcDEF'
  ])
})

test('classifies direct image urls and Xiaohongshu page urls honestly', () => {
  assert.deepEqual(
    classifyXhsAssetUrl('https://cdn.example.com/item/1.jpg?x-oss-process=image/resize'),
    {
      url: 'https://cdn.example.com/item/1.jpg?x-oss-process=image/resize',
      type: 'direct-image',
      source: 'external',
      downloadable: true,
      reason: '可直接下载图片'
    }
  )

  assert.deepEqual(
    classifyXhsAssetUrl('https://www.xiaohongshu.com/explore/65abc'),
    {
      url: 'https://www.xiaohongshu.com/explore/65abc',
      type: 'xhs-note',
      source: 'xiaohongshu',
      downloadable: false,
      reason: '小红书页面通常需要浏览器登录或人工打开后保存'
    }
  )
})

test('builds download plan with deduplicated tasks and stable file names', () => {
  const plan = buildXhsGoodsDownloadPlan({
    shareText: [
      'https://img.example.com/a/cover.png',
      'https://img.example.com/a/cover.png',
      'https://xhslink.com/a/abc'
    ].join('\n'),
    outputDir: 'D:/素材采集',
    filePrefix: '七下英语'
  })

  assert.equal(plan.totalCount, 2)
  assert.equal(plan.downloadableCount, 1)
  assert.equal(plan.manualCount, 1)
  assert.equal(plan.outputDir, 'D:/素材采集')
  assert.equal(plan.tasks[0].fileName, '七下英语_001.png')
  assert.equal(plan.tasks[1].status, 'needs-manual')
})

test('sanitizes download file names for Windows paths', () => {
  assert.equal(sanitizeDownloadFileName('七下英语:/重点*图?', 2, 'jpg'), '七下英语_重点_图_002.jpg')
})
