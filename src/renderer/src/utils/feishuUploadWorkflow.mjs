function cleanText(value, fallback = '') {
  return String(value ?? fallback).trim() || fallback
}

function clampInteger(value, min, max, fallback) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(max, Math.max(min, Math.floor(number)))
}

function normalizeSlashes(value) {
  return cleanText(value).replace(/\\/g, '/')
}

function hashText(value) {
  let hash = 2166136261
  const text = String(value)
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function seededIndex(seed, length, offset) {
  if (length <= 0) return 0
  const mixed = Math.imul(seed + offset + 1, 2654435761) >>> 0
  return mixed % length
}

function normalizeImageList(files = []) {
  const imageExts = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'])
  return (Array.isArray(files) ? files : [])
    .map(item => cleanText(item?.referenceImage || item?.path || item))
    .filter(Boolean)
    .filter(file => {
      const normalized = normalizeSlashes(file).toLowerCase()
      const dotIndex = normalized.lastIndexOf('.')
      return dotIndex >= 0 && imageExts.has(normalized.slice(dotIndex))
    })
    .sort((a, b) => a.localeCompare(b, 'zh-Hans-CN', { numeric: true }))
}

export function parseFeishuBitableLink(input) {
  const text = cleanText(input)
  if (!text) throw new Error('请填写飞书多维表格链接')

  if (/^app[a-z0-9]+$/i.test(text)) {
    return { appToken: text, tableId: '', viewId: '' }
  }

  let url
  try {
    url = new URL(text)
  } catch {
    throw new Error('飞书多维表格链接格式不正确')
  }

  const segments = url.pathname.split('/').filter(Boolean)
  const baseIndex = segments.findIndex(segment => ['base', 'bitable'].includes(segment))
  const appToken = baseIndex >= 0 ? cleanText(segments[baseIndex + 1]) : ''
  const tableId = cleanText(url.searchParams.get('table') || url.searchParams.get('tableId'))
  const viewId = cleanText(url.searchParams.get('view') || url.searchParams.get('viewId'))

  if (!appToken) throw new Error('飞书链接中未找到 appToken')
  return { appToken, tableId, viewId }
}

export function normalizeFeishuFolderConfig(input = {}, index = 0) {
  const mode = input.mode === 'random' ? 'random' : 'sequential'
  return {
    id: cleanText(input.id, `folder-${index + 1}`),
    folderPath: cleanText(input.folderPath || input.path),
    mode,
    countPerRow: clampInteger(input.countPerRow, 1, 20, 1),
    cursor: clampInteger(input.cursor, 0, Number.MAX_SAFE_INTEGER, 0)
  }
}

export function buildFeishuUploadPlan(input = {}) {
  const parsed = parseFeishuBitableLink(input.bitableUrl || input.link || input.appToken)
  const attachmentField = cleanText(input.attachmentField || input.fieldName)
  if (!attachmentField) throw new Error('请填写飞书附件字段名称')

  const startRow = clampInteger(input.startRow, 1, 999999, 1)
  const endRow = clampInteger(input.endRow, 1, 999999, startRow)
  if (endRow < startRow) throw new Error('结束行不能小于开始行')

  const folders = (Array.isArray(input.folders) ? input.folders : [])
    .map((folder, index) => normalizeFeishuFolderConfig(folder, index))
    .filter(folder => folder.folderPath)
  if (!folders.length) throw new Error('请至少选择一个素材文件夹')

  const totalImagesPerRow = folders.reduce((sum, folder) => sum + folder.countPerRow, 0)
  const rowCount = endRow - startRow + 1
  return {
    ...parsed,
    bitableUrl: cleanText(input.bitableUrl || input.link),
    attachmentField,
    startRow,
    endRow,
    rowCount,
    folders,
    totalImagesPerRow,
    estimatedUploadCount: rowCount * totalImagesPerRow,
    tokenProvided: Boolean(cleanText(input.token || input.accessToken))
  }
}

export function selectFeishuImagesForRow(folderConfig, files = [], rowIndex = 0) {
  const folder = normalizeFeishuFolderConfig(folderConfig)
  const images = normalizeImageList(files)
  if (!images.length) return []

  const selected = []
  if (folder.mode === 'random') {
    const seed = hashText(`${folder.folderPath}:${folder.cursor}:${rowIndex}`)
    for (let index = 0; index < folder.countPerRow; index += 1) {
      selected.push(images[seededIndex(seed, images.length, index)])
    }
    return selected
  }

  const start = (folder.cursor + rowIndex * folder.countPerRow) % images.length
  for (let index = 0; index < folder.countPerRow; index += 1) {
    selected.push(images[(start + index) % images.length])
  }
  return selected
}

export function buildFeishuLocalUploadPreview(planInput, folderFilesByPath = {}) {
  const plan = planInput?.folders ? planInput : buildFeishuUploadPlan(planInput)
  const missingFolders = []
  const rows = []

  for (let rowIndex = 0; rowIndex < plan.rowCount; rowIndex += 1) {
    const imagePaths = []
    for (const folder of plan.folders) {
      const files = folderFilesByPath[folder.folderPath] || folderFilesByPath[normalizeSlashes(folder.folderPath)] || []
      const selected = selectFeishuImagesForRow(folder, files, rowIndex)
      if (!selected.length && !missingFolders.includes(folder.folderPath)) {
        missingFolders.push(folder.folderPath)
      }
      imagePaths.push(...selected)
    }
    rows.push({
      rowNumber: plan.startRow + rowIndex,
      imagePaths,
      ready: imagePaths.length === plan.totalImagesPerRow
    })
  }

  return {
    plan,
    rows,
    missingFolders,
    readyRows: rows.filter(row => row.ready).length,
    totalImages: rows.reduce((sum, row) => sum + row.imagePaths.length, 0)
  }
}

export function buildFeishuUploadManifest(previewInput, options = {}) {
  const preview = previewInput?.plan ? previewInput : buildFeishuLocalUploadPreview(previewInput)
  const plan = preview.plan
  const warnings = []

  if (!plan.tableId) warnings.push('缺少 tableId：真实上传前需要确认目标数据表')
  if (!plan.tokenProvided && options.includeTokenHint) warnings.push('未填写 Token：真实上传前需要配置飞书访问令牌')
  for (const folderPath of preview.missingFolders || []) {
    warnings.push(`素材文件夹没有可用图片：${folderPath}`)
  }
  for (const row of preview.rows || []) {
    if (!row.ready) warnings.push(`第 ${row.rowNumber} 行图片数量不足`)
  }

  return {
    schemaVersion: 'feishu-upload-manifest/v1',
    title: cleanText(options.title, '飞书上传清单'),
    createdAt: cleanText(options.createdAt, new Date().toISOString()),
    target: {
      appToken: plan.appToken,
      tableId: plan.tableId,
      viewId: plan.viewId,
      attachmentField: plan.attachmentField
    },
    meta: {
      rowCount: plan.rowCount,
      totalImagesPerRow: plan.totalImagesPerRow,
      estimatedUploadCount: plan.estimatedUploadCount,
      tokenProvided: plan.tokenProvided
    },
    folders: plan.folders.map(folder => ({
      folderPath: folder.folderPath,
      mode: folder.mode,
      countPerRow: folder.countPerRow,
      cursor: folder.cursor
    })),
    rows: preview.rows.map(row => ({
      rowNumber: row.rowNumber,
      imagePaths: [...row.imagePaths],
      imageCount: row.imagePaths.length,
      ready: row.ready
    })),
    warnings: Array.from(new Set(warnings))
  }
}
