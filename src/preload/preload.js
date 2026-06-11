const { contextBridge, ipcRenderer } = require('electron');

// 安全暴露有限 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // ==================== 配置管理 ====================
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),

  // ==================== 文件操作 ====================
  importFolder: () => ipcRenderer.invoke('import-folder'),
  importFiles: () => ipcRenderer.invoke('import-files'),
  importMaterialFiles: (params) => ipcRenderer.invoke('import-material-files', params),
  importFolderPath: (folderPath) => ipcRenderer.invoke('import-folder-path', folderPath),
  openFolderDialog: () => ipcRenderer.invoke('open-folder-dialog'),
  openFileDialog: (options) => ipcRenderer.invoke('open-file-dialog', options),

  // ==================== 图片生成 ====================
  generateImage: (params) => ipcRenderer.invoke('generate-image', params),
  applyEnhancement: (params) => ipcRenderer.invoke('apply-enhancement', params),
  batchGenerate: (params) => ipcRenderer.invoke('batch-generate', params),
  stopGeneration: (params) => ipcRenderer.invoke('stop-generation', params),

  // ==================== OCR提取+本地渲染（新功能） ====================
  ocrRender: (params) => ipcRenderer.invoke('ocr-render', params),
  batchOcrRender: (params) => ipcRenderer.invoke('batch-ocr-render', params),

  // ==================== 图片处理（百宝箱） ====================
  imageWatermark: (params) => ipcRenderer.invoke('image-watermark', params),
  imageCompress: (params) => ipcRenderer.invoke('image-compress', params),
  imageCollage: (params) => ipcRenderer.invoke('image-collage', params),
  imageBgReplace: (params) => ipcRenderer.invoke('image-bg-replace', params),

  // ==================== 视频处理（百宝箱） ====================
  videoCreate: (params) => ipcRenderer.invoke('video-create', params),
  videoTrim: (params) => ipcRenderer.invoke('video-trim', params),
  videoWatermark: (params) => ipcRenderer.invoke('video-watermark', params),
  videoBgReplace: (params) => ipcRenderer.invoke('video-bg-replace', params),
  videoToGif: (params) => ipcRenderer.invoke('video-to-gif', params),

  // ==================== 文档处理（百宝箱） ====================
  docWordToPdf: (params) => ipcRenderer.invoke('doc-word-to-pdf', params),
  docPdfToImages: (params) => ipcRenderer.invoke('doc-pdf-to-images', params),
  docPdfToVideo: (params) => ipcRenderer.invoke('doc-pdf-to-video', params),
  docPdfToVideoAdvanced: (params) => ipcRenderer.invoke('doc-pdf-to-video-advanced', params),

  // ==================== 本地字体管理 ====================
  getLocalFonts: () => ipcRenderer.invoke('get-local-fonts'),
  uploadFont: (params) => ipcRenderer.invoke('upload-font', params),
  deleteFont: (params) => ipcRenderer.invoke('delete-font', params),

  // ==================== 百变拼图升级 ====================
  imageCollageAdvanced: (params) => ipcRenderer.invoke('image-collage-advanced', params),

  // ==================== 背景换图历史 ====================
  getBgHistory: () => ipcRenderer.invoke('get-bg-history'),
  addBgHistory: (params) => ipcRenderer.invoke('add-bg-history', params),

  // ==================== 视频绿幕换背景 ====================
  videoGreenScreen: (params) => ipcRenderer.invoke('video-green-screen', params),

  // ==================== 智能提示词优化（魔法棒） ====================
  optimizePrompt: (params) => ipcRenderer.invoke('optimize-prompt', params),

  // ==================== 模板库 ====================
  getTemplates: () => ipcRenderer.invoke('get-templates'),
  saveTemplate: (params) => ipcRenderer.invoke('save-template', params),
  deleteTemplate: (params) => ipcRenderer.invoke('delete-template', params),
  readJsonFile: (params) => ipcRenderer.invoke('read-json-file', params),

  // ==================== 导出 ====================
  exportImages: (params) => ipcRenderer.invoke('export-images', params),
  exportImagesToPdf: (params) => ipcRenderer.invoke('export-images-to-pdf', params),

  // ==================== 智能OCR导出 ====================
  ocrToPptx: (params) => ipcRenderer.invoke('ocr-to-pptx', params),
  ocrToDocx: (params) => ipcRenderer.invoke('ocr-to-docx', params),
  ocrExtractText: (params) => ipcRenderer.invoke('ocr-extract-text', params),
  qualityCheckImage: (params) => ipcRenderer.invoke('quality-check-image', params),
  rewriteDocument: (params) => ipcRenderer.invoke('rewrite-document', params),

  // ==================== 智能去字/提取底图 ====================
  removeText: (params) => ipcRenderer.invoke('remove-text', params),
  extractBackground: (params) => ipcRenderer.invoke('extract-background', params),

  // ==================== AI橡皮擦 ====================
  aiEraser: (params) => ipcRenderer.invoke('ai-eraser', params),
  aiEraserBatch: (params) => ipcRenderer.invoke('ai-eraser-batch', params),
  getApiProviders: () => ipcRenderer.invoke('get-api-providers'),

  // ==================== 作品集管理 ====================
  saveProject: (params) => ipcRenderer.invoke('save-project', params),
  getProjects: () => ipcRenderer.invoke('get-projects'),
  deleteProject: (params) => ipcRenderer.invoke('delete-project', params),
  updateProject: (params) => ipcRenderer.invoke('update-project', params),

  // ==================== 系统检测 ====================
  checkLibreOffice: () => ipcRenderer.invoke('check-libreoffice'),
  networkDiagnosis: () => ipcRenderer.invoke('network-diagnosis'),

  // ==================== 日志 ====================
  writeLog: (line) => ipcRenderer.invoke('write-log', line),

  // ==================== 外部链接/文件夹 ====================
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  writeClipboardText: (text) => ipcRenderer.invoke('write-clipboard-text', text),
  openFolder: (folderPath) => ipcRenderer.invoke('open-folder', folderPath),

  // ==================== 事件监听 ====================
  onLogMessage: (callback) => ipcRenderer.on('log-message', (event, message) => callback(message)),
  onProgressUpdate: (callback) => ipcRenderer.on('update-progress', (event, data) => callback(data)),
  onItemStatusUpdate: (callback) => ipcRenderer.on('update-item-status', (event, item) => callback(item)),

  // ==================== 移除监听器 ====================
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});
