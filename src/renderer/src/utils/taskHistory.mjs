const MAX_HISTORY_RECORDS = 200

function normalizeStatus(status) {
  if (status === '已完成' || status === 'completed') return 'completed'
  if (status === '失败' || status === 'failed') return 'failed'
  if (status === '生成中' || status === 'running') return 'running'
  return 'pending'
}

export function createTaskRecord({ item, folderName, provider, model, mode, prompt }) {
  const status = normalizeStatus(item.status)
  const now = new Date().toISOString()
  const stablePart = `${item.id || '0'}-${item.title || item.referenceImage || now}`

  return {
    id: `${folderName || '未命名项目'}-${stablePart}`,
    itemId: item.id,
    title: item.title || '未命名素材',
    folderName: folderName || item.folderName || '未命名项目',
    sourceImage: item.referenceImage || '',
    generatedImage: item.generatedImage || '',
    status,
    reviewStatus: status === 'failed' ? 'review' : 'pending',
    provider: provider || 'openai',
    model: model || 'gpt-image-2',
    mode: mode || 'openaiRedraw',
    prompt: prompt || '',
    error: item.error || '',
    createdAt: now,
    updatedAt: now
  }
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
