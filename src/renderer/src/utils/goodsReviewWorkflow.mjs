const statusMap = new Map([
  ['pending', 'pending'],
  ['待生成', 'pending'],
  ['running', 'running'],
  ['生成中', 'running'],
  ['completed', 'completed'],
  ['已完成', 'completed'],
  ['failed', 'failed'],
  ['失败', 'failed']
])

export function normalizeGoodsStatus(status) {
  const raw = String(status || '').trim()
  return statusMap.get(raw) || 'pending'
}

export function getGoodsReviewStats(goods = []) {
  return (Array.isArray(goods) ? goods : []).reduce((stats, item) => {
    const status = normalizeGoodsStatus(item?.status)
    stats.total += 1
    if (item?.selected) stats.selected += 1
    if (stats[status] !== undefined) stats[status] += 1
    return stats
  }, {
    total: 0,
    selected: 0,
    pending: 0,
    running: 0,
    completed: 0,
    failed: 0
  })
}

export function filterGoodsForReview(goods = [], options = {}) {
  const status = options.status || 'all'
  const keyword = String(options.keyword || '').trim().toLowerCase()
  const selectedOnly = Boolean(options.selectedOnly)

  return (Array.isArray(goods) ? goods : []).filter(item => {
    if (!item) return false
    if (selectedOnly && !item.selected) return false
    if (status !== 'all' && normalizeGoodsStatus(item.status) !== status) return false
    if (keyword) {
      const haystack = [
        item.title,
        item.folderName,
        item.status,
        item.error,
        item.referenceImage,
        item.generatedImage
      ].map(value => String(value || '').toLowerCase()).join(' ')
      if (!haystack.includes(keyword)) return false
    }
    return true
  })
}

export function getNextReviewItem(goods = [], currentId, options = {}) {
  const candidates = filterGoodsForReview(goods, options)
  if (!candidates.length) return null

  const currentIndex = candidates.findIndex(item => item.id === currentId)
  if (currentIndex < 0) return candidates[0]
  return candidates[(currentIndex + 1) % candidates.length] || null
}
