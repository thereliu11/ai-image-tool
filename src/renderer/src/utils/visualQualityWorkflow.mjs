function parseRatio(value = '3:4') {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value
  const text = String(value || '').trim()
  const match = text.match(/^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/)
  if (match) {
    return Number(match[1]) / Number(match[2])
  }
  if (text === '1024x1365') return 3 / 4
  if (text === '1024x1536') return 2 / 3
  if (text === '1536x1024') return 3 / 2
  if (text === '1024x1024') return 1
  if (text === '1024x1792') return 9 / 16
  return 3 / 4
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0))
}

export function evaluateVisualQualityMetrics(metrics = {}, options = {}) {
  const width = Math.max(1, Number(metrics.width) || 1)
  const height = Math.max(1, Number(metrics.height) || 1)
  const actualRatio = width / height
  const targetRatio = parseRatio(options.targetRatio)
  const ratioDelta = Math.abs(actualRatio - targetRatio) / targetRatio
  const brightness = clamp(metrics.brightness, 0, 1)
  const contrast = clamp(metrics.contrast, 0, 1)
  const sharpness = Math.max(0, Number(metrics.sharpness) || 0)
  const warnings = []
  let score = 100

  if (ratioDelta > 0.16) {
    warnings.push('比例偏差较大')
    score -= Math.min(26, Math.round(ratioDelta * 90))
  }
  if (brightness < 0.28) {
    warnings.push('画面偏暗')
    score -= Math.round((0.28 - brightness) * 90)
  } else if (brightness > 0.86) {
    warnings.push('画面偏亮')
    score -= Math.round((brightness - 0.86) * 80)
  }
  if (contrast < 0.1) {
    warnings.push('对比度偏低')
    score -= Math.round((0.1 - contrast) * 180)
  }
  if (sharpness > 0 && sharpness < 35) {
    warnings.push('清晰度偏低')
    score -= Math.round((35 - sharpness) * 0.7)
  }

  const finalScore = clamp(Math.round(score), 0, 100)
  return {
    score: finalScore,
    needsReview: finalScore < 75 || warnings.length > 0,
    warnings,
    ratioDelta: Math.round(ratioDelta * 100),
    brightness,
    contrast,
    sharpness,
    status: metrics.status
  }
}

export function summarizeVisualQuality(results = []) {
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
