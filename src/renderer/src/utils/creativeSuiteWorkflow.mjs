import { buildPublishPlan } from './publishWorkflow.mjs'

function cleanText(value, fallback = '') {
  return String(value ?? fallback).trim() || fallback
}

function clampInteger(value, min, max, fallback) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(max, Math.max(min, Math.round(number)))
}

const contentTemplates = [
  {
    value: 'framework-upgrade',
    label: '保留框架升级表达',
    instruction: '保留原资料的知识框架和页面顺序，优化标题、层级、卖点表达和小红书阅读节奏。'
  },
  {
    value: 'scenario-sales',
    label: '场景化销售表达',
    instruction: '把资料包装成具体使用场景，突出老师、家长、学生分别能得到的结果。'
  },
  {
    value: 'exam-sprint',
    label: '考前冲刺资料风',
    instruction: '强调考前提分、易错点、必背清单、快速复习和打印可用。'
  },
  {
    value: 'picture-book',
    label: '绘本故事风',
    instruction: '将知识内容组织成绘本故事页，语言更有画面感，适合低龄段阅读。'
  }
]

const pageRoles = ['封面', '目录/导读', '核心知识', '例题讲解', '易错提醒', '练习巩固', '总结/引导']

export function getContentTemplateOptions() {
  return contentTemplates.map(item => ({ ...item }))
}

export function buildContentTemplatePrompt(templateValue, options = {}) {
  const template = contentTemplates.find(item => item.value === templateValue) || contentTemplates[0]
  const sourceName = cleanText(options.sourceName, '上传资料')
  const goal = cleanText(options.goal, '提升内容清晰度和转化表达')

  return [
    `【来源】${sourceName}`,
    `【内容模板】${template.label}`,
    `【处理目标】${goal}`,
    `【执行要求】${template.instruction}`,
    '保留关键知识点、题号、公式、表格和答案含义；允许优化标题、分区、卖点和表达顺序。',
    '输出适合继续生成图文分离 PPT/Word 或小红书资料图的结构化内容。'
  ].join('\n')
}

export function buildPresentationPlan(input = {}, options = {}) {
  const now = options.now ?? Date.now()
  const topic = cleanText(input.topic, 'AI 教辅资料')
  const outputType = ['ppt', 'pictureBook'].includes(input.outputType) ? input.outputType : 'ppt'
  const pageCount = clampInteger(input.pageCount, 3, 30, outputType === 'ppt' ? 8 : 10)
  const ratio = cleanText(input.ratio, '3:4')
  const audience = cleanText(input.audience, '小红书老师和家长')
  const style = cleanText(input.style, outputType === 'ppt' ? '清爽重点笔记风' : '温暖绘本插画风')

  const pages = Array.from({ length: pageCount }, (_, index) => {
    const role = pageRoles[index] || `拓展内容 ${index + 1}`
    const title = index === 0 ? `封面：${topic}` : `${role}：${topic}`
    return {
      id: `presentation-page-${index + 1}-${now}`,
      index: index + 1,
      role,
      title,
      prompt: [
        `生成第 ${index + 1} 页：${title}`,
        `类型：${outputType === 'ppt' ? '教学 PPT 页面' : '绘本故事页面'}`,
        `比例：${ratio}`,
        `受众：${audience}`,
        `风格：${style}`,
        '中文文字准确，层级清晰，适合手机阅读和后续导出。'
      ].join('\n')
    }
  })

  return {
    id: `presentation-plan-${now}`,
    topic,
    outputType,
    pageCount,
    ratio,
    audience,
    style,
    pages,
    prompt: [
      `请围绕“${topic}”生成 ${pageCount} 页${outputType === 'ppt' ? '教学 PPT' : '绘本故事'}图文方案。`,
      `画幅比例 ${ratio}，面向${audience}，整体风格为${style}。`,
      '每页都要有清楚标题、核心内容和适合作图的视觉说明，不要生成无关装饰。'
    ].join('\n'),
    createdAt: now
  }
}

export function buildXhsCampaignPlan(input = {}, options = {}) {
  const now = options.now ?? Date.now()
  const topic = cleanText(input.topic, 'AI 教辅资料')
  const cardCount = clampInteger(input.cardCount, 1, 20, 6)
  const sellingPoint = cleanText(input.sellingPoint, '适合预习、复习和错题巩固')
  const grade = cleanText(input.grade, '中小学')
  const subject = cleanText(input.subject, '学习')
  const publishPlan = buildPublishPlan({
    title: topic,
    count: cardCount,
    sellingPoint,
    grade,
    subject
  })

  const cards = Array.from({ length: cardCount }, (_, index) => ({
    id: `xhs-campaign-card-${index + 1}-${now}`,
    title: index === 0 ? `${topic}｜封面` : `${topic}｜第 ${index + 1} 张`,
    role: index === 0 ? '封面钩子' : index === cardCount - 1 ? '总结转化' : '内容拆解',
    prompt: `围绕“${topic}”生成第 ${index + 1} 张小红书教辅图，突出${sellingPoint}，文字准确，适合 3:4 竖版手机阅读。`,
    status: 'pending'
  }))

  return {
    id: `xhs-campaign-${now}`,
    topic,
    cardCount,
    sellingPoint,
    titles: publishPlan.titles,
    tags: publishPlan.tags,
    publishText: [publishPlan.titles[0], '', publishPlan.texts[0], '', publishPlan.tags.join(' ')].join('\n'),
    cards,
    createdAt: now
  }
}
