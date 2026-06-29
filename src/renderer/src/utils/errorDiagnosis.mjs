function normalizeMessage(error) {
  if (!error) return ''
  if (typeof error === 'string') return error
  return String(error.message || error.error || error.statusText || error)
}

function createDiagnosis(code, title, summary, actions = []) {
  return {
    code,
    title,
    summary,
    actions
  }
}

export function diagnoseGenerationError(error) {
  const message = normalizeMessage(error)
  const lower = message.toLowerCase()

  if (/429|rate|quota|limit|exceeded|too many requests/.test(lower)) {
    return createDiagnosis(
      'rate_limit',
      '接口限流或额度不足',
      message.includes('429') ? message : `接口返回限流或额度错误：${message}`,
      [
        '把并发数调到 1',
        '检查 API 余额或更换 API Key',
        '等待几分钟后再手动重新生成失败项'
      ]
    )
  }

  if (/401|unauthorized|invalid api key|incorrect api key|invalid_key/.test(lower)) {
    return createDiagnosis(
      'invalid_key',
      'API Key 无效',
      `当前 API Key 无法通过鉴权：${message}`,
      [
        '重新复制 API Key',
        '确认 Base URL 与接口提供商匹配',
        '保存设置后点击测试连接'
      ]
    )
  }

  if (/403|forbidden|permission|billing|credit/.test(lower)) {
    return createDiagnosis(
      'permission',
      '接口权限或账单受限',
      `接口拒绝访问：${message}`,
      [
        '检查账号是否开通图片生成模型',
        '检查账单、余额或第三方中转套餐',
        '确认模型名是否在当前接口可用'
      ]
    )
  }

  if (/timeout|etimedout|econnreset|socket hang up/.test(lower)) {
    return createDiagnosis(
      'timeout',
      '请求超时或网络中断',
      `请求未在限定时间内完成：${message}`,
      [
        '检查网络或代理设置',
        '降低并发数',
        '换一张较小的参考图后重试'
      ]
    )
  }

  if (/404|not found|model.*not|unsupported|不支持/.test(lower)) {
    return createDiagnosis(
      'unsupported',
      '接口地址或模型不支持',
      `当前接口无法处理这个请求：${message}`,
      [
        '检查 Base URL 是否正确',
        '确认模型名称是否支持图片生成',
        '在 API 设置里切换到 OpenAI 兼容图片接口'
      ]
    )
  }

  if (/未找到图片|no image|image data|图片数据|响应格式错误|response format|no generated image|no.*payload/.test(lower)) {
    return createDiagnosis(
      'no_image_payload',
      '接口没有返回图片',
      `接口请求完成了，但响应里没有可保存的图片：${message}`,
      [
        '确认当前模型支持图片生成而不是只支持文字回复',
        '检查图片接口类型是否选择为生成或编辑接口',
        '换用 GPT-image-2 / LupoAPI 等确认可返回图片的接口后重试'
      ]
    )
  }

  if (/400|bad request|invalid request|size|format/.test(lower)) {
    return createDiagnosis(
      'bad_request',
      '请求参数不正确',
      `接口认为请求参数有问题：${message}`,
      [
        '检查尺寸比例、清晰度和生成模式',
        '确认参考图格式为 JPG/PNG/WebP',
        '缩短提示词后重试'
      ]
    )
  }

  if (/500|502|503|504|overloaded|server error/.test(lower)) {
    return createDiagnosis(
      'server_error',
      '接口服务暂时异常',
      `服务端返回异常：${message}`,
      [
        '稍后手动重新生成失败项',
        '降低并发数',
        '切换备用接口或 API Key'
      ]
    )
  }

  return createDiagnosis(
    'unknown',
    '未知错误',
    message || '没有拿到具体错误信息',
    [
      '查看运行日志中的上一条 API 响应',
      '点击网络诊断检查连接',
      '确认 API 设置后再重试'
    ]
  )
}

export function formatDiagnosisForLog(diagnosis, context = '') {
  const prefix = context ? `${context}：` : ''
  return `${prefix}${diagnosis.title} - ${diagnosis.summary}；建议：${diagnosis.actions.join('；')}`
}
