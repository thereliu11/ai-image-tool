import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getFeatureCategories,
  getFeatureById,
  getPrimaryFeatureStats
} from '../src/renderer/src/utils/featureCatalog.mjs'

test('catalog includes document features outside platform basics', () => {
  const categories = getFeatureCategories()
  const categoryNames = categories.map(category => category.name)

  assert.ok(categoryNames.includes('创作增强'))
  assert.ok(categoryNames.includes('小红书图文'))
  assert.ok(categoryNames.includes('二创改写'))
  assert.ok(categoryNames.includes('模板库'))
  assert.ok(categoryNames.includes('作品集'))
  assert.ok(categoryNames.includes('图文分离'))
  assert.ok(categoryNames.includes('百宝箱'))
  assert.ok(categoryNames.includes('平台本地化'))
  assert.ok(categories.every(category => category.features.length > 0))
})

test('catalog exposes executable toolbox handlers for existing IPC tools', () => {
  const pdfImages = getFeatureById('doc-pdf-to-images')

  assert.equal(pdfImages.name, 'PDF 转图片')
  assert.equal(pdfImages.category, '百宝箱')
  assert.equal(pdfImages.handler, 'docPdfToImages')
  assert.equal(pdfImages.status, 'ready')
})

test('catalog stats count ready and planned features separately', () => {
  const stats = getPrimaryFeatureStats()

  assert.equal(stats.total > 20, true)
  assert.equal(stats.ready > 10, true)
  assert.equal(stats.planned >= 0, true)
  assert.equal(getFeatureById('template-layout-clone').status, 'ready')
  assert.equal(getFeatureById('xhs-campaign-plan').status, 'ready')
  assert.equal(getFeatureById('image-collage-advanced').status, 'ready')
  assert.equal(getFeatureById('separation-recognition-region').status, 'ready')
  assert.equal(getFeatureById('platform-help-center').status, 'ready')
})

test('catalog tracks imported competitor workflows with honest readiness states', () => {
  assert.equal(getFeatureById('doc-office-batch-export').status, 'ready')
  assert.equal(getFeatureById('image-scene-compose').status, 'ready')
  assert.equal(getFeatureById('image-split').status, 'ready')
  assert.equal(getFeatureById('publish-feishu-upload-plan').status, 'ready')
  assert.equal(getFeatureById('publish-feishu-upload-manifest').status, 'ready')
  assert.equal(getFeatureById('xhs-goods-download-plan').status, 'ready')
  assert.equal(getFeatureById('publish-feishu-upload').status, 'planned')
  assert.equal(getFeatureById('xhs-goods-download').status, 'planned')
})
