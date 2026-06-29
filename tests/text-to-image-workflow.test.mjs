import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildTextImagePrompt,
  createOcrTextImageTasks,
  createTextImageBatchTasks,
  createTextImageTask,
  getTextImageRatioOptions,
  getTextImageTemplateOptions,
  normalizeTextImageRequest,
  summarizeTextImageTasks
} from '../src/renderer/src/utils/textToImageWorkflow.mjs'

test('text image options include teaching templates and Xiaohongshu 3:4 ratio', () => {
  const templates = getTextImageTemplateOptions()
  const ratios = getTextImageRatioOptions()

  assert.ok(templates.some(option => option.value === 'cover' && option.label.includes('封面')))
  assert.ok(ratios.some(option => option.value === '3:4' && option.size === '1024x1365'))
})

test('builds structured text-to-image prompt from teaching fields', () => {
  const prompt = buildTextImagePrompt({
    template: 'mistake',
    style: '错题本订正风',
    grade: '四年级',
    subject: '数学',
    ratio: '3:4',
    title: '四年级下册数学易错应用题',
    subtitle: '抓住易错点，提升解题能力',
    points: '和差倍问题\n长方形面积应用'
  })

  assert.match(prompt, /错题本订正页/)
  assert.match(prompt, /四年级数学/)
  assert.match(prompt, /3:4/)
  assert.match(prompt, /1\. 和差倍问题/)
})

test('normalizes text-to-image request for IPC generation', () => {
  const request = normalizeTextImageRequest({
    prompt: '生成一张数学知识卡片',
    ratio: '3:4',
    quality: 'medium',
    outputName: '数学卡片'
  })

  assert.deepEqual(request, {
    prompt: '生成一张数学知识卡片',
    ratio: '3:4',
    size: '1024x1365',
    quality: 'medium',
    outputName: '数学卡片'
  })
})

test('creates and summarizes text-to-image tasks', () => {
  const task = createTextImageTask({
    title: '英语重点短语',
    prompt: '生成英语重点短语卡片',
    status: 'completed',
    outputPath: 'D:/demo/out.jpg',
    timestamp: 123
  })

  assert.equal(task.id, 'text-image-123')
  assert.equal(task.type, 'textToImage')
  assert.equal(task.generatedImage, 'D:/demo/out.jpg')
  assert.deepEqual(summarizeTextImageTasks([
    task,
    { status: 'failed' },
    { status: 'pending' },
    { status: 'running' }
  ]), {
    total: 4,
    completed: 1,
    failed: 1,
    pending: 1,
    running: 1
  })
})

test('creates batch text-to-image tasks from imported material pages', () => {
  const tasks = createTextImageBatchTasks({
    materials: [
      { id: 1, title: 'page_001.png', referenceImage: 'D:/book/page_001.png' },
      { id: 2, title: 'page_002.png', referenceImage: 'D:/book/page_002.png' },
      { id: 3, title: 'page_003.png', referenceImage: 'D:/book/page_003.png' }
    ],
    pageRange: '1,3',
    baseForm: {
      template: 'material',
      style: '清爽重点笔记风',
      grade: '七年级',
      subject: '英语',
      ratio: '3:4',
      title: 'Unit 1 短语',
      subtitle: '重点短语整理',
      points: '词组转换'
    },
    timestamp: 999
  })

  assert.equal(tasks.length, 2)
  assert.deepEqual(tasks.map(task => task.sourceImage), ['D:/book/page_001.png', 'D:/book/page_003.png'])
  assert.ok(tasks[0].prompt.includes('参考原素材页：page_001.png'))
  assert.equal(tasks[0].id, 'text-image-batch-1-999')
})

test('creates OCR-aware text-to-image tasks from extracted page text', () => {
  const tasks = createOcrTextImageTasks({
    materials: [
      {
        id: 1,
        title: 'page_001.png',
        referenceImage: 'D:/book/page_001.png',
        ocrText: 'Unit 1 Home\nrelax 放松\nstudy 学习'
      }
    ],
    baseForm: {
      template: 'material',
      style: '清爽重点笔记风',
      grade: '七年级',
      subject: '英语',
      ratio: '3:4',
      title: '七下英语重点短语',
      subtitle: '按课本页自动整理',
      points: ''
    },
    timestamp: 1000
  })

  assert.equal(tasks.length, 1)
  assert.equal(tasks[0].id, 'text-image-ocr-1-1000')
  assert.equal(tasks[0].metadata.ocrText.includes('Unit 1 Home'), true)
  assert.match(tasks[0].prompt, /OCR识别内容/)
  assert.match(tasks[0].prompt, /relax 放松/)
})
