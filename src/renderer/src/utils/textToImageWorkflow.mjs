import { normalizeImageSizeRequest } from '../../../shared/imageSizeSpec.mjs'

const templateLabels = {
  cover: '资料包封面图',
  material: '教辅资料页',
  mistake: '错题本订正页',
  card: '知识卡片',
  mindmap: '知识导图',
  poster: '课程宣传图'
}

const ratioOptions = [
  { label: '竖版 2:3', value: '2:3', size: normalizeImageSizeRequest('2:3').requestSize },
  { label: '小红书 3:4', value: '3:4', size: normalizeImageSizeRequest('3:4').requestSize },
  { label: '方图 1:1', value: '1:1', size: normalizeImageSizeRequest('1:1').requestSize },
  { label: '手机长图 9:16', value: '9:16', size: normalizeImageSizeRequest('9:16').requestSize }
]

const allowedQualities = new Set(['low', 'medium', 'high'])
const statusKeys = ['pending', 'running', 'completed', 'failed']

function normalizeLines(value) {
  if (Array.isArray(value)) {
    return value.map(item => String(item).trim()).filter(Boolean)
  }
  return String(value || '')
    .split(/\r?\n/)
    .map(item => item.trim())
    .filter(Boolean)
}

function cleanText(value, fallback = '') {
  return String(value ?? fallback).trim()
}

function normalizeOcrText(value) {
  if (Array.isArray(value)) {
    return value.map(item => {
      if (typeof item === 'string') return item
      if (item?.english || item?.chinese) return [item.english, item.chinese].filter(Boolean).join(' ')
      return Object.values(item || {}).filter(Boolean).join(' ')
    }).join('\n')
  }
  if (value && typeof value === 'object') {
    return cleanText(value.text || value.content || value.rawText || JSON.stringify(value))
  }
  return cleanText(value)
}

function getRatioMeta(ratio) {
  return ratioOptions.find(option => option.value === ratio) || ratioOptions[0]
}

function parsePageRange(pageRange, total) {
  const max = Math.max(0, Number(total) || 0)
  const raw = cleanText(pageRange)
  if (!raw) {
    return Array.from({ length: max }, (_, index) => index + 1)
  }

  const selected = new Set()
  raw.split(',').forEach(part => {
    const token = part.trim()
    if (!token) return
    const [startText, endText] = token.split('-').map(value => value.trim())
    const start = Math.max(1, Number(startText) || 1)
    const end = Math.min(max, Number(endText || startText) || start)
    for (let page = Math.min(start, end); page <= Math.max(start, end); page++) {
      if (page >= 1 && page <= max) selected.add(page)
    }
  })
  return Array.from(selected).sort((a, b) => a - b)
}

export function getTextImageTemplateOptions() {
  return Object.entries(templateLabels).map(([value, label]) => ({ value, label }))
}

export function getTextImageRatioOptions() {
  return ratioOptions.map(option => ({ ...option }))
}

export function buildTextImagePrompt(form = {}) {
  const template = templateLabels[form.template] || templateLabels.cover
  const grade = cleanText(form.grade, '小学')
  const subject = cleanText(form.subject, '学科')
  const title = cleanText(form.title, '教辅资料标题')
  const subtitle = cleanText(form.subtitle, '突出提分效果和使用场景')
  const style = cleanText(form.style, '清爽重点笔记风')
  const ratio = getRatioMeta(form.ratio).value
  const points = normalizeLines(form.points)

  return [
    '请生成一张适合老师在小红书发布的 AI 教辅图片。',
    `【图片类型】${template}`,
    `【年级科目】${grade}${subject}`,
    `【主标题】${title}`,
    `【副标题】${subtitle}`,
    `【画面风格】${style}，白底为主，蓝色、绿色、黄色用于重点标注，少量红笔圈画强调关键区域。`,
    `【画面比例】${ratio}，竖版手机阅读友好，排版清晰，不要拥挤。`,
    '【必须呈现的内容】',
    ...(points.length ? points : ['核心知识点整理', '易错提醒', '练习方法总结']).map((point, index) => `${index + 1}. ${point}`),
    '【硬性要求】中文文字准确，不出现乱码；标题醒目；层级清楚；不要添加无关装饰；不要改变教育内容含义。'
  ].join('\n')
}

export function normalizeTextImageRequest(request = {}) {
  const prompt = cleanText(request.prompt)
  if (!prompt) {
    throw new Error('请先生成或填写文生图提示词')
  }

  const ratioMeta = getRatioMeta(request.ratio)
  const quality = allowedQualities.has(request.quality) ? request.quality : 'medium'
  const outputName = cleanText(request.outputName, '文生图')

  return {
    prompt,
    ratio: ratioMeta.value,
    size: ratioMeta.size,
    quality,
    outputName
  }
}

export function createTextImageTask(options = {}) {
  const timestamp = options.timestamp || Date.now()
  const status = statusKeys.includes(options.status) ? options.status : 'pending'
  return {
    id: options.id || `text-image-${timestamp}`,
    type: 'textToImage',
    title: cleanText(options.title, '文生图作品'),
    prompt: cleanText(options.prompt),
    status,
    generatedImage: options.outputPath || options.generatedImage || '',
    error: options.error || '',
    createdAt: timestamp,
    updatedAt: timestamp
  }
}

export function createTextImageBatchTasks(options = {}) {
  const materials = Array.isArray(options.materials) ? options.materials : []
  const pages = parsePageRange(options.pageRange, materials.length)
  const timestamp = options.timestamp || Date.now()
  const baseForm = options.baseForm || {}

  return pages.map((pageNumber, index) => {
    const material = materials[pageNumber - 1]
    const title = `${cleanText(baseForm.title, '文生图批量')} 第${pageNumber}页`
    const prompt = [
      buildTextImagePrompt({
        ...baseForm,
        title,
        points: baseForm.points
      }),
      `参考原素材页：${material?.title || material?.name || `第${pageNumber}页`}`,
      '请根据该页的教辅资料主题生成适合发布的小红书教辅图片，不要直接照抄原图排版。'
    ].join('\n')

    return {
      id: `text-image-batch-${index + 1}-${timestamp}`,
      type: 'textToImage',
      pageNumber,
      title,
      prompt,
      sourceImage: material?.referenceImage || material?.imagePath || '',
      status: 'pending',
      generatedImage: '',
      error: '',
      createdAt: timestamp,
      updatedAt: timestamp
    }
  })
}

export function createOcrTextImageTasks(options = {}) {
  const materials = Array.isArray(options.materials) ? options.materials : []
  const pages = parsePageRange(options.pageRange, materials.length)
  const timestamp = options.timestamp || Date.now()
  const baseForm = options.baseForm || {}

  return pages.map((pageNumber, index) => {
    const material = materials[pageNumber - 1]
    const ocrText = normalizeOcrText(material?.ocrText || material?.textData || material?.extractedText)
    const title = `${cleanText(baseForm.title, 'OCR文生图')} 第${pageNumber}页`
    const prompt = [
      buildTextImagePrompt({
        ...baseForm,
        title,
        points: ocrText || baseForm.points
      }),
      `参考原素材页：${material?.title || material?.name || `第${pageNumber}页`}`,
      '【OCR识别内容】',
      ocrText || '未识别到文字，请根据资料页主题生成清晰教辅图。',
      '请优先使用 OCR 识别到的教学内容生成版面，保留知识含义和关键词，不要编造新的知识点。'
    ].join('\n')

    return {
      id: `text-image-ocr-${index + 1}-${timestamp}`,
      type: 'textToImage',
      pageNumber,
      title,
      prompt,
      sourceImage: material?.referenceImage || material?.imagePath || '',
      status: 'pending',
      generatedImage: '',
      error: '',
      metadata: {
        ocrText,
        sourceTitle: material?.title || material?.name || ''
      },
      createdAt: timestamp,
      updatedAt: timestamp
    }
  })
}

export function summarizeTextImageTasks(tasks = []) {
  return (Array.isArray(tasks) ? tasks : []).reduce((summary, task) => {
    const status = statusKeys.includes(task?.status) ? task.status : 'pending'
    summary.total += 1
    summary[status] += 1
    return summary
  }, {
    total: 0,
    completed: 0,
    failed: 0,
    pending: 0,
    running: 0
  })
}
