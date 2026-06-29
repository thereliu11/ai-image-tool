function isCompletedStatus(status) {
  return status === '已完成' || status === 'completed'
}

export function createQualityQueue(items = []) {
  return (Array.isArray(items) ? items : [])
    .filter(item => isCompletedStatus(item.status) && item.referenceImage && item.generatedImage)
    .map(item => ({
      id: item.id,
      title: item.title,
      referenceImage: item.referenceImage,
      generatedImage: item.generatedImage
    }))
}

export function applyQualityResultsToItems(items = [], results = []) {
  const resultMap = new Map((Array.isArray(results) ? results : []).map(result => [result.id, result]))
  return (Array.isArray(items) ? items : []).map(item => {
    const result = resultMap.get(item.id)
    if (!result) return item
    return {
      ...item,
      qualityScore: result.score ?? item.qualityScore,
      qualityNeedsReview: Boolean(result.needsReview || result.error),
      qualityStatus: result.error ? 'failed' : (result.needsReview ? 'review' : 'passed'),
      qualityError: result.error || ''
    }
  })
}

export function summarizeQualityResults(results = []) {
  return (Array.isArray(results) ? results : []).reduce((summary, result) => {
    summary.total += 1
    if (result.error) {
      summary.failed += 1
    } else if (result.needsReview) {
      summary.review += 1
    } else {
      summary.passed += 1
    }
    return summary
  }, {
    total: 0,
    passed: 0,
    review: 0,
    failed: 0
  })
}
