const helpSections = [
  {
    id: 'create',
    title: '创作与生图',
    items: [
      { title: '一句话生成', content: '输入主题后生成 PPT/绘本式页面规划，再把页面提示词送到创作或文生图链路。' },
      { title: '魔法提示词', content: '把简单想法补全为适合 AI 作图的结构化提示词。' },
      { title: 'OCR 内容保真', content: '先提取原图文字，再生成更适合小红书阅读的教辅图片。' }
    ]
  },
  {
    id: 'separation',
    title: '图文分离',
    items: [
      { title: '区域调整', content: '查看识别区域，删除误识别区域，手动补充漏识别区域。' },
      { title: '画笔修补', content: '使用取色和画笔修补背景，再叠加可编辑文字层。' },
      { title: '部分导出', content: '只导出勾选页，适合在 WPS/PPT 中替换少量页面。' }
    ]
  },
  {
    id: 'toolbox',
    title: '百宝箱',
    items: [
      { title: '高级拼图', content: '支持边框、间距、2 倍超清、批量 ZIP 和模板化拼图参数。' },
      { title: '背景换图', content: '保留常用背景历史，支持快速复用。' },
      { title: '图片转视频', content: '支持长图滚动、多图滚动和横向切换方案。' }
    ]
  },
  {
    id: 'platform',
    title: '平台本地化',
    items: [
      { title: '本地账号', content: '桌面版使用本地资料保存昵称、身份和工作区。' },
      { title: '反馈记录', content: '反馈内容和截图保存到本机，后续可接入服务器上传。' }
    ]
  }
]

export function normalizeLocalProfile(profile = {}, options = {}) {
  const now = options.now ?? Date.now()
  return {
    nickname: String(profile.nickname || '').trim() || '本地用户',
    role: String(profile.role || '').trim() || 'teacher',
    workspace: String(profile.workspace || '').trim(),
    cloudSync: false,
    avatar: String(profile.avatar || '').trim(),
    updatedAt: now
  }
}

export function buildFeedbackRecord(input = {}, options = {}) {
  const now = options.now ?? Date.now()
  const content = String(input.content || '').trim()
  if (!content) {
    throw new Error('请填写反馈内容')
  }

  const type = String(input.type || 'suggestion').trim()
  const screenshots = (Array.isArray(input.screenshots) ? input.screenshots : [])
    .map(item => String(item || '').trim())
    .filter(Boolean)
    .slice(0, 3)

  return {
    id: `feedback-${now}`,
    type,
    content,
    contact: String(input.contact || '').trim(),
    screenshots,
    status: 'pending',
    priority: type === 'bug' || /失败|错误|崩溃|不能|不对/.test(content) ? 'high' : 'normal',
    createdAt: now,
    updatedAt: now
  }
}

export function buildHelpSections() {
  return helpSections.map(section => ({
    ...section,
    items: section.items.map(item => ({ ...item }))
  }))
}

export function buildAnnouncementCards(version = '0.0.9') {
  return [
    {
      version,
      title: `AI 教辅作图工具 ${version} 功能补全`,
      date: '2026-06-28',
      highlights: [
        '百宝箱高级拼图、背景历史、图片转视频模式补强',
        '图文分离区域调整、取色修补和局部导出流程补强',
        '小红书图文、文生图和一键分发工作流补强',
        '本地反馈、帮助中心和公告入口补齐'
      ]
    }
  ]
}
