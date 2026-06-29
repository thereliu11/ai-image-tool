function isInterruptedStatus(status) {
  return ['生成中', 'running', '处理中', 'processing'].includes(String(status || ''))
}

function isPendingStatus(status) {
  return ['待生成', 'pending'].includes(String(status || ''))
}

function isFailedStatus(status) {
  return ['失败', 'failed'].includes(String(status || ''))
}

function isCompletedStatus(status) {
  return ['已完成', 'completed'].includes(String(status || ''))
}

export function recoverInterruptedItems(items = []) {
  return (Array.isArray(items) ? items : []).map(item => {
    if (!isInterruptedStatus(item?.status)) return item
    return {
      ...item,
      status: '待生成',
      error: null,
      generatedImage: item.generatedImage || null,
      recoveredFromInterrupted: true
    }
  })
}

export function summarizeResumeCandidates(items = []) {
  return (Array.isArray(items) ? items : []).reduce((summary, item) => {
    if (isInterruptedStatus(item?.status)) summary.interrupted += 1
    else if (isPendingStatus(item?.status)) summary.pending += 1
    else if (isFailedStatus(item?.status)) summary.failed += 1
    else if (isCompletedStatus(item?.status)) summary.completed += 1
    return summary
  }, {
    interrupted: 0,
    pending: 0,
    failed: 0,
    completed: 0
  })
}
