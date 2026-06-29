function cleanText(value, fallback = '') {
  return String(value ?? fallback).trim() || fallback
}

function stripTrailingPunctuation(value) {
  return cleanText(value).replace(/[，。；、,.!?！？;:：)\]}>]+$/g, '')
}

function getUrlPathExtension(url) {
  try {
    const parsed = new URL(url)
    const match = parsed.pathname.match(/\.([a-z0-9]{2,5})$/i)
    return match ? match[1].toLowerCase() : ''
  } catch {
    return ''
  }
}

function normalizeHost(url) {
  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return ''
  }
}

export function extractUrlsFromShareText(text = '') {
  const matches = String(text || '').match(/https?:\/\/[^\s"'<>]+/gi) || []
  const seen = new Set()
  const urls = []

  for (const match of matches) {
    const url = stripTrailingPunctuation(match)
    if (!url || seen.has(url)) continue
    seen.add(url)
    urls.push(url)
  }

  return urls
}

export function classifyXhsAssetUrl(urlInput) {
  const url = stripTrailingPunctuation(urlInput)
  const host = normalizeHost(url)
  const ext = getUrlPathExtension(url)
  const imageExts = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'])

  if (imageExts.has(ext)) {
    return {
      url,
      type: 'direct-image',
      source: host.includes('xiaohongshu') || host.includes('xhscdn') ? 'xiaohongshu-cdn' : 'external',
      downloadable: true,
      reason: '可直接下载图片'
    }
  }

  if (host === 'xhslink.com' || host.endsWith('.xhslink.com')) {
    return {
      url,
      type: 'xhs-short-link',
      source: 'xiaohongshu',
      downloadable: false,
      reason: '小红书短链需要浏览器打开后获取图片直链'
    }
  }

  if (host.includes('xiaohongshu.com')) {
    return {
      url,
      type: 'xhs-note',
      source: 'xiaohongshu',
      downloadable: false,
      reason: '小红书页面通常需要浏览器登录或人工打开后保存'
    }
  }

  return {
    url,
    type: 'web-page',
    source: host || 'unknown',
    downloadable: false,
    reason: '不是可直接识别的图片直链'
  }
}

export function sanitizeDownloadFileName(prefix, index, ext = 'jpg') {
  const safePrefix = cleanText(prefix, '商品图')
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '') || '商品图'
  const safeExt = cleanText(ext, 'jpg').replace(/^\./, '').toLowerCase() || 'jpg'
  return `${safePrefix}_${String(index).padStart(3, '0')}.${safeExt}`
}

export function buildXhsGoodsDownloadPlan(input = {}) {
  const urls = extractUrlsFromShareText([
    input.shareText,
    ...(Array.isArray(input.urls) ? input.urls : [])
  ].filter(Boolean).join('\n'))

  const outputDir = cleanText(input.outputDir)
  const filePrefix = cleanText(input.filePrefix, '商品图')
  const tasks = urls.map((url, index) => {
    const classified = classifyXhsAssetUrl(url)
    const ext = getUrlPathExtension(url) || 'jpg'
    return {
      id: `xhs-asset-${index + 1}`,
      index: index + 1,
      ...classified,
      fileName: sanitizeDownloadFileName(filePrefix, index + 1, ext),
      status: classified.downloadable ? 'ready' : 'needs-manual'
    }
  })

  return {
    outputDir,
    filePrefix,
    totalCount: tasks.length,
    downloadableCount: tasks.filter(task => task.downloadable).length,
    manualCount: tasks.filter(task => !task.downloadable).length,
    tasks
  }
}
