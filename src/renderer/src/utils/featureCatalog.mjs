const featureCategories = [
  {
    name: '创作增强',
    description: '围绕主创作页的提示词、参考图、生图和导出增强。',
    features: [
      { id: 'create-magic-prompt', name: '魔法提示词', handler: 'optimizePrompt', status: 'ready' },
      { id: 'create-ai-image', name: 'AI 生图', handler: 'batchGenerate', status: 'ready' },
      { id: 'create-text-to-image', name: '文生图工作台', handler: 'textToImageGenerate', status: 'ready' },
      { id: 'create-text-to-image-batch', name: '文生图批量素材', handler: 'importMaterialFiles', status: 'ready' },
      { id: 'create-ocr-render', name: 'OCR 内容保真', handler: 'batchOcrRender', status: 'ready' },
      { id: 'create-async-polling', name: '异步任务轮询取图', handler: 'batchGenerate', status: 'ready' },
      { id: 'create-quality-check', name: '生成后 OCR 质检', handler: 'qualityCheckImage', status: 'ready' },
      { id: 'create-visual-quality-check', name: '生成后视觉质检', handler: 'visualQualityCheckImage', status: 'ready' },
      { id: 'create-workspace-restore', name: '工作现场恢复', handler: 'local', status: 'ready' },
      { id: 'create-manual-resume', name: '手动恢复中断任务', handler: 'local', status: 'ready' },
      { id: 'create-presentation-plan', name: '一句话 PPT/绘本规划', handler: 'local', status: 'ready' },
      { id: 'create-content-template', name: '二创内容模板', handler: 'local', status: 'ready' },
      { id: 'create-export-pdf', name: '合成 PDF', handler: 'exportImagesToPdf', status: 'ready' }
    ]
  },
  {
    name: '小红书图文',
    description: '把教辅资料包装成小红书封面、资料页和多卡图文。',
    features: [
      { id: 'xhs-prompt-builder', name: '结构化提示词', handler: 'local', status: 'ready' },
      { id: 'xhs-card-plan', name: '图文卡片规划', handler: 'local', status: 'ready' },
      { id: 'xhs-one-click-generate', name: '一键生成图文', handler: 'batchGenerate', status: 'ready' },
      { id: 'xhs-copywriting', name: '标题文案生成', handler: 'optimizePrompt', status: 'ready' },
      { id: 'xhs-campaign-plan', name: '小红书闭环方案', handler: 'local', status: 'ready' },
      { id: 'xhs-publish-assistant', name: '分发文案助手', handler: 'writeClipboardText', status: 'ready' },
      { id: 'xhs-goods-download-plan', name: '商品图采集队列规划', handler: 'local', status: 'ready' },
      { id: 'xhs-goods-download', name: '小红书商品图下载', handler: 'xhsGoodsDownload', status: 'planned' }
    ]
  },
  {
    name: '二创改写',
    description: '上传 PDF、Word、PPT 后进行内容优化、模板替换和可编辑导出。',
    features: [
      { id: 'rewrite-document', name: '内容优化二创', handler: 'rewriteDocument', status: 'ready' },
      { id: 'rewrite-template-replace', name: '模板替换', handler: 'rewriteDocument', status: 'ready' },
      { id: 'rewrite-page-range', name: '页码范围处理', handler: 'rewriteDocument', status: 'ready' },
      { id: 'rewrite-history', name: '二创历史记录', handler: 'local', status: 'ready' }
    ]
  },
  {
    name: '模板库',
    description: '管理提示词模板、风格模板和后续可复用版式。',
    features: [
      { id: 'template-prompt', name: '提示词模板', handler: 'getTemplates', status: 'ready' },
      { id: 'template-style-save', name: '保存风格模板', handler: 'saveTemplate', status: 'ready' },
      { id: 'template-style-delete', name: '删除模板', handler: 'deleteTemplate', status: 'ready' },
      { id: 'template-layout-clone', name: '上传 3-5 张图克隆版式', handler: 'saveTemplate', status: 'ready' },
      { id: 'template-layout-ai-analysis', name: 'AI 分析参考图版式', handler: 'analyzeLayoutTemplate', status: 'ready' }
    ]
  },
  {
    name: '作品集',
    description: '集中管理生成结果，支持复用、导出、复查和二次编辑。',
    features: [
      { id: 'project-save', name: '保存到作品集', handler: 'saveProject', status: 'ready' },
      { id: 'project-list', name: '作品列表', handler: 'getProjects', status: 'ready' },
      { id: 'project-reuse', name: '载入继续创作', handler: 'local', status: 'ready' },
      { id: 'project-unified-history', name: '统一历史记录', handler: 'local', status: 'ready' },
      { id: 'project-history-cleanup', name: '历史删除清理', handler: 'local', status: 'ready' },
      { id: 'project-lead-video', name: '生成引流视频', handler: 'videoCreate', status: 'ready' }
    ]
  },
  {
    name: '图文分离',
    description: 'OCR、去字、擦除、字体和可编辑文档导出相关能力。',
    features: [
      { id: 'separation-workbench', name: '图文分离工作台', handler: 'local', status: 'ready' },
      { id: 'ocr-to-pptx', name: 'OCR 导出 PPT', handler: 'ocrToPptx', status: 'ready' },
      { id: 'ocr-to-docx', name: 'OCR 导出 Word', handler: 'ocrToDocx', status: 'ready' },
      { id: 'separation-partial-pdf-export', name: '图文分离页码/PDF导出', handler: 'separationExport', status: 'ready' },
      { id: 'remove-text', name: '智能去字', handler: 'removeText', status: 'ready' },
      { id: 'ai-eraser-editor', name: '区域画笔编辑器', handler: 'aiEraser', status: 'ready' },
      { id: 'separation-undo-redo', name: '图层撤销/重做', handler: 'local', status: 'ready' },
      { id: 'separation-layer-advanced-edit', name: '图层复制/锁定/旋转', handler: 'local', status: 'ready' },
      { id: 'separation-recognition-region', name: '识别区域保留/排除', handler: 'local', status: 'ready' },
      { id: 'separation-eyedropper-nudge', name: '取色与键盘微调', handler: 'local', status: 'ready' }
    ]
  },
  {
    name: '百宝箱',
    description: '图片、视频、文档转换和实用批处理工具。',
    features: [
      { id: 'image-watermark', name: '图片加水印', handler: 'imageWatermark', status: 'ready' },
      { id: 'image-watermark-advanced', name: '图片水印字体/Logo规划', handler: 'local', status: 'ready' },
      { id: 'image-compress', name: '图片压缩', handler: 'imageCompress', status: 'ready' },
      { id: 'image-collage', name: '百变拼图', handler: 'imageCollageAdvanced', status: 'ready' },
      { id: 'image-collage-advanced', name: '高级拼图间距/边框/超清/ZIP', handler: 'imageCollageAdvanced', status: 'ready' },
      { id: 'image-bg-replace', name: '背景换图', handler: 'imageBgReplace', status: 'ready' },
      { id: 'image-bg-history', name: '背景图历史复用', handler: 'addBgHistory', status: 'ready' },
      { id: 'image-scene-compose', name: '场景化图片排版', handler: 'imageSceneCompose', status: 'ready' },
      { id: 'image-split', name: '长图切片/图片分割', handler: 'imageSplit', status: 'ready' },
      { id: 'video-create', name: '图片转视频', handler: 'videoCreate', status: 'ready' },
      { id: 'video-create-plan', name: '视频模式与封面规划', handler: 'local', status: 'ready' },
      { id: 'video-trim', name: '视频截取', handler: 'videoTrim', status: 'ready' },
      { id: 'video-watermark', name: '视频移动水印', handler: 'videoWatermark', status: 'ready' },
      { id: 'video-bg-replace', name: '视频换背景', handler: 'videoBgReplace', status: 'ready' },
      { id: 'video-to-gif', name: '视频转 GIF', handler: 'videoToGif', status: 'ready' },
      { id: 'doc-office-batch-export', name: 'Word/PPT/PDF 一键转图片', handler: 'importMaterialFiles', status: 'ready' },
      { id: 'doc-word-to-pdf', name: 'Word 转 PDF', handler: 'docWordToPdf', status: 'ready' },
      { id: 'doc-pdf-to-images', name: 'PDF 转图片', handler: 'docPdfToImages', status: 'ready' },
      { id: 'doc-pdf-export-plan', name: 'PDF 页码/质量导出规划', handler: 'local', status: 'ready' },
      { id: 'doc-pdf-to-video', name: 'PDF 转视频', handler: 'docPdfToVideo', status: 'ready' }
    ]
  },
  {
    name: '分发与采集',
    description: '面向批量运营的飞书附件上传、平台素材采集和后续发布链路。',
    features: [
      { id: 'publish-feishu-upload-plan', name: '飞书上传任务规划', handler: 'local', status: 'ready' },
      { id: 'publish-feishu-upload-manifest', name: '飞书上传清单导出', handler: 'writeClipboardText', status: 'ready' },
      { id: 'publish-feishu-upload', name: '飞书一键上传', handler: 'feishuUpload', status: 'planned' }
    ]
  },
  {
    name: '平台本地化',
    description: '本地账号、反馈、帮助中心和版本公告，不依赖外部平台账号体系。',
    features: [
      { id: 'platform-local-profile', name: '本地账号资料', handler: 'local', status: 'ready' },
      { id: 'platform-feedback', name: '问题反馈记录', handler: 'local', status: 'ready' },
      { id: 'platform-help-center', name: '帮助中心', handler: 'local', status: 'ready' },
      { id: 'platform-announcements', name: '版本公告', handler: 'local', status: 'ready' }
    ]
  }
]

export function getFeatureCategories() {
  return featureCategories.map(category => ({
    ...category,
    features: category.features.map(feature => ({
      ...feature,
      category: category.name
    }))
  }))
}

export function getAllFeatures() {
  return getFeatureCategories().flatMap(category => category.features)
}

export function getFeatureById(id) {
  return getAllFeatures().find(feature => feature.id === id) || null
}

export function getPrimaryFeatureStats() {
  const features = getAllFeatures()
  return {
    total: features.length,
    ready: features.filter(feature => feature.status === 'ready').length,
    planned: features.filter(feature => feature.status === 'planned').length
  }
}
