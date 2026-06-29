function cleanText(value, fallback = '') {
  return String(value ?? fallback).trim() || fallback
}

function basename(filePath) {
  return String(filePath || '').split(/[\\/]/).pop() || ''
}

export function validateReferenceImages(referenceImages = []) {
  const images = (Array.isArray(referenceImages) ? referenceImages : [])
    .map(image => String(image || '').trim())
    .filter(Boolean)

  if (images.length < 3) {
    throw new Error('至少上传 3 张参考图才能克隆版式')
  }
  if (images.length > 5) {
    throw new Error('最多上传 5 张参考图')
  }
  return images
}

export function buildLayoutClonePrompt(options = {}) {
  const referenceImages = validateReferenceImages(options.referenceImages)
  const name = cleanText(options.name, '教辅版式模板')
  const styleNote = cleanText(options.styleNote, '提取参考图中的版式、色彩、标题层级和重点标注方式')
  const ratio = cleanText(options.ratio, '3:4')
  const names = referenceImages.map((image, index) => `${index + 1}. ${basename(image)}`).join('\n')

  return [
    `【版式模板】${name}`,
    `【画面比例】${ratio}`,
    `【参考图数量：${referenceImages.length}】`,
    names,
    '请克隆这些参考图的版式规律，而不是复制具体内容。',
    `【风格摘要】${styleNote}`,
    '【克隆重点】标题区域、分栏结构、重点色、边框/标签/便签样式、图文比例、留白密度、适合小红书手机阅读的竖版构图。',
    '【使用要求】保留新输入的教学内容含义，文字准确清晰，不要生成乱码，不要把参考图中的旧文字照搬到新图。'
  ].join('\n')
}

export function createLayoutTemplateRecord(options = {}) {
  const referenceImages = validateReferenceImages(options.referenceImages)
  const name = cleanText(options.name, '教辅版式模板')
  const ratio = cleanText(options.ratio, '3:4')
  const styleNote = cleanText(options.styleNote)
  const prompt = buildLayoutClonePrompt({
    name,
    ratio,
    styleNote,
    referenceImages
  })

  return {
    name,
    prompt,
    type: 'layoutClone',
    referenceImages,
    metadata: {
      ratio,
      styleNote,
      referenceCount: referenceImages.length
    },
    createdAt: options.timestamp || new Date().toISOString()
  }
}
