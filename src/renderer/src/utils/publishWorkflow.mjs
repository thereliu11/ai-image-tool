function cleanText(value, fallback = '') {
  return String(value ?? fallback).trim() || fallback
}

export function buildPublishTextVariants(options = {}) {
  const title = cleanText(options.title, 'AI教辅资料')
  const count = Math.max(1, Number(options.count) || 1)
  const sellingPoint = cleanText(options.sellingPoint, '适合预习、复习和错题巩固')

  return [
    `${title}\n\n这套一共整理了 ${count} 张，${sellingPoint}。\n重点已经重新排版，手机看、打印、收藏都方便。`,
    `${title}｜老师家长都能直接用\n\n${count} 张资料图，核心知识点更清楚，适合孩子课后巩固。`,
    `整理了一套 ${title}\n\n${sellingPoint}，内容按学习场景重新梳理，适合收藏慢慢用。`
  ]
}

export function buildPublishPlan(options = {}) {
  const title = cleanText(options.title, 'AI教辅资料')
  const grade = cleanText(options.grade, '小学')
  const subject = cleanText(options.subject, '学习')
  const count = Math.max(1, Number(options.count) || 1)
  const tags = [
    `#${grade}${subject}`,
    '#教辅资料',
    '#学习资料',
    '#家长辅导',
    '#小红书教辅',
    '#AI教辅'
  ]

  return {
    titles: [
      `${title}，这份真的适合收藏`,
      `${grade}${subject}易错点整理，打印就能用`,
      `老师整理的${subject}资料，重点很清楚`,
      `${count}张${subject}资料图，复习效率高很多`,
      `家长辅导${grade}${subject}，这套更省心`
    ],
    texts: buildPublishTextVariants({
      title,
      count,
      sellingPoint: cleanText(options.sellingPoint, '适合预习、复习和错题巩固')
    }),
    tags,
    suggestedTime: '建议晚 19:30-22:30 发布，适合家长和老师刷到后收藏。'
  }
}
