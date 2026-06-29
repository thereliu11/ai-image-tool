const allowedModes = new Set(['optimize', 'replace'])
const allowedFormats = new Set(['pptx', 'docx'])
const allowedRatios = new Set(['2:3', '3:4', '1:1', '9:16'])

const ratioOptions = [
  { label: '竖版 2:3（推荐）', value: '2:3' },
  { label: '小红书竖版 3:4', value: '3:4' },
  { label: '方图 1:1', value: '1:1' },
  { label: '手机长图 9:16', value: '9:16' }
]

export function getRewriteRatioOptions() {
  return ratioOptions.map(option => ({ ...option }))
}

export function normalizeRewriteRequest(request = {}) {
  const inputPath = String(request.inputPath || '').trim()
  if (!inputPath) {
    throw new Error('请选择需要二创的文件')
  }

  const mode = allowedModes.has(request.mode) ? request.mode : 'optimize'
  const outputFormat = allowedFormats.has(request.outputFormat) ? request.outputFormat : 'pptx'
  const ratio = allowedRatios.has(request.ratio) ? request.ratio : '2:3'
  const pageRange = String(request.pageRange || '').trim()

  return {
    inputPath,
    mode,
    outputFormat,
    pageRange,
    ratio,
    preserveOriginal: Boolean(request.preserveOriginal)
  }
}

export function buildRewriteSteps(options = {}) {
  const mode = allowedModes.has(options.mode) ? options.mode : 'optimize'
  const outputFormat = allowedFormats.has(options.outputFormat) ? options.outputFormat : 'pptx'
  const steps = [
    { key: 'parse', title: '解析原始文件' }
  ]

  if (options.preserveOriginal) {
    steps.push({ key: 'preserve', title: '保留原版页面' })
  }

  steps.push(mode === 'replace'
    ? { key: 'replace', title: '套用新模板' }
    : { key: 'optimize', title: '优化内容结构' })

  steps.push({
    key: 'export',
    title: outputFormat === 'docx' ? '生成图文分离 Word' : '生成图文分离 PPT'
  })
  steps.push({ key: 'project', title: '保存到作品集' })

  return steps
}

export function getRewriteModeMeta(mode) {
  const map = {
    optimize: {
      title: '内容优化',
      description: '保留原资料核心信息，优化排版层级、重点标注和手机阅读体验。'
    },
    replace: {
      title: '模板替换',
      description: '用新的教辅风格重新包装页面，适合错题本、资料封面和知识卡片。'
    }
  }
  return map[mode] || map.optimize
}
