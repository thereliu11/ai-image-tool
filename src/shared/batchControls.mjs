export function chunkItems(items, chunkSize) {
  const source = Array.isArray(items) ? items : []
  const size = Number(chunkSize)
  if (!Number.isFinite(size) || size <= 0) return source.length ? [source] : []

  const chunks = []
  for (let index = 0; index < source.length; index += size) {
    chunks.push(source.slice(index, index + size))
  }
  return chunks
}

export function getRateLimitDelayMs(rateLimit = {}) {
  const requests = Number(rateLimit.requests)
  const perSeconds = Number(rateLimit.perSeconds)
  if (!Number.isFinite(requests) || requests <= 0) return 0
  if (!Number.isFinite(perSeconds) || perSeconds <= 0) return 0
  return Math.ceil((perSeconds * 1000) / requests)
}

export function normalizeImageQuality(quality) {
  return ['low', 'medium', 'high'].includes(quality) ? quality : 'high'
}

export function normalizeApiKeys(token, apiKeys) {
  const keys = []
  if (Array.isArray(apiKeys)) keys.push(...apiKeys)
  if (typeof apiKeys === 'string') keys.push(...apiKeys.split(/\r?\n|,/))
  if (typeof token === 'string') keys.push(token)
  return [...new Set(keys.map(key => String(key).trim()).filter(Boolean))]
}

export class ApiKeyRotator {
  constructor(keys = []) {
    this.keys = normalizeApiKeys('', keys)
    this.skipped = new Set()
    this.index = 0
  }

  next() {
    if (this.keys.length === 0) return ''
    for (let attempts = 0; attempts < this.keys.length; attempts++) {
      const key = this.keys[this.index % this.keys.length]
      this.index += 1
      if (!this.skipped.has(key)) return key
    }
    this.skipped.clear()
    const key = this.keys[this.index % this.keys.length]
    this.index += 1
    return key
  }

  skip(key) {
    if (key) this.skipped.add(key)
  }
}

export class CancellationRegistry {
  constructor() {
    this.jobs = new Map()
  }

  create(jobId = `job-${Date.now()}-${Math.random().toString(16).slice(2)}`) {
    this.jobs.set(jobId, { canceled: false })
    return jobId
  }

  cancel(jobId) {
    const job = this.jobs.get(jobId)
    if (job) job.canceled = true
    return Boolean(job)
  }

  isCanceled(jobId) {
    return Boolean(this.jobs.get(jobId)?.canceled)
  }

  finish(jobId) {
    this.jobs.delete(jobId)
  }
}
