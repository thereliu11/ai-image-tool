const IMAGE_SIZE_OPTIONS = [
  {
    label: '竖版 2:3 (推荐)',
    value: '1024x1536',
    ratio: '2:3',
    aliases: ['2:3'],
    requestSize: '1024x1536',
    targetWidth: 1024,
    targetHeight: 1536,
    promptHint: '请使用 2:3 竖版构图，画面主体完整，适合手机阅读。'
  },
  {
    label: '小红书 3:4',
    value: '3:4',
    ratio: '3:4',
    aliases: ['1024x1365'],
    requestSize: '1024x1365',
    targetWidth: 1242,
    targetHeight: 1656,
    promptHint: '请使用 3:4 小红书竖版构图，画面主体完整，适合手机阅读。'
  },
  {
    label: '方图 1:1',
    value: '1024x1024',
    ratio: '1:1',
    aliases: ['1:1'],
    requestSize: '1024x1024',
    targetWidth: 1024,
    targetHeight: 1024,
    promptHint: '请使用 1:1 方图构图，主体居中，标题和重点内容清晰。'
  },
  {
    label: '横版 3:2',
    value: '1536x1024',
    ratio: '3:2',
    aliases: ['3:2'],
    requestSize: '1536x1024',
    targetWidth: 1536,
    targetHeight: 1024,
    promptHint: '请使用 3:2 横版构图，适合横向展示和封面预览。'
  },
  {
    label: '手机长图 9:16',
    value: '1024x1792',
    ratio: '9:16',
    aliases: ['9:16'],
    requestSize: '1024x1792',
    targetWidth: 1024,
    targetHeight: 1792,
    promptHint: '请使用 9:16 手机长图构图，信息分区清楚，不要拥挤。'
  },
  {
    label: '自动',
    value: 'auto',
    ratio: 'auto',
    aliases: [],
    requestSize: '1024x1536',
    targetWidth: 1024,
    targetHeight: 1536,
    promptHint: '请根据内容自动选择清晰、稳定的构图，优先适配手机阅读。'
  }
]

function cloneSpec(spec) {
  return {
    value: spec.value,
    ratio: spec.ratio,
    label: spec.label,
    requestSize: spec.requestSize,
    targetWidth: spec.targetWidth,
    targetHeight: spec.targetHeight,
    promptHint: spec.promptHint
  }
}

function findImageSizeSpec(value) {
  const raw = String(value || '').trim()
  return IMAGE_SIZE_OPTIONS.find(option =>
    option.value === raw ||
    option.requestSize === raw ||
    option.ratio === raw ||
    option.aliases.includes(raw)
  ) || IMAGE_SIZE_OPTIONS[0]
}

function supportsExactThreeFour(provider = '', model = '') {
  const providerName = String(provider || '').toLowerCase()
  const modelName = String(model || '').toLowerCase()
  return providerName === 'lupoapi' ||
    providerName === 'aihubmix' ||
    modelName.includes('gpt-image-2')
}

export function getImageSizeOptions() {
  return IMAGE_SIZE_OPTIONS.map(cloneSpec)
}

export function normalizeImageSizeRequest(value) {
  return cloneSpec(findImageSizeSpec(value))
}

export function resolveImageSizeForProvider(value, options = {}) {
  const spec = normalizeImageSizeRequest(value)

  if (spec.ratio === '3:4' && !supportsExactThreeFour(options.provider, options.model)) {
    return {
      ...spec,
      requestSize: '1024x1536',
      promptHint: `${spec.promptHint} 当前接口将使用 1024x1536 请求，并按 3:4 画面比例控制构图和留白。`
    }
  }

  return spec
}
