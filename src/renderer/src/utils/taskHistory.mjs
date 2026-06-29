const MAX_HISTORY_RECORDS = 200

function normalizeStatus(status) {
  if (status === '已完成' || status === 'completed') return 'completed'
  if (status === '失败' || status === 'failed') return 'failed'
  if (status === '生成中' || status === 'running') return 'running'
  return 'pending'
}

export function createGeneratedHistoryRecord({
  type = 'create',
  title,
  folderName,
  sourceImage,
  generatedImage,
  status = 'completed',
  reviewStatus,
  provider,
  model,
  mode,
  prompt,
  error,
  taskId,
  itemId,
  metadata,
  timestamp
} = {}) {
  const normalizedStatus = normalizeStatus(status)
  const now = timestamp || new Date().toISOString()
  const stableId = taskId || `${title || 'untitled'}-${generatedImage || sourceImage || now}`

  return {
    id: `${type}-${stableId}`,
    type,
    taskId: stableId,
    itemId: itemId || taskId || '',
    title: title || '未命名记录',
    folderName: folderName || '统一历史',
    sourceImage: sourceImage || '',
    generatedImage: generatedImage || '',
    status: normalizedStatus,
    reviewStatus: reviewStatus || (normalizedStatus === 'failed' ? 'review' : 'pending'),
    provider: provider || 'openai',
    model: model || 'gpt-image-2',
    mode: mode || type,
    prompt: prompt || '',
    error: error || '',
    metadata: metadata || {},
    createdAt: now,
    updatedAt: now
  }
}

export function createTaskRecord({ item, folderName, provider, model, mode, prompt }) {
  const status = normalizeStatus(item.status)
  const now = new Date().toISOString()
  const stablePart = `${item.id || '0'}-${item.title || item.referenceImage || now}`

  return createGeneratedHistoryRecord({
    type: 'redraw',
    taskId: `${folderName || '未命名项目'}-${stablePart}`,
    itemId: item.id,
    title: item.title || '未命名素材',
    folderName: folderName || item.folderName || '未命名项目',
    sourceImage: item.referenceImage || '',
    generatedImage: item.generatedImage || '',
    status,
    provider: provider || 'openai',
    model: model || 'gpt-image-2',
    mode: mode || 'openaiRedraw',
    prompt: prompt || '',
    error: item.error || '',
    timestamp: now
  })
}

export function upsertTaskRecord(records, record) {
  const source = Array.isArray(records) ? records : []
  const existing = source.find(item => item.id === record.id)
  const merged = existing
    ? { ...existing, ...record, reviewStatus: existing.reviewStatus || record.reviewStatus, updatedAt: new Date().toISOString() }
    : record

  return [
    merged,
    ...source.filter(item => item.id !== record.id)
  ].slice(0, MAX_HISTORY_RECORDS)
}

export function markTaskRecord(records, recordId, reviewStatus) {
  return (Array.isArray(records) ? records : []).map(record => (
    record.id === recordId
      ? { ...record, reviewStatus, updatedAt: new Date().toISOString() }
      : record
  ))
}

export function deleteTaskRecord(records, recordId) {
  return (Array.isArray(records) ? records : []).filter(record => record.id !== recordId)
}

export function clearTaskRecords() {
  return []
}

export function createHistoryRedoPayload(record = {}) {
  if (!record || typeof record !== 'object') {
    return null
  }

  if (record.type === 'textToImage') {
    return {
      type: 'textToImage',
      title: record.title || '文生图重做',
      prompt: record.prompt || '',
      ratio: record.metadata?.ratio || '3:4',
      quality: record.metadata?.quality || 'medium',
      mode: record.mode || 'cover'
    }
  }

  if (record.type === 'redraw') {
    return {
      type: 'redraw',
      title: record.title || '参考图重绘',
      prompt: record.prompt || '',
      sourceImage: record.sourceImage || '',
      mode: record.mode || 'openaiRedraw',
      itemId: record.itemId || ''
    }
  }

  return {
    type: record.type || 'unknown',
    title: record.title || '历史重做',
    prompt: record.prompt || '',
    mode: record.mode || record.type || ''
  }
}

export function filterTaskRecords(records, filter) {
  const source = Array.isArray(records) ? records : []
  if (!filter || filter === 'all') return source
  if (filter === 'failed') return source.filter(record => record.status === 'failed')
  return source.filter(record => record.reviewStatus === filter)
}

export function getTaskHistoryStats(records) {
  const source = Array.isArray(records) ? records : []
  return {
    total: source.length,
    satisfied: source.filter(record => record.reviewStatus === 'satisfied').length,
    review: source.filter(record => record.reviewStatus === 'review').length,
    failed: source.filter(record => record.status === 'failed').length
  }
}

export function loadTaskHistory(storage) {
  try {
    const raw = storage?.getItem?.('aiTeachingTaskHistory')
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveTaskHistory(storage, records) {
  storage?.setItem?.('aiTeachingTaskHistory', JSON.stringify((records || []).slice(0, MAX_HISTORY_RECORDS)))
}
