function getPathValue(source, path) {
  return path.split('.').reduce((value, key) => value?.[key], source)
}

const taskIdPaths = [
  'task_id',
  'taskId',
  'id',
  'data.task_id',
  'data.taskId',
  'data.id',
  'data.data.task_id',
  'data.data.taskId',
  'data.data.id',
  'data.output.task_id',
  'data.output.id'
]

const statusUrlPaths = [
  'status_url',
  'statusUrl',
  'url',
  'data.status_url',
  'data.statusUrl',
  'data.data.status_url',
  'data.data.statusUrl'
]

export function extractAsyncTaskInfo(response = {}) {
  const taskId = taskIdPaths.map(path => getPathValue(response, path)).find(Boolean) || ''
  const statusUrl = statusUrlPaths.map(path => getPathValue(response, path)).find(Boolean) || ''
  return taskId ? { taskId: String(taskId), statusUrl: statusUrl ? String(statusUrl) : '' } : null
}

export function buildAsyncPollUrl(baseURL, taskInfo = {}) {
  const base = String(baseURL || '').replace(/\/+$/, '')
  const root = base.replace(/\/v\d+$/, '')
  if (taskInfo.statusUrl) {
    const statusUrl = String(taskInfo.statusUrl)
    if (/^https?:\/\//i.test(statusUrl)) return statusUrl
    return `${root}/${statusUrl.replace(/^\/+/, '')}`
  }
  return `${base}/tasks/${encodeURIComponent(taskInfo.taskId || '')}`
}

export function getAsyncTaskStatus(payload = {}) {
  return String(
    payload.status ||
    payload.data?.status ||
    payload.data?.data?.status ||
    payload.output?.status ||
    ''
  ).toLowerCase()
}

export function isAsyncTaskFinished(payload = {}) {
  return ['succeeded', 'success', 'completed', 'done', 'finished'].includes(getAsyncTaskStatus(payload))
}

export function isAsyncTaskFailed(payload = {}) {
  return ['failed', 'error', 'cancelled', 'canceled'].includes(getAsyncTaskStatus(payload))
}

export function extractImagePayloadFromAsyncResult(payload = {}) {
  const candidates = [
    payload.data?.output?.[0],
    payload.data?.output?.results?.[0],
    payload.data?.data?.[0],
    payload.data?.result,
    payload.data,
    payload.output?.[0],
    payload.result,
    payload
  ].filter(Boolean)

  for (const candidate of candidates) {
    const base64 = candidate.b64_json || candidate.b64_image || candidate.image_base64 || candidate.base64
    if (base64) return { type: 'base64', value: base64 }
    const url = candidate.url || candidate.image_url || candidate.result_url || candidate.output_url
    if (url) return { type: 'url', value: url }
  }

  throw new Error('异步任务完成但未返回可保存的图片')
}
