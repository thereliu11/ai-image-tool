const templateNames = {
  cover: '资料包封面',
  material: '教辅资料页',
  mistake: '错题本订正页',
  card: '知识卡片',
  note: '学霸笔记'
}

function normalizePoints(points) {
  if (Array.isArray(points)) {
    return points.map(point => String(point).trim()).filter(Boolean)
  }
  return String(points || '')
    .split(/\r?\n/)
    .map(point => point.trim())
    .filter(Boolean)
}

export function buildXhsPrompt(form = {}) {
  const points = normalizePoints(form.points)
  const title = String(form.title || '').trim() || '教辅资料标题'
  const subtitle = String(form.subtitle || '').trim() || '突出资料价值和提分场景'
  const template = templateNames[form.template] || '教辅图片'
  const gradeSubject = `${form.grade || '小学'}${form.subject || '学科'}`
  const ratio = form.ratio || '2:3'
  const quality = form.quality || 'medium'

  return [
    '请生成一张适合小红书发布的 AI 教辅图片。',
    `【画面类型】${template}`,
    `【年级科目】${gradeSubject}`,
    `【主标题】${title}`,
    `【副标题/卖点】${subtitle}`,
    `【风格】${form.style || '清爽重点笔记风'}，白底为主，蓝色、绿色和黄色用于重点标注，少量红笔圈画强调关键点。`,
    '【内容要点】',
    ...(points.length ? points : ['重点知识整理', '易错点提醒', '练习方法总结']).map((point, index) => `${index + 1}. ${point}`),
    `【比例和质量】${ratio} 竖版构图，${quality} 质量。`,
    '【硬性要求】中文文字必须准确，标题醒目，层级清楚，适合手机阅读；不要生成无关装饰，不要出现乱码，不要改变教育内容含义。'
  ].join('\n')
}

export function createXhsCards(options = {}) {
  const count = Math.max(1, Math.min(20, Number(options.count) || 1))
  const title = String(options.title || '小红书图文').trim()
  const points = normalizePoints(options.points)
  const now = options.timestamp || Date.now()

  return Array.from({ length: count }, (_, index) => ({
    id: `xhs-card-${index + 1}-${now}`,
    title: count === 1 ? title : `${title} ${index + 1}`,
    subtitle: index === 0 ? '封面图' : `第 ${index + 1} 张内容图`,
    points: points.length ? points : ['知识点整理', '重点标注', '手机阅读友好'],
    status: 'pending',
    prompt: ''
  }))
}

export function summarizeXhsCards(cards = []) {
  return cards.reduce((summary, card) => {
    const status = card?.status || 'pending'
    summary.total += 1
    if (status in summary) {
      summary[status] += 1
    }
    return summary
  }, {
    total: 0,
    completed: 0,
    failed: 0,
    pending: 0,
    running: 0
  })
}

export function getXhsTemplateName(template) {
  return templateNames[template] || templateNames.cover
}
