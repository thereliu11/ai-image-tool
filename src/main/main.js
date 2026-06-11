const path = require('path');
const fs = require('fs');
const axios = require('axios');
const sharp = require('sharp');
const { ocrAndRender, extractTextFromImage, generateImageWithNanoBanana } = require('./ocr-renderer');

// Electron模块 - 使用getter模式，确保获取正确的API
let mainWindow;

function getElectron() {
  const e = require('electron');
  return typeof e === 'string' ? null : e;
}

function getApp() {
  const e = getElectron();
  return e ? e.app : null;
}

function getBrowserWindow() {
  const e = getElectron();
  return e ? e.BrowserWindow : null;
}

function getIpcMain() {
  const e = getElectron();
  return e ? e.ipcMain : null;
}

function getDialog() {
  const e = getElectron();
  return e ? e.dialog : null;
}

function getShell() {
  const e = getElectron();
  return e ? e.shell : null;
}

function getClipboard() {
  const e = getElectron();
  return e ? e.clipboard : null;
}

function initAutoUpdater() {
  try {
    const { autoUpdater } = require('electron-updater');
    autoUpdater.autoDownload = false;
    autoUpdater.on('update-available', () => addLog('检测到新版本，可在发布页下载更新。', 'INFO', 'Updater'));
    autoUpdater.on('update-not-available', () => addLog('当前已是最新版本。', 'INFO', 'Updater'));
    autoUpdater.on('error', (error) => addLog(`自动更新检查失败: ${error.message}`, 'WARN', 'Updater'));
    autoUpdater.checkForUpdates();
  } catch (error) {
    addLog('自动更新模块未安装，已跳过更新检查。', 'WARN', 'Updater');
  }
}

const app = getApp();
const BrowserWindow = getBrowserWindow();
const ipcMain = getIpcMain();
const dialog = getDialog();
const shell = getShell();
const clipboard = getClipboard();
const activeGenerationJobs = new Map();

async function parsePageRangesShared(input, maxPage) {
  const mod = await import('../shared/pageRange.mjs');
  return mod.parsePageRanges(input, maxPage);
}

// 默认配置
const defaultConfig = {
  api: {
    token: '',
    baseURL: 'https://api.openai.com/v1',
    provider: 'openai', // openai / lupoapi / gemini / deepseek / zhipu / minimax / xiaomi
    imageModel: 'gpt-image-2',
    imageQuality: 'high',
    previewQuality: 'low',
    finalQuality: 'high',
    apiKeys: [],
    proxyHost: '',
    proxyPort: null,
    pollingInterval: 3000
  },
  output: {
    rawOutputDir: '',
    finalOutputDir: ''
  },
  originality: {
    enabled: false,
    overlayFolder: '',
    minOpacity: 3,
    maxOpacity: 7,
    overlayCount: 1,
    spatialDistortion: 0,
    colorShift: 0,
    cloneExif: false
  },
  rateLimit: {
    requests: 1,
    perSeconds: 1,
    maxRetries: 3,
    retryDelay: 2.0
  },
  batch: {
    maxBatchSize: 20,
    maxConcurrency: 4
  }
};

// API提供商配置（2025年最新模型）
const API_PROVIDERS = {
  openai: {
    name: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
    imageModel: 'gpt-image-2',
    chatModel: 'gpt-5.5',
    supportsImage: true
  },
  lupoapi: {
    name: 'LupoAPI',
    baseURL: 'https://ai.lupoapi.com/v1',
    imageModel: 'gpt-image-2',
    chatModel: 'gpt-5.5',
    supportsImage: true,
    openAICompatible: true
  },
  gemini: {
    name: 'Google Gemini',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta',
    imageModel: 'gemini-2.5-flash-image', // Nano Banana - 支持图生图
    chatModel: 'gemini-3.5-flash',
    supportsImage: true
  },
  deepseek: {
    name: 'DeepSeek',
    baseURL: 'https://api.deepseek.com/v1',
    imageModel: null,
    chatModel: 'deepseek-v4',
    supportsImage: false
  },
  zhipu: {
    name: '智谱AI',
    baseURL: 'https://open.bigmodel.cn/api/paas/v4',
    imageModel: 'cogview-4', // 根据最新文档，智谱最新图片模型是CogView-4
    chatModel: 'glm-5.1',
    supportsImage: true
  },
  minimax: {
    name: 'MiniMax',
    baseURL: 'https://api.minimax.chat/v1',
    imageModel: null,
    chatModel: 'minimax-m3',
    supportsImage: false
  },
  xiaomi: {
    name: 'Xiaomi MiMo',
    baseURL: 'https://open.ai.xiaomi.com/v1',
    imageModel: null,
    chatModel: 'mimo-v2.5-pro',
    supportsImage: false
  }
};

// 启动应用
function sanitizeConfigForRenderer(config) {
  const safeConfig = JSON.parse(JSON.stringify(config || defaultConfig));
  safeConfig.api = safeConfig.api || {};
  safeConfig.api.hasToken = Boolean(safeConfig.api.token);
  safeConfig.api.token = '';
  return safeConfig;
}

function mergeConfigForSave(incomingConfig, existingConfig) {
  const mergedConfig = JSON.parse(JSON.stringify(incomingConfig || {}));
  const existingApi = existingConfig?.api || {};
  mergedConfig.api = mergedConfig.api || {};

  if (!mergedConfig.api.token && mergedConfig.api.hasToken && existingApi.provider === mergedConfig.api.provider) {
    mergedConfig.api.token = existingApi.token || '';
  }

  delete mergedConfig.api.hasToken;
  return mergedConfig;
}

function isOpenAICompatibleProvider(provider) {
  return provider === 'openai' || provider === 'lupoapi' || API_PROVIDERS[provider]?.openAICompatible;
}

function startApp() {
  // 检查app是否可用
  if (!app) {
    console.error('app是undefined，可能不在Electron环境中');
    return;
  }

  app.whenReady().then(() => {
    // 配置存储（在app准备好后初始化）
    const Store = require('electron-store');
    const store = new Store({
      encryptionKey: 'ai-teaching-tool-secure-key',
      fileExtension: 'json'
    });
    // 初始化配置
    if (!store.has('config')) {
      const configWithPaths = {
        ...defaultConfig,
        output: {
          rawOutputDir: path.join(app.getPath('documents'), 'AI教辅绘制', '生成图片'),
          finalOutputDir: path.join(app.getPath('documents'), 'AI教辅绘制', 'AI教辅绘制输出')
        }
      };
      store.set('config', configWithPaths);
    }

    // 注册IPC处理器
    registerIPC(store);

    // 创建窗口
    createWindow();
    initAutoUpdater();
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}

// 创建窗口
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    title: 'AI作图工具',
    icon: path.join(__dirname, '../../assets/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  // 开发环境加载localhost，生产环境加载打包后的文件
  const distPath = path.join(__dirname, '../../dist/renderer/index.html');
  if (fs.existsSync(distPath)) {
    mainWindow.loadFile(distPath);
  } else {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  }
}

// 日志函数
function addLog(message, level = 'INFO', module = 'MainThread') {
  const time = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const line = `[${time}] [${level}] [${module}] ${message}`;
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('log-message', line);
  }
}

// 带超时和指数退避的重试函数
// 可重试的错误码
const RETRYABLE_ERRORS = [429, 500, 502, 503, 504];
const RETRYABLE_MESSAGES = ['timeout', 'rate', 'quota', 'limit', 'exceeded', 'overloaded'];

async function withTimeoutAndRetry(fn, timeoutMs, maxRetries, retryDelay, logFn) {
  let retries = 0;
  while (true) {
    try {
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('API 请求超时，请检查网络连接')), timeoutMs)
      );
      const result = await Promise.race([fn(), timeout]);

      // 检查API返回的业务错误
      if (result && result.success === false) {
        const errorMsg = result.error || '';
        const isRetryable = RETRYABLE_MESSAGES.some(msg => errorMsg.toLowerCase().includes(msg));

        if (isRetryable && retries < maxRetries) {
          retries++;
          const delay = retryDelay * Math.pow(2, retries - 1);
          if (logFn) {
            logFn(`API返回错误，${delay}秒后重试（第${retries}/${maxRetries}次）: ${errorMsg}`, 'WARN');
          }
          await new Promise(resolve => setTimeout(resolve, delay * 1000));
          continue;
        }
      }

      return result;
    } catch (error) {
      // 检查是否为可重试的网络错误
      const isNetworkError = error.message.includes('timeout') ||
                             error.message.includes('ECONNRESET') ||
                             error.message.includes('ETIMEDOUT') ||
                             error.message.includes('429') ||
                             error.message.includes('500') ||
                             error.message.includes('502') ||
                             error.message.includes('503');

      if (isNetworkError && retries < maxRetries) {
        retries++;
        const delay = retryDelay * Math.pow(2, retries - 1);
        if (logFn) {
          logFn(`请求失败，${delay}秒后重试（第${retries}/${maxRetries}次）: ${error.message}`, 'WARN');
        }
        await new Promise(resolve => setTimeout(resolve, delay * 1000));
      } else {
        throw error;
      }
    }
  }
}

// OpenAI Images API 调用核心函数
async function redrawTeachingMaterial(referenceImagePath, stylePrompt, size = '1024x1536', config, options = {}) {
  const startTime = Date.now();
  const { normalizeApiKeys, normalizeImageQuality } = await import('../shared/batchControls.mjs');

  // 获取API配置
  const apiConfig = getApiConfig(config);
  const apiKeys = normalizeApiKeys(config.api.token, config.api.apiKeys);
  const requestApiKey = options.apiKey || config.api.token || apiKeys[0] || '';
  const imageQuality = normalizeImageQuality(options.quality || config.api.imageQuality || config.api.finalQuality || 'high');

  addLog(`开始生成 - 提供商: ${config.api.provider}, 模型: ${apiConfig.imageModel}, 图片: ${path.basename(referenceImagePath)}`, 'INFO', 'API');

  // 检查是否支持图片生成
  if (!apiConfig.imageModel) {
    const errorMsg = `当前API提供商(${config.api.provider || 'openai'})不支持图片生成，请选择OpenAI、智谱AI`;
    addLog(errorMsg, 'ERROR', 'API');
    return {
      success: false,
      error: errorMsg
    };
  }

  // 检查API密钥
  if (!requestApiKey) {
    const errorMsg = '未配置API密钥，请在API设置中配置';
    addLog(errorMsg, 'ERROR', 'API');
    return {
      success: false,
      error: errorMsg
    };
  }

  // 读取参考图并转为 base64
  const imageBuffer = fs.readFileSync(referenceImagePath);
  const imageBase64 = imageBuffer.toString('base64');
  const ext = path.extname(referenceImagePath).toLowerCase();
  const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';

  // 配置请求
  const axiosConfig = {
    headers: {
      'Content-Type': 'application/json'
    },
    timeout: 78000
  };
  if (options.signal) {
    axiosConfig.signal = options.signal;
  }

  // 根据不同API提供商设置认证方式
  if (config.api.provider === 'gemini') {
    // Gemini使用query参数方式传递API Key
    axiosConfig.params = { key: requestApiKey };
  } else {
    // 其他API使用Bearer token
    axiosConfig.headers['Authorization'] = `Bearer ${requestApiKey}`;
  }

  // 配置代理
  if (config.api.proxyHost && config.api.proxyPort) {
    const { HttpsProxyAgent } = require('https-proxy-agent');
    axiosConfig.httpsAgent = new HttpsProxyAgent(`http://${config.api.proxyHost}:${config.api.proxyPort}`);
  }

  // 根据不同API提供商构造请求
  let requestBody;
  let endpoint;

  if (config.api.provider === 'gemini') {
    // Gemini多模态格式（支持图生图）
    endpoint = `${apiConfig.baseURL}/models/${apiConfig.imageModel}:generateContent`;
    requestBody = {
      contents: [{
        parts: [
          { text: `请严格按照这张参考图片的内容和布局进行重新绘制。
【核心要求】
1. 100%保留所有文字内容，包括标题、正文、公式、标注、表格，一个字都不能错
2. 严格保持原有的排版结构、元素位置和空间关系
3. 不要添加任何额外的元素，也不要删除任何原有的元素
4. 色彩明亮，对比度适中，适合在手机上阅读
【风格要求】
${stylePrompt}
【禁止事项】
- 禁止改变文字内容
- 禁止改变排版结构
- 禁止添加无关背景` },
          { inlineData: { mimeType: mimeType, data: imageBase64 } }
        ]
      }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE']
      }
    };
  } else if (config.api.provider === 'zhipu') {
    // 智谱AI格式
    requestBody = {
      model: apiConfig.imageModel,
      prompt: `请严格按照这张参考图片的内容和布局进行重新绘制。
【核心要求】
1. 100%保留所有文字内容，包括标题、正文、公式、标注、表格，一个字都不能错
2. 严格保持原有的排版结构、元素位置和空间关系
3. 不要添加任何额外的元素，也不要删除任何原有的元素
4. 色彩明亮，对比度适中，适合在手机上阅读
【风格要求】
${stylePrompt}
【禁止事项】
- 禁止改变文字内容
- 禁止改变排版结构
- 禁止添加无关背景`,
      image: [`data:${mimeType};base64,${imageBase64}`],
      size: size
    };
  } else if (config.api.provider === 'qwen') {
    // 通义千问格式
    requestBody = {
      model: apiConfig.imageModel,
      input: {
        prompt: `请严格按照这张参考图片的内容和布局进行重新绘制。
【核心要求】
1. 100%保留所有文字内容
2. 严格保持原有的排版结构
3. 色彩明亮，对比度适中
【风格要求】
${stylePrompt}`,
        base_image: `data:${mimeType};base64,${imageBase64}`
      },
      parameters: {
        n: 1,
        size: size
      }
    };
  } else {
    // OpenAI 图片编辑接口：参考图重绘必须走 multipart /images/edits
    endpoint = `${apiConfig.baseURL}/images/edits`;
    const prompt = `请严格按照参考图片的内容和布局重新绘制。
核心要求：
1. 100%保留所有文字内容，包括标题、正文、公式、标注、表格。
2. 严格保持原有排版结构、元素位置和空间关系。
3. 不添加无关元素，不删除原有元素。
4. 色彩明亮，对比度适中，适合手机阅读。
风格要求：
${stylePrompt}`;
    const imageBlob = new Blob([imageBuffer], { type: mimeType });
    requestBody = new FormData();
    requestBody.append('model', apiConfig.imageModel);
    requestBody.append('prompt', prompt);
    requestBody.append('image', imageBlob, path.basename(referenceImagePath));
    requestBody.append('size', size);
    requestBody.append('quality', imageQuality);
    requestBody.append('output_format', 'jpeg');
    requestBody.append('n', '1');
    delete axiosConfig.headers['Content-Type'];
  }

  try {
    const response = await axios.post(endpoint, requestBody, axiosConfig);

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    addLog(`图片生成完成，耗时 ${duration} 秒`, 'INFO', 'API');

    // 解析响应（兼容不同API格式）
    let b64Data;
    if (config.api.provider === 'gemini') {
      // Gemini多模态响应格式
      const candidates = response.data.candidates || [];
      if (candidates.length > 0 && candidates[0].content && candidates[0].content.parts) {
        const imagePart = candidates[0].content.parts.find(p => p.inlineData);
        if (imagePart) {
          b64Data = imagePart.inlineData.data;
        } else {
          throw new Error('Gemini响应中未找到图片数据');
        }
      } else {
        throw new Error('Gemini响应格式错误');
      }
    } else if (config.api.provider === 'zhipu') {
      b64Data = response.data.data[0].b64_json;
    } else if (config.api.provider === 'qwen') {
      b64Data = response.data.output.results[0].b64_image;
    } else {
      b64Data = response.data.data[0].b64_json;
    }

    return {
      success: true,
      b64: b64Data,
      revised_prompt: response.data.data?.[0]?.revised_prompt || ''
    };
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    const errorMsg = error.response?.data?.error?.message || error.message;
    addLog(`图片生成失败 (${duration}秒) [${config.api.provider}]: ${errorMsg}`, 'ERROR', 'API');
    if (error.response?.data) {
      addLog(`API响应: ${JSON.stringify(error.response.data).substring(0, 200)}`, 'ERROR', 'API');
    }
    return {
      success: false,
      error: errorMsg
    };
  }
}

// 原创性增强引擎（四层防护）
async function applyOriginalityEnhancement(inputPath, outputPath, options) {
  let image = sharp(inputPath);

  // 第一层：透明图片叠加
  if (options.overlayFolder && options.overlayCount > 0) {
    const overlays = fs.readdirSync(options.overlayFolder)
      .filter(f => path.extname(f).toLowerCase() === '.png');

    if (overlays.length > 0) {
      for (let i = 0; i < options.overlayCount; i++) {
        const randomOverlay = overlays[Math.floor(Math.random() * overlays.length)];
        const opacity = options.minOpacity + Math.random() * (options.maxOpacity - options.minOpacity);

        image = image.composite([{
          input: path.join(options.overlayFolder, randomOverlay),
          blend: 'over',
          opacity: opacity / 100
        }]);
      }
    }
  }

  // 第二层：空间形变去重
  if (options.spatialDistortion > 0) {
    const meta = await image.metadata();
    const scaleX = 1 + (Math.random() - 0.5) * options.spatialDistortion * 0.001;
    const scaleY = 1 + (Math.random() - 0.5) * options.spatialDistortion * 0.001;
    image = image.resize(Math.round(meta.width * scaleX), Math.round(meta.height * scaleY));
  }

  // 第三层：色彩指纹混淆
  if (options.colorShift > 0) {
    image = image.modulate({
      brightness: 1 + (Math.random() - 0.5) * options.colorShift * 0.002,
      saturation: 1 + (Math.random() - 0.5) * options.colorShift * 0.002,
      hue: (Math.random() - 0.5) * options.colorShift * 0.1
    });
  }

  // 第四层：克隆真实相机EXIF
  if (options.cloneExif && options.overlayFolder) {
    const exifFiles = fs.readdirSync(options.overlayFolder)
      .filter(f => ['.jpg', '.jpeg'].includes(path.extname(f).toLowerCase()));

    if (exifFiles.length > 0) {
      const randomExif = exifFiles[Math.floor(Math.random() * exifFiles.length)];
      const srcMeta = await sharp(path.join(options.overlayFolder, randomExif)).metadata();
      if (srcMeta.exif) {
        image = image.withExif(srcMeta.exif);
      }
    }
  }

  await image.toFile(outputPath);
  return { success: true, outputPath };
}

// 导入文件夹核心逻辑
async function importFolder(folderPath) {
  try {
    // 支持所有常见图片格式
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'tiff', 'tif', 'svg', 'ico', 'avif'];
    const files = fs.readdirSync(folderPath)
      .filter(file => imageExtensions.includes(path.extname(file).toLowerCase().slice(1)))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

    if (files.length === 0) {
      return { error: '文件夹中没有找到图片文件（支持JPG/PNG/GIF/BMP/WebP/TIFF/SVG等格式）' };
    }

    const folderName = path.basename(folderPath);
    const goods = files.map((file, index) => {
      const filePath = path.join(folderPath, file);
      const stats = fs.statSync(filePath);
      const sizeMB = stats.size / (1024 * 1024);

      return {
        id: index + 1,
        title: file,
        folderName: folderName,
        referenceImage: filePath,
        status: '待生成',
        generatedImage: null,
        error: null,
        sizeMB: sizeMB.toFixed(2)
      };
    });

    // 检查大文件
    const largeFiles = goods.filter(item => parseFloat(item.sizeMB) > 20);
    if (largeFiles.length > 0) {
      addLog(`警告：发现 ${largeFiles.length} 个大于20MB的文件，可能导致API传输超时`, 'WARN');
    }

    addLog(`成功导入 ${files.length} 张图片，文件夹：${folderName}`);

    return { folderName, goods, folderPath, largeFiles: largeFiles.length };
  } catch (error) {
    return { error: `导入失败: ${error.message}` };
  }
}

function createGoodsFromImageFiles(files, folderName, folderPath) {
  return files.map((file, index) => {
    const stats = fs.statSync(file);
    const sizeMB = stats.size / (1024 * 1024);
    return {
      id: index + 1,
      title: path.basename(file),
      folderName,
      referenceImage: file,
      status: '待生成',
      generatedImage: null,
      error: null,
      sizeMB: sizeMB.toFixed(2)
    };
  });
}

async function importMaterialFiles(filePaths, pageRanges = '') {
  try {
    const imageExts = ['.jpg', '.jpeg', '.png', '.webp'];
    const materialImages = [];
    let projectName = '';
    let projectPath = '';

    for (const inputPath of filePaths) {
      const ext = path.extname(inputPath).toLowerCase();
      projectName = projectName || path.basename(inputPath, ext);
      projectPath = projectPath || path.dirname(inputPath);

      if (imageExts.includes(ext)) {
        materialImages.push(inputPath);
        continue;
      }

      if (['.doc', '.docx', '.ppt', '.pptx'].includes(ext)) {
        const pdfResult = await wordToPdf(inputPath);
        if (!pdfResult.success) throw new Error(pdfResult.error || '文档转PDF失败');
        const imageResult = await pdfToImages(pdfResult.outputPath);
        if (!imageResult.success) throw new Error(imageResult.error || 'PDF转图片失败');
        const allImages = listImageFiles(imageResult.outputDir);
        const pages = await parsePageRangesShared(pageRanges, allImages.length);
        pages.forEach(page => materialImages.push(allImages[page - 1]));
        continue;
      }

      if (ext === '.pdf') {
        const imageResult = await pdfToImages(inputPath);
        if (!imageResult.success) throw new Error(imageResult.error || 'PDF转图片失败');
        const allImages = listImageFiles(imageResult.outputDir);
        const pages = await parsePageRangesShared(pageRanges, allImages.length);
        pages.forEach(page => materialImages.push(allImages[page - 1]));
        continue;
      }
    }

    const validImages = materialImages.filter(Boolean);
    if (validImages.length === 0) {
      return { error: '未找到可导入的图片页' };
    }

    const folderName = filePaths.length === 1 ? projectName : '导入素材';
    const goods = createGoodsFromImageFiles(validImages, folderName, projectPath);
    const largeFiles = goods.filter(item => parseFloat(item.sizeMB) > 20);
    addLog(`成功导入素材 ${goods.length} 页`, 'INFO', 'Import');
    return { folderName, goods, folderPath: projectPath, largeFiles: largeFiles.length };
  } catch (error) {
    addLog(`素材导入失败: ${error.message}`, 'ERROR', 'Import');
    return { error: error.message };
  }
}

async function imagesToSimplePdf(imagePaths, outputPath) {
  if (!imagePaths.length) throw new Error('没有图片可合成');

  const objects = [];
  const pages = [];
  const imageEntries = [];

  function addObject(content) {
    objects.push(Buffer.isBuffer(content) ? content : Buffer.from(String(content), 'binary'));
    return objects.length;
  }

  for (const imagePath of imagePaths) {
    const image = sharp(imagePath).rotate();
    const meta = await image.metadata();
    const width = meta.width || 1024;
    const height = meta.height || 1536;
    const jpeg = await image.jpeg({ quality: 92 }).toBuffer();
    const imageObj = addObject(`<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);
    objects[imageObj - 1] = Buffer.concat([objects[imageObj - 1], jpeg, Buffer.from('\nendstream', 'binary')]);
    imageEntries.push({ imageObj, width, height });
  }

  const pagesObj = imageEntries.length * 3 + 1;
  imageEntries.forEach((entry, index) => {
    const content = `q\n${entry.width} 0 0 ${entry.height} 0 0 cm\n/Im${index + 1} Do\nQ`;
    const contentObj = addObject(`<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`);
    const pageObj = addObject(`<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 ${entry.width} ${entry.height}] /Resources << /XObject << /Im${index + 1} ${entry.imageObj} 0 R >> >> /Contents ${contentObj} 0 R >>`);
    pages.push(pageObj);
  });

  addObject(`<< /Type /Pages /Kids [${pages.map(id => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`);
  const catalogObj = addObject(`<< /Type /Catalog /Pages ${pagesObj} 0 R >>`);

  const chunks = [Buffer.from('%PDF-1.4\n', 'binary')];
  const offsets = [0];
  for (let i = 0; i < objects.length; i += 1) {
    offsets.push(Buffer.concat(chunks).length);
    chunks.push(Buffer.from(`${i + 1} 0 obj\n`, 'binary'), objects[i], Buffer.from('\nendobj\n', 'binary'));
  }
  const xrefOffset = Buffer.concat(chunks).length;
  chunks.push(Buffer.from(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`, 'binary'));
  for (let i = 1; i < offsets.length; i += 1) {
    chunks.push(Buffer.from(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`, 'binary'));
  }
  chunks.push(Buffer.from(`trailer\n<< /Size ${objects.length + 1} /Root ${catalogObj} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`, 'binary'));
  fs.writeFileSync(outputPath, Buffer.concat(chunks));
}

// 注册IPC处理器
function registerIPC(store) {
  // 获取配置
  ipcMain.handle('get-config', () => {
    return sanitizeConfigForRenderer(store.get('config'));
  });

  // 保存配置
  ipcMain.handle('save-config', (event, config) => {
    const mergedConfig = mergeConfigForSave(config, store.get('config'));
    store.set('config', mergedConfig);
    return { success: true, config: sanitizeConfigForRenderer(mergedConfig) };
  });

  // 导入文件夹或图片文件
  ipcMain.handle('import-folder', async (event) => {
    // 先让用户选择文件夹
    const folderResult = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: '导入整个图片文件夹',
      buttonLabel: '导入文件夹'
    });

    if (folderResult.canceled) return { canceled: true };

    const folderPath = folderResult.filePaths[0];
    return importFolder(folderPath);
  });

  // 导入单个或多个图片文件
  ipcMain.handle('import-files', async (event) => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: '图片文件', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'tiff', 'tif'] }
      ],
      title: '选择单张或多张教辅图片',
      buttonLabel: '选择图片'
    });

    if (result.canceled) return { canceled: true };

    const files = result.filePaths.filter(p => {
      const ext = path.extname(p).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.tif'].includes(ext);
    });

    if (files.length === 0) {
      return { error: '未找到有效的图片文件' };
    }

    const folderName = files.length === 1
      ? path.basename(files[0], path.extname(files[0]))
      : '选中的图片';
    const folderPath = path.dirname(files[0]);

    const goods = files.map((file, index) => {
      const stats = fs.statSync(file);
      const sizeMB = stats.size / (1024 * 1024);
      return {
        id: index + 1,
        title: path.basename(file),
        folderName: folderName,
        referenceImage: file,
        status: '待生成',
        generatedImage: null,
        error: null,
        sizeMB: sizeMB.toFixed(2)
      };
    });

    const largeFiles = goods.filter(item => parseFloat(item.sizeMB) > 20);
    addLog(`成功导入 ${files.length} 张图片`);

    return { folderName, goods, folderPath, largeFiles: largeFiles.length };
  });

  ipcMain.handle('import-material-files', async (event, { pageRanges } = {}) => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: '教辅素材', extensions: ['jpg', 'jpeg', 'png', 'webp', 'pdf', 'doc', 'docx', 'ppt', 'pptx'] }
      ],
      title: '导入图片/PDF/Word/PPT 教辅素材',
      buttonLabel: '导入素材'
    });

    if (result.canceled) return { canceled: true };
    return await importMaterialFiles(result.filePaths, pageRanges || '');
  });

  // 导入指定路径的文件夹
  ipcMain.handle('import-folder-path', async (event, folderPath) => {
    return importFolder(folderPath);
  });

  // 打开文件夹选择对话框
  ipcMain.handle('open-folder-dialog', async () => {
    return await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: '选择导出目录'
    });
  });

  // 打开文件选择对话框
  ipcMain.handle('open-file-dialog', async (event, options) => {
    return await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: '图片文件', extensions: ['jpg', 'jpeg', 'png'] }
      ],
      ...options
    });
  });

  // 检查LibreOffice是否安装
  ipcMain.handle('check-libreoffice', async () => {
    const possiblePaths = [
      'C:\\Program Files\\LibreOffice',
      'C:\\Program Files (x86)\\LibreOffice',
      '/usr/bin/libreoffice',
      '/Applications/LibreOffice.app'
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        return { installed: true, path: p };
      }
    }
    return { installed: false };
  });

  // 网络诊断
  ipcMain.handle('network-diagnosis', async () => {
    const config = store.get('config');
    try {
      // 详细日志配置信息
      addLog(`配置信息 - provider: ${config.api.provider}, token: ${config.api.token ? '已设置' : '未设置'}`, 'INFO', 'Network');
      addLog(`代理配置 - host: "${config.api.proxyHost}", port: "${config.api.proxyPort}"`, 'INFO', 'Network');
      addLog(`API地址: ${config.api.baseURL}`, 'INFO', 'Network');

      const axiosConfig = {
        timeout: 30000
      };

      // 根据不同API提供商设置认证方式
      if (config.api.provider === 'gemini') {
        // Gemini使用query参数方式传递API Key
        axiosConfig.params = { key: config.api.token };
      } else {
        // 其他API使用Bearer token
        axiosConfig.headers = {
          'Authorization': `Bearer ${config.api.token}`
        };
      }

      // 检查代理配置
      const proxyHost = config.api.proxyHost;
      const proxyPort = config.api.proxyPort;

      if (proxyHost && proxyPort && proxyHost !== '' && proxyPort !== null && proxyPort !== undefined) {
        const proxyUrl = `http://${proxyHost}:${proxyPort}`;
        addLog(`使用代理: ${proxyUrl}`, 'INFO', 'Network');
        const { HttpsProxyAgent } = require('https-proxy-agent');
        axiosConfig.httpsAgent = new HttpsProxyAgent(proxyUrl);
      } else {
        addLog('未配置代理，将直接连接', 'WARN', 'Network');
      }

      const response = await axios.get(`${config.api.baseURL}/models`, axiosConfig);
      addLog('网络诊断成功 - API连接正常', 'INFO', 'Network');
      return { success: true, message: 'API连接成功', data: response.data };
    } catch (error) {
      addLog(`网络诊断失败: ${error.message}`, 'ERROR', 'Network');
      return { success: false, message: `连接失败: ${error.message}` };
    }
  });

  // OpenAI Images API 调用
  ipcMain.handle('generate-image', async (event, { referenceImagePath, stylePrompt, size, quality }) => {
    const config = store.get('config');
    return await redrawTeachingMaterial(referenceImagePath, stylePrompt, size, config, { quality });
  });

  // 应用原创性增强
  ipcMain.handle('apply-enhancement', async (event, { inputPath, outputPath, options }) => {
    return await applyOriginalityEnhancement(inputPath, outputPath, options);
  });

  // 批量生成图片
  ipcMain.handle('batch-generate', async (event, { goodsList, promptText, concurrency, size, quality, jobId }) => {
    const config = store.get('config');
    if (!isOpenAICompatibleProvider(config.api.provider)) {
      return { success: false, error: '参考图重绘仅支持 OpenAI 或 LupoAPI 等 OpenAI 兼容图片接口，请先在 API 设置中切换到对应提供商' };
    }

    const maxConcurrency = concurrency || config.batch.maxConcurrency;
    // 清理goodsList中的不可序列化属性
    const cleanList = goodsList.map(item => ({
      id: item.id,
      title: item.title,
      folderName: item.folderName,
      referenceImage: item.referenceImage,
      status: item.status,
      generatedImage: item.generatedImage || null,
      error: item.error || null,
      sizeMB: item.sizeMB || '0'
    }));
    return await batchGenerateImagesV2(cleanList, promptText, maxConcurrency, config, size, { quality, jobId });
  });

  ipcMain.handle('stop-generation', async (event, { jobId } = {}) => {
    const jobs = jobId ? [[jobId, activeGenerationJobs.get(jobId)]] : Array.from(activeGenerationJobs.entries());
    let stoppedCount = 0;
    for (const [id, job] of jobs) {
      if (!job) continue;
      job.canceled = true;
      for (const controller of job.controllers || []) {
        try { controller.abort(); } catch {}
      }
      stoppedCount++;
      addLog(`已请求停止批量任务: ${id}`, 'WARN', 'Batch');
    }
    return { success: true, stoppedCount };
  });

  // OCR提取+本地渲染（新的AI教辅绘制方式）
  ipcMain.handle('ocr-render', async (event, { imagePath, title }) => {
    const config = store.get('config');
    try {
      const outputDir = path.join(config.output.rawOutputDir, 'ocr_rendered');
      fs.mkdirSync(outputDir, { recursive: true });
      const outputPath = path.join(outputDir, path.basename(imagePath, path.extname(imagePath)) + '_rendered.jpg');

      addLog(`开始OCR提取+渲染: ${path.basename(imagePath)}`, 'INFO', 'OCR');
      const result = await ocrAndRender(imagePath, outputPath, config, title);
      addLog(`OCR渲染完成: 提取${result.textCount}条文字`, 'INFO', 'OCR');

      return { success: true, ...result };
    } catch (error) {
      addLog(`OCR渲染失败: ${error.message}`, 'ERROR', 'OCR');
      return { success: false, error: error.message };
    }
  });

  // 批量OCR渲染
  ipcMain.handle('batch-ocr-render', async (event, { goodsList, title, customOutputDir, mode }) => {
    const config = store.get('config');
    const renderMode = mode || 'faithful'; // 默认内容保真模式

    // 使用用户选择的目录，或默认目录
    let outputDir;
    if (customOutputDir) {
      outputDir = customOutputDir;
    } else {
      // 弹出文件夹选择对话框
      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory'],
        title: '选择输出目录'
      });
      if (result.canceled) {
        return { canceled: true };
      }
      outputDir = result.filePaths[0];
    }

    fs.mkdirSync(outputDir, { recursive: true });
    addLog(`输出目录: ${outputDir}`, 'INFO', 'BatchOCR');

    const tasks = goodsList.filter(item => item.status === '待生成');
    let completedCount = 0;
    let successCount = 0;
    const totalCount = tasks.length;

    addLog(`开始批量OCR渲染: ${totalCount} 张图片`, 'INFO', 'BatchOCR');

    // 延时和重试配置
    const DELAY_BETWEEN_REQUESTS = 4000; // 每张图片间隔4秒
    const MAX_RETRIES = 3; // 最多重试3次
    const RETRY_DELAY = 5000; // 重试等待5秒
    const RETRYABLE_STATUS_CODES = [429, 502, 503]; // 可重试的错误码

    for (const item of tasks) {
      item.status = '生成中';
      mainWindow.webContents.send('update-item-status', item);

      let retries = 0;
      let success = false;

      while (retries <= MAX_RETRIES && !success) {
        try {
          const outputPath = path.join(outputDir, path.basename(item.referenceImage, path.extname(item.referenceImage)) + '_rendered.jpg');

          // 两步流程：1. OCR提取文字 2. Nano Banana生成图片
          if (retries === 0) {
            addLog(`[${item.id}/${totalCount}] 开始处理: ${path.basename(item.referenceImage)}`, 'INFO', 'BatchOCR');
          } else {
            addLog(`[${item.id}/${totalCount}] 第${retries}次重试`, 'WARN', 'BatchOCR');
          }

          // 第一步：提取文字
          addLog(`[${item.id}/${totalCount}] Step 1: Gemini OCR提取文字...`, 'INFO', 'BatchOCR');
          const textData = await extractTextFromImage(item.referenceImage, config);

          if (!textData || textData.length === 0) {
            throw new Error('未能提取到文字');
          }
          addLog(`[${item.id}/${totalCount}] 提取到 ${textData.length} 条文字`, 'INFO', 'BatchOCR');

          // 第二步：Nano Banana生成图片
          addLog(`[${item.id}/${totalCount}] Step 2: Nano Banana生成精美图片...`, 'INFO', 'BatchOCR');
          const imageBase64 = await generateImageWithNanoBanana(textData, title, renderMode, config);

          // 保存图片
          fs.writeFileSync(outputPath, Buffer.from(imageBase64, 'base64'));

          item.generatedImage = outputPath;
          item.status = '已完成';
          successCount++;
          success = true;
          addLog(`[${item.id}/${totalCount}] 完成`, 'INFO', 'BatchOCR');

        } catch (error) {
          // 检查是否为可重试的错误
          const isRetryable = error.message.includes('429') ||
                              error.message.includes('502') ||
                              error.message.includes('503') ||
                              error.message.includes('rate') ||
                              error.message.includes('quota') ||
                              error.message.includes('timeout');

          if (isRetryable && retries < MAX_RETRIES) {
            retries++;
            addLog(`[${item.id}/${totalCount}] 遇到可重试错误，${RETRY_DELAY/1000}秒后重试（第${retries}/${MAX_RETRIES}次）: ${error.message}`, 'WARN', 'BatchOCR');
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          } else {
            // 不可重试或重试次数用尽
            item.status = '失败';
            item.error = error.message;
            addLog(`[${item.id}/${totalCount}] 失败: ${error.message}`, 'ERROR', 'BatchOCR');
          }
        }
      }

      completedCount++;
      const progress = Math.round((completedCount / totalCount) * 100);
      mainWindow.webContents.send('update-progress', {
        progress, completedCount, successCount, totalCount
      });
      mainWindow.webContents.send('update-item-status', item);

      // 强制延时：避免触发API限流
      if (completedCount < totalCount) {
        addLog(`等待 ${DELAY_BETWEEN_REQUESTS/1000} 秒后继续下一张...`, 'INFO', 'BatchOCR');
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
      }
    }

    addLog(`批量OCR渲染完成: ${successCount}/${totalCount} 成功`, 'INFO', 'BatchOCR');
    return { success: true, successCount, totalCount, failCount: totalCount - successCount, outputDir };
  });

  // 导出图片
  ipcMain.handle('export-images', async (event, { completed, folderName, failedCount }) => {
    if (failedCount && failedCount > 0) {
      addLog(`注意：有 ${failedCount} 张图片生成失败，将不导出`, 'WARN');
    }

    if (completed.length === 0) {
      addLog('没有可导出的图片，请先生成图片', 'WARN');
      return { success: false, message: '没有可导出的图片' };
    }

    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: '选择导出目录'
    });

    if (result.canceled) return { canceled: true };

    const exportRoot = result.filePaths[0];
    const exportFolder = path.join(exportRoot, folderName);
    fs.mkdirSync(exportFolder, { recursive: true });

    let successCount = 0;
    let failCount = 0;

    for (const item of completed) {
      try {
        const dest = path.join(exportFolder, item.title);
        fs.copyFileSync(item.generatedImage, dest);
        addLog(`[导出成功] ${folderName}\\${item.title}`);
        successCount++;
      } catch (error) {
        addLog(`[导出失败] ${folderName}\\${item.title}: ${error.message}`, 'ERROR');
        failCount++;
      }
    }

    addLog(`全部导出完成: ${completed.length} 个`);
    return { success: true, exportFolder, successCount, failCount };
  });

  ipcMain.handle('export-images-to-pdf', async (event, { completed, folderName }) => {
    try {
      if (!completed || completed.length === 0) {
        return { success: false, error: '没有可合成 PDF 的图片' };
      }

      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory'],
        title: '选择PDF导出目录'
      });
      if (result.canceled) return { canceled: true };

      const exportRoot = result.filePaths[0];
      const safeName = (folderName || 'AI教辅合成PDF').replace(/[<>:"/\\|?*]/g, '_');
      const outputPath = path.join(exportRoot, `${safeName}_${Date.now()}.pdf`);
      await imagesToSimplePdf(completed.map(item => item.generatedImage).filter(Boolean), outputPath);
      addLog(`PDF合成完成: ${outputPath}`, 'INFO', 'ExportPDF');
      return { success: true, outputPath, outputDir: exportRoot, successCount: completed.length };
    } catch (error) {
      addLog(`PDF合成失败: ${error.message}`, 'ERROR', 'ExportPDF');
      return { success: false, error: error.message };
    }
  });

  // 写入日志文件
  ipcMain.handle('write-log', async (event, line) => {
    try {
      const logDir = path.join(app.getPath('documents'), 'AI教辅绘制', 'logs');
      fs.mkdirSync(logDir, { recursive: true });
      const logFile = path.join(logDir, `app-${new Date().toISOString().split('T')[0]}.log`);
      fs.appendFileSync(logFile, line);
    } catch (err) {
      console.error('写入日志失败:', err.message);
    }
  });

  // 打开外部链接
  ipcMain.handle('open-external', async (event, url) => {
    shell.openExternal(url);
  });

  ipcMain.handle('write-clipboard-text', async (event, text) => {
    clipboard.writeText(String(text || ''));
    return { success: true };
  });

  // 打开文件夹
  ipcMain.handle('open-folder', async (event, folderPath) => {
    shell.openPath(folderPath);
  });

  // ==================== 百宝箱：图片处理 ====================
  ipcMain.handle('image-watermark', async (event, { inputPath, text, position, opacity }) => {
    return await addWatermark(inputPath, text, position, opacity);
  });

  ipcMain.handle('image-compress', async (event, { inputPath, quality }) => {
    return await compressImage(inputPath, quality);
  });

  ipcMain.handle('image-collage', async (event, { imagePaths, layout }) => {
    return await createCollage(imagePaths, layout);
  });

  ipcMain.handle('image-bg-replace', async (event, { foregroundPath, backgroundPath }) => {
    return await replaceBackground(foregroundPath, backgroundPath);
  });

  // ==================== 百宝箱：视频处理 ====================
  ipcMain.handle('video-create', async (event, { imagePaths, durationPerImage }) => {
    return await imagesToVideo(imagePaths, durationPerImage);
  });

  ipcMain.handle('video-trim', async (event, { inputPath, startTime, endTime }) => {
    return await trimVideo(inputPath, startTime, endTime);
  });

  ipcMain.handle('video-watermark', async (event, { inputPath, text, path: movePath }) => {
    return await addVideoWatermark(inputPath, text, movePath);
  });

  ipcMain.handle('video-bg-replace', async (event, { videoPath, backgroundPath }) => {
    return await replaceVideoBackground(videoPath, backgroundPath);
  });

  ipcMain.handle('video-to-gif', async (event, { inputPath, width, fps }) => {
    return await videoToGif(inputPath, width, fps);
  });

  // ==================== 百宝箱：文档处理 ====================
  ipcMain.handle('doc-word-to-pdf', async (event, { inputPath }) => {
    return await wordToPdf(inputPath);
  });

  ipcMain.handle('doc-pdf-to-images', async (event, { inputPath }) => {
    return await pdfToImages(inputPath);
  });

  ipcMain.handle('doc-pdf-to-video', async (event, { inputPath, durationPerPage }) => {
    return await pdfToVideo(inputPath, durationPerPage);
  });

  // ==================== 魔法棒：提示词优化 ====================
  ipcMain.handle('optimize-prompt', async (event, { prompt }) => {
    const config = store.get('config');
    return await optimizePrompt(prompt, config);
  });

  // ==================== 模板库 ====================
  ipcMain.handle('get-templates', () => {
    return { success: true, templates: loadTemplates() };
  });

  ipcMain.handle('save-template', (event, { name, prompt }) => {
    const templates = loadTemplates();
    templates.push({ name, prompt, createdAt: new Date().toISOString() });
    saveTemplatesToFile(templates);
    return { success: true };
  });

  ipcMain.handle('delete-template', (event, { index }) => {
    const templates = loadTemplates();
    if (index >= 0 && index < templates.length) {
      templates.splice(index, 1);
      saveTemplatesToFile(templates);
      return { success: true };
    }
    return { success: false, error: '索引无效' };
  });

  ipcMain.handle('read-json-file', async (event, { filePath }) => {
    try {
      if (!filePath || path.extname(filePath).toLowerCase() !== '.json') {
        return { success: false, error: '请选择 JSON 文件' };
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      return { success: true, data: JSON.parse(content) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ==================== 智能OCR导出 ====================
  ipcMain.handle('ocr-to-pptx', async (event, { imagePaths }) => {
    return await ocrExportToPptx(imagePaths);
  });

  ipcMain.handle('ocr-to-docx', async (event, { imagePaths }) => {
    return await ocrExportToDocx(imagePaths);
  });

  ipcMain.handle('ocr-extract-text', async (event, { imagePath }) => {
    return await ocrExtractText(imagePath);
  });

  ipcMain.handle('quality-check-image', async (event, { sourceImage, generatedImage }) => {
    return await qualityCheckImage(sourceImage, generatedImage);
  });

  ipcMain.handle('rewrite-document', async (event, { inputPath, mode, outputFormat }) => {
    const config = store.get('config');
    return await rewriteDocument(inputPath, mode, outputFormat, config);
  });

  // ==================== 智能去字/提取底图 ====================
  ipcMain.handle('remove-text', async (event, { imagePath }) => {
    const config = store.get('config');
    return await removeTextFromImage(imagePath, config);
  });

  ipcMain.handle('extract-background', async (event, { imagePath }) => {
    const config = store.get('config');
    return await extractBackground(imagePath, config);
  });

  // ==================== AI橡皮擦 ====================
  ipcMain.handle('ai-eraser', async (event, { imagePath }) => {
    const config = store.get('config');
    return await aiEraser(imagePath, config);
  });

  ipcMain.handle('ai-eraser-batch', async (event, { imagePaths }) => {
    const config = store.get('config');
    return await aiEraserBatch(imagePaths, config);
  });

  // ==================== 获取API提供商列表 ====================
  ipcMain.handle('get-api-providers', () => {
    return API_PROVIDERS;
  });

  // ==================== 本地字体管理 ====================
  ipcMain.handle('get-local-fonts', () => {
    return { success: true, fonts: getLocalFonts() };
  });

  ipcMain.handle('upload-font', async (event, { fontPath }) => {
    return await uploadFont(fontPath);
  });

  ipcMain.handle('delete-font', async (event, { fontName }) => {
    return deleteFont(fontName);
  });

  // ==================== 百变拼图升级 ====================
  ipcMain.handle('image-collage-advanced', async (event, { imagePaths, layout, options }) => {
    try {
      const buffer = await createCollageAdvanced(imagePaths, layout, options);
      const outputDir = path.join(store.get('config').output.rawOutputDir, 'collage_output');
      fs.mkdirSync(outputDir, { recursive: true });
      const outputPath = path.join(outputDir, `collage_${Date.now()}.png`);
      fs.writeFileSync(outputPath, buffer);
      return { success: true, outputPath, outputDir };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ==================== 背景换图历史记录 ====================
  ipcMain.handle('get-bg-history', () => {
    return { success: true, history: getBgHistory() };
  });

  ipcMain.handle('add-bg-history', async (event, { imagePath }) => {
    const history = addToBgHistory(imagePath);
    return { success: true, history };
  });

  // ==================== PDF转视频升级 ====================
  ipcMain.handle('doc-pdf-to-video-advanced', async (event, { inputPath, durationPerPage, maxPages }) => {
    return await pdfToVideoAdvanced(inputPath, durationPerPage, maxPages);
  });

  // ==================== 视频绿幕换背景 ====================
  ipcMain.handle('video-green-screen', async (event, { videoPath, backgroundPath }) => {
    return await videoGreenScreen(videoPath, backgroundPath);
  });

  // ==================== 作品集管理 ====================
  ipcMain.handle('save-project', async (event, projectData) => {
    return await saveProject(projectData);
  });

  ipcMain.handle('get-projects', async () => {
    return await getProjects();
  });

  ipcMain.handle('delete-project', async (event, { projectId }) => {
    return await deleteProject(projectId);
  });

  ipcMain.handle('update-project', async (event, { projectId, updates }) => {
    return await updateProject(projectId, updates);
  });
}

// 批量生成图片（全并行 + 延时控制）
async function batchGenerateImages(goodsList, promptText, maxConcurrency, config, size = '1024x1536') {
  const pLimit = (await import('p-limit')).default;
  const limit = pLimit(maxConcurrency);

  const tasks = goodsList.filter(item => item.status === '待生成');
  let completedCount = 0;
  let successCount = 0;
  const totalCount = tasks.length;

  // Gemini免费API需要延时，每张图片间隔5秒
  const isGemini = config.api.provider === 'gemini';
  const delayBetweenRequests = isGemini ? 5000 : 1000;

  addLog(`开始全并行生成: ${totalCount} 张图片, 并发数: ${maxConcurrency}, 延时: ${delayBetweenRequests/1000}秒/张`, 'INFO', 'Batch');

  const promises = tasks.map(item => limit(async () => {
    item.status = '生成中';
    mainWindow.webContents.send('update-item-status', item);

    try {
      const result = await withTimeoutAndRetry(
        () => redrawTeachingMaterial(item.referenceImage, promptText, size, config),
        78000,
        config.rateLimit.maxRetries,
        config.rateLimit.retryDelay,
        (msg, level) => addLog(msg, level, 'Retry')
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      const rawPath = path.join(config.output.rawOutputDir, item.folderName, item.title);
      fs.mkdirSync(path.dirname(rawPath), { recursive: true });
      fs.writeFileSync(rawPath, Buffer.from(result.b64, 'base64'));

      let finalPath = rawPath;
      if (config.originality.enabled) {
        finalPath = path.join(config.output.finalOutputDir, item.folderName, item.title);
        fs.mkdirSync(path.dirname(finalPath), { recursive: true });
        await applyOriginalityEnhancement(rawPath, finalPath, config.originality);
      }

      item.generatedImage = finalPath;
      item.status = '已完成';
      successCount++;
      addLog(`图片 ${item.id} 生成成功 (${successCount}/${totalCount})`, 'INFO', 'Batch');
    } catch (error) {
      item.status = '失败';
      item.error = error.message;
      addLog(`图片 ${item.id} 生成失败: ${error.message}`, 'ERROR', 'Batch');
    } finally {
      completedCount++;
      const progress = Math.round((completedCount / totalCount) * 100);
      mainWindow.webContents.send('update-progress', {
        progress, completedCount, successCount, totalCount
      });
      mainWindow.webContents.send('update-item-status', item);
    }
  }));

  await Promise.allSettled(promises);

  addLog(`图片批量生成完成: ${successCount}/${totalCount} 成功`);

  return {
    success: true,
    successCount,
    totalCount,
    failCount: totalCount - successCount,
    outputDir: config.originality.enabled ? config.output.finalOutputDir : config.output.rawOutputDir
  };
}

// ==================== 百宝箱：图片处理 ====================

// 图片加水印
async function batchGenerateImagesV2(goodsList, promptText, maxConcurrency, config, size = '1024x1536', options = {}) {
  const {
    ApiKeyRotator,
    chunkItems,
    getRateLimitDelayMs,
    normalizeApiKeys,
    normalizeImageQuality
  } = await import('../shared/batchControls.mjs');
  const pLimit = (await import('p-limit')).default;

  const jobId = options.jobId || `batch-${Date.now()}`;
  const jobState = { canceled: false, controllers: new Set() };
  activeGenerationJobs.set(jobId, jobState);

  const tasks = goodsList.filter(item => !item.generatedImage && item.status !== 'completed' && item.status !== 'failed');
  const totalCount = tasks.length;
  const batchSize = Number(config.batch?.maxBatchSize) > 0 ? Number(config.batch.maxBatchSize) : 20;
  const chunks = chunkItems(tasks, batchSize);
  const limit = pLimit(maxConcurrency || config.batch?.maxConcurrency || 4);
  const keyRotator = new ApiKeyRotator(normalizeApiKeys(config.api?.token, config.api?.apiKeys));
  const quality = normalizeImageQuality(options.quality || config.api?.imageQuality || config.api?.finalQuality || 'high');
  const rateDelayMs = getRateLimitDelayMs(config.rateLimit);
  const outputBase = config.originality.enabled ? config.output.finalOutputDir : config.output.rawOutputDir;
  let completedCount = 0;
  let successCount = 0;
  let stopped = false;

  const sendProgress = (item) => {
    const progress = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;
    mainWindow?.webContents?.send('update-progress', { progress, completedCount, successCount, totalCount, jobId, canceled: stopped || jobState.canceled });
    if (item) mainWindow?.webContents?.send('update-item-status', item);
  };

  const sleepWithCancel = async (ms) => {
    const step = 100;
    let elapsed = 0;
    while (elapsed < ms) {
      if (jobState.canceled) throw new Error('任务已停止');
      await new Promise(resolve => setTimeout(resolve, Math.min(step, ms - elapsed)));
      elapsed += step;
    }
  };

  try {
    addLog(`开始批量生成: ${totalCount} 张, 批次大小: ${batchSize}, 并发: ${maxConcurrency}, 质量: ${quality}`, 'INFO', 'Batch');
    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      if (jobState.canceled) {
        stopped = true;
        break;
      }
      addLog(`开始第 ${chunkIndex + 1}/${chunks.length} 批，共 ${chunks[chunkIndex].length} 张`, 'INFO', 'Batch');
      const promises = chunks[chunkIndex].map((item, itemIndex) => limit(async () => {
        if (jobState.canceled) {
          stopped = true;
          return;
        }
        if (rateDelayMs > 0 && itemIndex > 0) {
          await sleepWithCancel(rateDelayMs * itemIndex);
        }
        item.status = 'running';
        sendProgress(item);
        const controller = new AbortController();
        jobState.controllers.add(controller);
        const apiKey = keyRotator.next();
        try {
          const result = await withTimeoutAndRetry(
            () => redrawTeachingMaterial(item.referenceImage, promptText, size, config, { apiKey, quality, signal: controller.signal }),
            78000,
            config.rateLimit.maxRetries,
            config.rateLimit.retryDelay,
            (message, level) => addLog(message, level, 'Batch')
          );
          if (jobState.canceled) {
            stopped = true;
            return;
          }
          if (!result.success) {
            if (/rate|quota|limit|exceeded|429/i.test(result.error || '')) keyRotator.skip(apiKey);
            throw new Error(result.error || '生成失败');
          }
          const rawPath = path.join(config.output.rawOutputDir, item.folderName, item.title);
          fs.mkdirSync(path.dirname(rawPath), { recursive: true });
          fs.writeFileSync(rawPath, Buffer.from(result.b64, 'base64'));
          let finalPath = rawPath;
          if (config.originality.enabled) {
            finalPath = path.join(config.output.finalOutputDir, item.folderName, item.title);
            fs.mkdirSync(path.dirname(finalPath), { recursive: true });
            await applyOriginalityEnhancement(rawPath, finalPath, config.originality);
          }
          item.generatedImage = finalPath;
          item.status = 'completed';
          successCount++;
          addLog(`图片 ${item.id} 生成成功 (${successCount}/${totalCount})`, 'INFO', 'Batch');
        } catch (error) {
          if (jobState.canceled || error.name === 'CanceledError' || error.message === '任务已停止') {
            item.status = 'pending';
            stopped = true;
            addLog(`图片 ${item.id} 已停止`, 'WARN', 'Batch');
            return;
          }
          item.status = 'failed';
          item.error = error.message;
          addLog(`图片 ${item.id} 生成失败: ${error.message}`, 'ERROR', 'Batch');
        } finally {
          jobState.controllers.delete(controller);
          completedCount++;
          sendProgress(item);
        }
      }));
      await Promise.allSettled(promises);
    }
  } finally {
    for (const controller of jobState.controllers) {
      try { controller.abort(); } catch {}
    }
    activeGenerationJobs.delete(jobId);
  }

  addLog(stopped ? `批量生成已停止: ${successCount}/${totalCount} 成功` : `批量生成完成: ${successCount}/${totalCount} 成功`, 'INFO', 'Batch');
  return { success: true, canceled: stopped, jobId, successCount, totalCount, failCount: totalCount - successCount, outputDir: outputBase };
}

async function addWatermark(inputPath, text, position = 'bottom-right', opacity = 30) {
  try {
    const image = sharp(inputPath);
    const metadata = await image.metadata();
    const width = metadata.width;
    const height = metadata.height;

    // 创建水印SVG
    const fontSize = Math.max(16, Math.min(width, height) / 15);
    const svgText = `<svg width="${width}" height="${height}">
      <style>
        .watermark {
          fill: white;
          font-size: ${fontSize}px;
          font-family: Arial, sans-serif;
          font-weight: bold;
          opacity: ${opacity / 100};
          filter: drop-shadow(1px 1px 2px rgba(0,0,0,0.5));
        }
      </style>
      <text class="watermark" x="${getXPosition(position, width)}" y="${getYPosition(position, height)}" text-anchor="${getTextAnchor(position)}">${escapeXml(text)}</text>
    </svg>`;

    const outputPath = inputPath.replace(/(\.\w+)$/, '_watermark$1');
    await image
      .composite([{ input: Buffer.from(svgText), blend: 'over' }])
      .toFile(outputPath);

    const outputDir = path.dirname(outputPath);
    addLog(`水印添加成功: ${path.basename(outputPath)}`, 'INFO', 'Watermark');
    return { success: true, outputPath, outputDir };
  } catch (error) {
    addLog(`水印添加失败: ${error.message}`, 'ERROR', 'Watermark');
    return { success: false, error: error.message };
  }
}

function getXPosition(position, width) {
  switch (position) {
    case 'top-left': return 20;
    case 'top-right': return width - 20;
    case 'bottom-left': return 20;
    case 'bottom-right': return width - 20;
    case 'center': return width / 2;
    default: return width - 20;
  }
}

function getYPosition(position, height) {
  switch (position) {
    case 'top-left': return 40;
    case 'top-right': return 40;
    case 'bottom-left': return height - 20;
    case 'bottom-right': return height - 20;
    case 'center': return height / 2;
    default: return height - 20;
  }
}

function getTextAnchor(position) {
  switch (position) {
    case 'top-left': return 'start';
    case 'bottom-left': return 'start';
    case 'center': return 'middle';
    default: return 'end';
  }
}

function escapeXml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

// 图片压缩
async function compressImage(inputPath, quality = 80) {
  try {
    const stats = fs.statSync(inputPath);
    const originalSize = formatSize(stats.size);

    const outputPath = inputPath.replace(/(\.\w+)$/, '_compressed$1');
    await sharp(inputPath)
      .jpeg({ quality: quality })
      .toFile(outputPath);

    const newStats = fs.statSync(outputPath);
    const newSize = formatSize(newStats.size);
    const outputDir = path.dirname(outputPath);

    addLog(`压缩完成: ${originalSize} → ${newSize}`, 'INFO', 'Compress');
    return { success: true, outputPath, outputDir, originalSize, newSize };
  } catch (error) {
    addLog(`压缩失败: ${error.message}`, 'ERROR', 'Compress');
    return { success: false, error: error.message };
  }
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// 百变拼图
async function createCollage(imagePaths, layout = '2x1') {
  try {
    const [cols, rows] = layout.split('x').map(Number);
    const images = await Promise.all(imagePaths.map(p => sharp(p).metadata()));

    const cellWidth = Math.max(...images.map(i => i.width));
    const cellHeight = Math.max(...images.map(i => i.height));
    const totalWidth = cellWidth * cols;
    const totalHeight = cellHeight * rows;

    const composites = [];
    for (let i = 0; i < imagePaths.length && i < cols * rows; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      composites.push({
        input: imagePaths[i],
        left: col * cellWidth,
        top: row * cellHeight
      });
    }

    const outputPath = path.join(path.dirname(imagePaths[0]), `collage_${layout}_${Date.now()}.jpg`);
    await sharp({
      create: {
        width: totalWidth,
        height: totalHeight,
        channels: 3,
        background: { r: 255, g: 255, b: 255 }
      }
    })
      .composite(composites)
      .jpeg({ quality: 90 })
      .toFile(outputPath);

    const outputDir = path.dirname(outputPath);
    addLog(`拼图生成成功: ${path.basename(outputPath)}`, 'INFO', 'Collage');
    return { success: true, outputPath, outputDir };
  } catch (error) {
    addLog(`拼图失败: ${error.message}`, 'ERROR', 'Collage');
    return { success: false, error: error.message };
  }
}

// 背景换图
async function replaceBackground(foregroundPath, backgroundPath) {
  try {
    const bgMeta = await sharp(backgroundPath).metadata();
    const fgMeta = await sharp(foregroundPath).metadata();

    // 调整前景大小以适应背景
    const resizedFg = await sharp(foregroundPath)
      .resize(Math.min(fgMeta.width, bgMeta.width), Math.min(fgMeta.height, bgMeta.height), { fit: 'inside' })
      .toBuffer();

    const resizedFgMeta = await sharp(resizedFg).metadata();

    const outputPath = foregroundPath.replace(/(\.\w+)$/, '_bgreplaced$1');
    await sharp(backgroundPath)
      .resize(bgMeta.width, bgMeta.height)
      .composite([{
        input: resizedFg,
        left: Math.round((bgMeta.width - resizedFgMeta.width) / 2),
        top: Math.round((bgMeta.height - resizedFgMeta.height) / 2)
      }])
      .toFile(outputPath);

    const outputDir = path.dirname(outputPath);
    addLog(`背景替换成功: ${path.basename(outputPath)}`, 'INFO', 'BgReplace');
    return { success: true, outputPath, outputDir };
  } catch (error) {
    addLog(`背景替换失败: ${error.message}`, 'ERROR', 'BgReplace');
    return { success: false, error: error.message };
  }
}

// ==================== 百宝箱：视频处理 ====================

// 图片转视频
async function imagesToVideo(imagePaths, durationPerImage = 2) {
  try {
    const ffmpegPath = require('ffmpeg-static');
    const ffmpeg = require('fluent-ffmpeg');
    ffmpeg.setFfmpegPath(ffmpegPath);

    const outputDir = path.join(path.dirname(imagePaths[0]), 'video_output');
    fs.mkdirSync(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, `video_${Date.now()}.mp4`);

    return new Promise((resolve, reject) => {
      const proc = ffmpeg()
        .input(imagePaths[0])
        .inputOptions('-loop', '1')
        .inputOptions('-t', String(durationPerImage))
        .outputOptions('-vf', `scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2`)
        .outputOptions('-c:v', 'libx264')
        .outputOptions('-pix_fmt', 'yuv420p')
        .outputOptions('-r', '30')
        .output(outputPath)
        .on('end', () => {
          addLog(`视频生成成功: ${path.basename(outputPath)}`, 'INFO', 'Video');
          resolve({ success: true, outputPath, outputDir });
        })
        .on('error', (err) => {
          addLog(`视频生成失败: ${err.message}`, 'ERROR', 'Video');
          resolve({ success: false, error: err.message });
        })
        .run();
    });
  } catch (error) {
    addLog(`视频生成失败: ${error.message}`, 'ERROR', 'Video');
    return { success: false, error: error.message };
  }
}

// 视频截取
async function trimVideo(inputPath, startTime, endTime) {
  try {
    const ffmpegPath = require('ffmpeg-static');
    const ffmpeg = require('fluent-ffmpeg');
    ffmpeg.setFfmpegPath(ffmpegPath);

    const outputDir = path.join(path.dirname(inputPath), 'video_output');
    fs.mkdirSync(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, `trimmed_${Date.now()}.mp4`);

    return new Promise((resolve) => {
      ffmpeg(inputPath)
        .setStartTime(startTime)
        .setDuration(calculateDuration(startTime, endTime))
        .output(outputPath)
        .on('end', () => {
          addLog(`视频截取成功: ${path.basename(outputPath)}`, 'INFO', 'VideoTrim');
          resolve({ success: true, outputPath, outputDir });
        })
        .on('error', (err) => {
          addLog(`视频截取失败: ${err.message}`, 'ERROR', 'VideoTrim');
          resolve({ success: false, error: err.message });
        })
        .run();
    });
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function calculateDuration(start, end) {
  const parse = (t) => {
    const parts = t.split(':').map(Number);
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  };
  return parse(end) - parse(start);
}

// 视频添加移动水印
async function addVideoWatermark(inputPath, text, movePath = 'diagonal') {
  try {
    const ffmpegPath = require('ffmpeg-static');
    const ffmpeg = require('fluent-ffmpeg');
    ffmpeg.setFfmpegPath(ffmpegPath);

    const outputDir = path.join(path.dirname(inputPath), 'video_output');
    fs.mkdirSync(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, `watermarked_${Date.now()}.mp4`);

    let drawTextFilter;
    switch (movePath) {
      case 'diagonal':
        drawTextFilter = `drawtext=text='${text}':fontsize=36:fontcolor=white@0.5:x='mod(t*100,w)':y='mod(t*80,h)':shadowcolor=black@0.3:shadowx=2:shadowy=2`;
        break;
      case 'horizontal':
        drawTextFilter = `drawtext=text='${text}':fontsize=36:fontcolor=white@0.5:x='mod(t*150,w)':y='h-th-20':shadowcolor=black@0.3:shadowx=2:shadowy=2`;
        break;
      case 'vertical':
        drawTextFilter = `drawtext=text='${text}':fontsize=36:fontcolor=white@0.5:x='w-tw-20':y='mod(t*100,h)':shadowcolor=black@0.3:shadowx=2:shadowy=2`;
        break;
      default:
        drawTextFilter = `drawtext=text='${text}':fontsize=36:fontcolor=white@0.5:x='mod(t*100,w)':y='mod(t*80,h)'`;
    }

    return new Promise((resolve) => {
      ffmpeg(inputPath)
        .videoFilters(drawTextFilter)
        .output(outputPath)
        .on('end', () => {
          addLog(`视频水印成功: ${path.basename(outputPath)}`, 'INFO', 'VideoWatermark');
          resolve({ success: true, outputPath, outputDir });
        })
        .on('error', (err) => {
          addLog(`视频水印失败: ${err.message}`, 'ERROR', 'VideoWatermark');
          resolve({ success: false, error: err.message });
        })
        .run();
    });
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// 视频换背景
async function replaceVideoBackground(videoPath, backgroundPath) {
  try {
    const ffmpegPath = require('ffmpeg-static');
    const ffmpeg = require('fluent-ffmpeg');
    ffmpeg.setFfmpegPath(ffmpegPath);

    const outputDir = path.join(path.dirname(videoPath), 'video_output');
    fs.mkdirSync(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, `bgreplaced_${Date.now()}.mp4`);

    return new Promise((resolve) => {
      ffmpeg()
        .input(videoPath)
        .input(backgroundPath)
        .complexFilter('[0:v][1:v]overlay=0:0:shortest=1')
        .output(outputPath)
        .on('end', () => {
          addLog(`视频背景替换成功: ${path.basename(outputPath)}`, 'INFO', 'VideoBgReplace');
          resolve({ success: true, outputPath, outputDir });
        })
        .on('error', (err) => {
          addLog(`视频背景替换失败: ${err.message}`, 'ERROR', 'VideoBgReplace');
          resolve({ success: false, error: err.message });
        })
        .run();
    });
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// 视频转GIF
async function videoToGif(inputPath, width = 480, fps = 15) {
  try {
    const ffmpegPath = require('ffmpeg-static');
    const ffmpeg = require('fluent-ffmpeg');
    ffmpeg.setFfmpegPath(ffmpegPath);

    const outputDir = path.join(path.dirname(inputPath), 'video_output');
    fs.mkdirSync(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, `animation_${Date.now()}.gif`);

    return new Promise((resolve) => {
      ffmpeg(inputPath)
        .outputOptions('-vf', `scale=${width}:-1:flags=lanczos,fps=${fps}`)
        .output(outputPath)
        .on('end', () => {
          addLog(`GIF转换成功: ${path.basename(outputPath)}`, 'INFO', 'VideoToGif');
          resolve({ success: true, outputPath, outputDir });
        })
        .on('error', (err) => {
          addLog(`GIF转换失败: ${err.message}`, 'ERROR', 'VideoToGif');
          resolve({ success: false, error: err.message });
        })
        .run();
    });
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ==================== 百宝箱：文档处理 ====================

// Word转PDF（使用LibreOffice）
async function wordToPdf(inputPath) {
  try {
    const loCheck = await checkLibreOfficeInstalled();
    if (!loCheck.installed) {
      return { success: false, error: '未安装LibreOffice，请先安装' };
    }

    const outputDir = path.join(path.dirname(inputPath), 'doc_output');
    fs.mkdirSync(outputDir, { recursive: true });

    const { execSync } = require('child_process');
    const cmd = `"${loCheck.path}\\program\\soffice.exe" --headless --convert-to pdf --outdir "${outputDir}" "${inputPath}"`;
    execSync(cmd, { timeout: 60000 });

    const pdfName = path.basename(inputPath, path.extname(inputPath)) + '.pdf';
    const outputPath = path.join(outputDir, pdfName);

    addLog(`Word转PDF成功: ${pdfName}`, 'INFO', 'WordToPdf');
    return { success: true, outputPath, outputDir };
  } catch (error) {
    addLog(`Word转PDF失败: ${error.message}`, 'ERROR', 'WordToPdf');
    return { success: false, error: error.message };
  }
}

async function checkLibreOfficeInstalled() {
  const possiblePaths = [
    'C:\\Program Files\\LibreOffice',
    'C:\\Program Files (x86)\\LibreOffice',
    '/usr/bin/libreoffice',
    '/Applications/LibreOffice.app/Contents'
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return { installed: true, path: p };
  }
  return { installed: false };
}

// PDF转图片
async function pdfToImages(inputPath) {
  try {
    const outputDir = path.join(path.dirname(inputPath), 'pdf_images');
    fs.mkdirSync(outputDir, { recursive: true });

    // 使用LibreOffice转图片
    const loCheck = await checkLibreOfficeInstalled();
    if (loCheck.installed) {
      const { execSync } = require('child_process');
      const cmd = `"${loCheck.path}\\program\\soffice.exe" --headless --convert-to png --outdir "${outputDir}" "${inputPath}"`;
      execSync(cmd, { timeout: 60000 });
    } else {
      // 备用方案：使用sharp处理（仅支持单页）
      const outputPath = path.join(outputDir, 'page_1.png');
      await sharp(inputPath).png().toFile(outputPath);
    }

    const files = fs.readdirSync(outputDir).filter(f => f.endsWith('.png'));
    addLog(`PDF转图片成功: ${files.length} 页`, 'INFO', 'PdfToImages');
    return { success: true, outputDir, pageCount: files.length };
  } catch (error) {
    addLog(`PDF转图片失败: ${error.message}`, 'ERROR', 'PdfToImages');
    return { success: false, error: error.message };
  }
}

// PDF转视频
async function pdfToVideo(inputPath, durationPerPage = 3) {
  try {
    // 先转图片
    const imgResult = await pdfToImages(inputPath);
    if (!imgResult.success) return imgResult;

    // 图片排序
    const images = fs.readdirSync(imgResult.outputDir)
      .filter(f => f.endsWith('.png'))
      .sort()
      .map(f => path.join(imgResult.outputDir, f));

    if (images.length === 0) {
      return { success: false, error: '没有找到转换后的图片' };
    }

    const ffmpegPath = require('ffmpeg-static');
    const ffmpeg = require('fluent-ffmpeg');
    ffmpeg.setFfmpegPath(ffmpegPath);

    const videoOutputDir = path.join(path.dirname(inputPath), 'doc_output');
    fs.mkdirSync(videoOutputDir, { recursive: true });
    const outputPath = path.join(videoOutputDir, `pdf_video_${Date.now()}.mp4`);

    // 创建文件列表
    const listFile = path.join(imgResult.outputDir, 'filelist.txt');
    const listContent = images.map(img => `file '${img.replace(/\\/g, '/')}'\nduration ${durationPerPage}`).join('\n');
    fs.writeFileSync(listFile, listContent);

    return new Promise((resolve) => {
      ffmpeg()
        .input(listFile)
        .inputOptions('-f', 'concat', '-safe', '0')
        .outputOptions('-vf', 'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2')
        .outputOptions('-c:v', 'libx264')
        .outputOptions('-pix_fmt', 'yuv420p')
        .output(outputPath)
        .on('end', () => {
          addLog(`PDF转视频成功: ${path.basename(outputPath)}`, 'INFO', 'PdfToVideo');
          resolve({ success: true, outputPath, outputDir: videoOutputDir });
        })
        .on('error', (err) => {
          addLog(`PDF转视频失败: ${err.message}`, 'ERROR', 'PdfToVideo');
          resolve({ success: false, error: err.message });
        })
        .run();
    });
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ==================== 魔法棒：提示词优化 ====================

function getLibreOfficeExecutable(loPath) {
  if (process.platform === 'win32') {
    return path.join(loPath, 'program', 'soffice.exe');
  }
  if (process.platform === 'darwin') {
    return path.join(loPath, 'Contents', 'MacOS', 'soffice');
  }
  return loPath;
}

async function officeToPdf(inputPath, outputDir) {
  const loCheck = await checkLibreOfficeInstalled();
  if (!loCheck.installed) {
    return { success: false, error: '未检测到 LibreOffice，无法转换 Office 文档' };
  }

  try {
    fs.mkdirSync(outputDir, { recursive: true });
    const { execFileSync } = require('child_process');
    const soffice = getLibreOfficeExecutable(loCheck.path);
    execFileSync(soffice, [
      '--headless',
      '--convert-to',
      'pdf',
      '--outdir',
      outputDir,
      inputPath
    ], { timeout: 120000 });

    const outputPath = path.join(outputDir, path.basename(inputPath, path.extname(inputPath)) + '.pdf');
    if (!fs.existsSync(outputPath)) {
      return { success: false, error: 'LibreOffice 未生成 PDF 文件' };
    }
    return { success: true, outputPath, outputDir };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function listImageFiles(dir) {
  return fs.readdirSync(dir)
    .filter(file => ['.png', '.jpg', '.jpeg', '.webp'].includes(path.extname(file).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map(file => path.join(dir, file));
}

async function documentToImagePaths(inputPath, workDir) {
  const ext = path.extname(inputPath).toLowerCase();
  if (['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
    return { success: true, imagePaths: [inputPath] };
  }

  let pdfPath = inputPath;
  if (['.doc', '.docx', '.ppt', '.pptx'].includes(ext)) {
    const pdfResult = await officeToPdf(inputPath, path.join(workDir, 'pdf'));
    if (!pdfResult.success) return pdfResult;
    pdfPath = pdfResult.outputPath;
  } else if (ext !== '.pdf') {
    return { success: false, error: `不支持的文件格式：${ext}` };
  }

  const imageResult = await pdfToImages(pdfPath);
  if (!imageResult.success) return imageResult;
  const imagePaths = listImageFiles(imageResult.outputDir);
  if (imagePaths.length === 0) {
    return { success: false, error: '未能从文档中提取出图片页' };
  }
  return { success: true, imagePaths };
}

async function rewriteDocument(inputPath, mode = 'optimize', outputFormat = 'pptx', config = {}) {
  try {
    if (!inputPath || !fs.existsSync(inputPath)) {
      return { success: false, error: '文件不存在，请重新选择文件' };
    }

    const safeBaseName = path.basename(inputPath, path.extname(inputPath)).replace(/[<>:"/\\|?*]/g, '_');
    const outputRoot = (config.output && config.output.finalOutputDir)
      ? config.output.finalOutputDir
      : path.join(app.getPath('documents'), 'AI教辅绘制', 'AI教辅绘制输出');
    const workDir = path.join(outputRoot, 'rewrite_work', `${safeBaseName}_${Date.now()}`);
    const outputDir = path.join(outputRoot, 'rewrite_output');
    fs.mkdirSync(workDir, { recursive: true });
    fs.mkdirSync(outputDir, { recursive: true });

    addLog(`开始二创重塑: ${path.basename(inputPath)} (${mode}/${outputFormat})`, 'INFO', 'Rewrite');
    const imageResult = await documentToImagePaths(inputPath, workDir);
    if (!imageResult.success) return imageResult;

    const ext = outputFormat === 'docx' ? 'docx' : 'pptx';
    const outputPath = path.join(outputDir, `${safeBaseName}_二创重塑_${Date.now()}.${ext}`);
    const result = ext === 'docx'
      ? await ocrExportToDocx(imageResult.imagePaths, outputPath)
      : await ocrExportToPptx(imageResult.imagePaths, outputPath);

    if (!result.success) return result;
    return {
      ...result,
      pageCount: imageResult.imagePaths.length,
      mode,
      outputFormat: ext
    };
  } catch (error) {
    addLog(`二创重塑失败: ${error.message}`, 'ERROR', 'Rewrite');
    return { success: false, error: error.message };
  }
}

async function optimizePrompt(simplePrompt, config) {
  try {
    const apiConfig = getApiConfig(config);

    const axiosConfig = {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    };

    // 根据不同API提供商设置认证方式
    if (config.api.provider === 'gemini') {
      // Gemini使用query参数方式传递API Key
      axiosConfig.params = { key: config.api.token };
    } else {
      // 其他API使用Bearer token
      axiosConfig.headers['Authorization'] = `Bearer ${config.api.token}`;
    }

    if (config.api.proxyHost && config.api.proxyPort) {
      const { HttpsProxyAgent } = require('https-proxy-agent');
      axiosConfig.httpsAgent = new HttpsProxyAgent(`http://${config.api.proxyHost}:${config.api.proxyPort}`);
    }

    const systemPrompt = `你是一个专业的AI绘图提示词优化专家。用户会给你一个简单的关键词或想法，你需要将其优化为一段详细、专业、适合AI图片生成的提示词。

要求：
1. 保留用户的核心意图
2. 添加风格、色彩、构图、细节等描述
3. 适合小红书等社交媒体展示
4. 中文描述，专业但易懂
5. 200字以内`;

    const response = await axios.post(
      `${apiConfig.baseURL}/chat/completions`,
      {
        model: apiConfig.chatModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `请优化以下提示词：${simplePrompt}` }
        ],
        temperature: 0.7,
        max_tokens: 500
      },
      axiosConfig
    );

    const optimized = response.data.choices[0].message.content;
    addLog('提示词优化完成', 'INFO', 'MagicWand');
    return { success: true, optimized };
  } catch (error) {
    addLog(`提示词优化失败: ${error.message}`, 'ERROR', 'MagicWand');
    return { success: false, error: error.message };
  }
}

// ==================== 模板库 ====================

function getTemplatesFilePath() {
  return path.join(app.getPath('userData'), 'templates.json');
}

function loadTemplates() {
  try {
    const templatesFile = getTemplatesFilePath();
    if (fs.existsSync(templatesFile)) {
      return JSON.parse(fs.readFileSync(templatesFile, 'utf-8'));
    }
  } catch (e) {}
  return [];
}

function saveTemplatesToFile(templates) {
  const templatesFile = getTemplatesFilePath();
  fs.mkdirSync(path.dirname(templatesFile), { recursive: true });
  fs.writeFileSync(templatesFile, JSON.stringify(templates, null, 2));
}

// ==================== 智能OCR导出 ====================

// OCR识别图片中的文字
async function ocrExtractText(imagePath) {
  try {
    const { createWorker } = require('tesseract.js');
    const worker = await createWorker('chi_sim+eng'); // 中文+英文
    const { data: { text, words } } = await worker.recognize(imagePath);
    await worker.terminate();
    return { success: true, text, words };
  } catch (error) {
    addLog(`OCR识别失败: ${error.message}`, 'ERROR', 'OCR');
    return { success: false, error: error.message };
  }
}

function normalizeOcrText(text) {
  return String(text || '')
    .replace(/\s+/g, '')
    .replace(/[^\w\u4e00-\u9fa5]+/g, '')
    .toLowerCase();
}

function extractQualityTokens(text) {
  const normalized = normalizeOcrText(text);
  const tokens = normalized.match(/[a-z0-9]{2,}|[\u4e00-\u9fa5]{2,}/g) || [];
  return [...new Set(tokens)].slice(0, 120);
}

async function qualityCheckImage(sourceImage, generatedImage) {
  try {
    if (!sourceImage || !generatedImage) {
      return { success: false, error: '缺少原图或生成图' };
    }

    addLog(`开始OCR质检: ${path.basename(generatedImage)}`, 'INFO', 'Quality');

    const sourceResult = await ocrExtractText(sourceImage);
    if (!sourceResult.success) {
      return { success: false, error: `原图OCR失败: ${sourceResult.error}` };
    }

    const generatedResult = await ocrExtractText(generatedImage);
    if (!generatedResult.success) {
      return { success: false, error: `生成图OCR失败: ${generatedResult.error}` };
    }

    const sourceText = normalizeOcrText(sourceResult.text);
    const generatedText = normalizeOcrText(generatedResult.text);
    const tokens = extractQualityTokens(sourceResult.text);
    const missingTokens = tokens.filter(token => !generatedText.includes(token));
    const matchedCount = Math.max(tokens.length - missingTokens.length, 0);
    const coverage = tokens.length > 0 ? matchedCount / tokens.length : 1;
    const lengthRatio = sourceText.length > 0 ? Math.min(generatedText.length / sourceText.length, 1) : 1;
    const score = Math.round((coverage * 0.75 + lengthRatio * 0.25) * 100);
    const needsReview = score < 70 || lengthRatio < 0.55;

    addLog(
      `OCR质检完成: ${path.basename(generatedImage)}，得分 ${score}，覆盖率 ${Math.round(coverage * 100)}%`,
      needsReview ? 'WARN' : 'INFO',
      'Quality'
    );

    return {
      success: true,
      score,
      needsReview,
      coverage: Math.round(coverage * 100),
      lengthRatio: Math.round(lengthRatio * 100),
      sourceTextLength: sourceText.length,
      generatedTextLength: generatedText.length,
      missingTokens: missingTokens.slice(0, 12),
      sourceText: sourceResult.text,
      generatedText: generatedResult.text
    };
  } catch (error) {
    addLog(`OCR质检失败: ${error.message}`, 'ERROR', 'Quality');
    return { success: false, error: error.message };
  }
}

// 图片OCR导出为可编辑PPT
async function ocrExportToPptx(imagePaths, outputPath) {
  try {
    const PptxGenJS = require('pptxgenjs');
    const pptx = new PptxGenJS();

    // 设置PPT尺寸为16:9
    pptx.layout = 'LAYOUT_WIDE';

    addLog(`开始OCR识别 ${imagePaths.length} 张图片...`, 'INFO', 'OCR');

    for (let i = 0; i < imagePaths.length; i++) {
      const imagePath = imagePaths[i];
      addLog(`正在识别第 ${i + 1}/${imagePaths.length} 张: ${path.basename(imagePath)}`, 'INFO', 'OCR');

      // OCR识别
      const ocrResult = await ocrExtractText(imagePath);
      if (!ocrResult.success) {
        addLog(`第 ${i + 1} 张识别失败，跳过`, 'WARN', 'OCR');
        continue;
      }

      // 获取图片尺寸
      const metadata = await sharp(imagePath).metadata();
      const imgWidth = metadata.width;
      const imgHeight = metadata.height;

      // 创建新幻灯片
      const slide = pptx.addSlide();

      // 添加图片作为背景
      const imageBase64 = fs.readFileSync(imagePath).toString('base64');
      const ext = path.extname(imagePath).toLowerCase();
      const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
      slide.addImage({
        data: `data:${mimeType};base64,${imageBase64}`,
        x: 0,
        y: 0,
        w: '100%',
        h: '100%'
      });

      // 按行分割OCR文本
      const lines = ocrResult.text.split('\n').filter(line => line.trim());

      if (lines.length > 0) {
        // 添加半透明背景框
        slide.addShape(pptx.shapes.RECTANGLE, {
          x: 0.5,
          y: 0.5,
          w: '90%',
          h: lines.length * 0.4 + 0.5,
          fill: { color: 'FFFFFF', transparency: 70 },
          line: { color: 'CCCCCC', width: 1 }
        });

        // 添加识别出的文字（可编辑文本框）
        let yPos = 0.7;
        for (const line of lines) {
          slide.addText(line.trim(), {
            x: 0.8,
            y: yPos,
            w: '85%',
            h: 0.35,
            fontSize: 14,
            fontFace: 'Microsoft YaHei',
            color: '333333',
            align: 'left',
            valign: 'middle'
          });
          yPos += 0.4;
        }
      }

      addLog(`第 ${i + 1} 张处理完成: 识别出 ${lines.length} 行文字`, 'INFO', 'OCR');
    }

    // 保存PPT
    const finalOutputPath = outputPath || path.join(
      path.dirname(imagePaths[0]),
      `ocr_export_${Date.now()}.pptx`
    );

    await pptx.writeFile({ fileName: finalOutputPath });

    const outputDir = path.dirname(finalOutputPath);
    addLog(`OCR导出PPT成功: ${path.basename(finalOutputPath)}`, 'INFO', 'OCR');
    return { success: true, outputPath: finalOutputPath, outputDir };
  } catch (error) {
    addLog(`OCR导出失败: ${error.message}`, 'ERROR', 'OCR');
    return { success: false, error: error.message };
  }
}

// 图片OCR导出为可编辑Word
async function writeSimpleDocx(sections, outputPath) {
  const JSZip = require('jszip');
  const zip = new JSZip();
  const body = sections.map((section, index) => {
    const lines = [
      `<w:p><w:r><w:rPr><w:b/></w:rPr><w:t>第 ${index + 1} 页 OCR 文字</w:t></w:r></w:p>`,
      ...section.lines.map(line => `<w:p><w:r><w:t>${escapeXml(line)}</w:t></w:r></w:p>`)
    ];
    return lines.join('');
  }).join('<w:p><w:r><w:br w:type="page"/></w:r></w:p>');

  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);
  zip.folder('_rels').file('.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);
  zip.folder('word').file('document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body>
</w:document>`);

  const buffer = await zip.generateAsync({ type: 'nodebuffer' });
  fs.writeFileSync(outputPath, buffer);
}

async function ocrExportToDocxFallback(imagePaths, outputPath) {
  const sections = [];
  for (let i = 0; i < imagePaths.length; i++) {
    const imagePath = imagePaths[i];
    addLog(`正在识别第 ${i + 1}/${imagePaths.length} 页: ${path.basename(imagePath)}`, 'INFO', 'OCR');
    const ocrResult = await ocrExtractText(imagePath);
    if (!ocrResult.success) continue;
    const lines = ocrResult.text.split('\n').map(line => line.trim()).filter(Boolean);
    sections.push({ lines });
  }

  if (sections.length === 0) {
    return { success: false, error: '未识别到可导出的文字' };
  }

  const finalOutputPath = outputPath || path.join(
    path.dirname(imagePaths[0]),
    `ocr_export_${Date.now()}.docx`
  );
  fs.mkdirSync(path.dirname(finalOutputPath), { recursive: true });
  await writeSimpleDocx(sections, finalOutputPath);
  return { success: true, outputPath: finalOutputPath, outputDir: path.dirname(finalOutputPath) };
}

async function ocrExportToDocx(imagePaths, outputPath) {
  try {
    let docx;
    try {
      docx = require('docx');
    } catch (error) {
      return await ocrExportToDocxFallback(imagePaths, outputPath);
    }
    const { Document, Packer, Paragraph, TextRun, ImageRun } = docx;

    const sections = [];

    for (let i = 0; i < imagePaths.length; i++) {
      const imagePath = imagePaths[i];
      addLog(`正在识别第 ${i + 1}/${imagePaths.length} 张: ${path.basename(imagePath)}`, 'INFO', 'OCR');

      // OCR识别
      const ocrResult = await ocrExtractText(imagePath);
      if (!ocrResult.success) continue;

      // 获取图片
      const imageBuffer = fs.readFileSync(imagePath);
      const metadata = await sharp(imagePath).metadata();
      const scale = 500 / metadata.width; // 缩放到500px宽

      // 按行分割
      const lines = ocrResult.text.split('\n').filter(line => line.trim());

      const sectionChildren = [
        // 添加图片
        new Paragraph({
          children: [
            new ImageRun({
              data: imageBuffer,
              transformation: {
                width: Math.round(metadata.width * scale),
                height: Math.round(metadata.height * scale)
              }
            })
          ],
          spacing: { after: 200 }
        }),
        // 添加分割线
        new Paragraph({
          children: [new TextRun({ text: '--- OCR识别结果 ---', bold: true, color: '999999' })],
          spacing: { after: 100 }
        })
      ];

      // 添加识别出的文字
      for (const line of lines) {
        sectionChildren.push(
          new Paragraph({
            children: [new TextRun({ text: line.trim(), size: 24 })],
            spacing: { after: 80 }
          })
        );
      }

      sections.push({ children: sectionChildren });
    }

    const doc = new Document({ sections });
    const buffer = await Packer.toBuffer(doc);

    const finalOutputPath = outputPath || path.join(
      path.dirname(imagePaths[0]),
      `ocr_export_${Date.now()}.docx`
    );

    fs.writeFileSync(finalOutputPath, buffer);

    const outputDir = path.dirname(finalOutputPath);
    addLog(`OCR导出Word成功: ${path.basename(finalOutputPath)}`, 'INFO', 'OCR');
    return { success: true, outputPath: finalOutputPath, outputDir };
  } catch (error) {
    addLog(`OCR导出失败: ${error.message}`, 'ERROR', 'OCR');
    return { success: false, error: error.message };
  }
}

// ==================== 智能去字/提取底图 ====================

// 智能去字：使用AI去除图片中的文字，保留纯背景图
async function removeTextFromImage(inputPath, config) {
  try {
    const imageBuffer = fs.readFileSync(inputPath);
    const ext = path.extname(inputPath).toLowerCase();
    const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
    const apiConfig = getApiConfig(config);

    if (!isOpenAICompatibleProvider(config.api.provider)) {
      return { success: false, error: '智能去字仅支持 OpenAI 或 LupoAPI 等 OpenAI 兼容图片编辑接口，请在 API 设置中切换到对应提供商' };
    }

    const axiosConfig = createAxiosConfig(config, 78000);
    delete axiosConfig.headers['Content-Type'];

    const requestBody = new FormData();
    requestBody.append('model', apiConfig.imageModel);
    requestBody.append('prompt', `请去除这张图片中的所有文字内容，只保留纯净的背景图/底图。
要求：
1. 完全移除所有文字、标题、标签
2. 保留原始背景、图案、装饰元素
3. 被文字遮挡的区域用周围的背景自然填充
4. 保持图片整体风格和色调一致
5. 输出一张干净的、没有文字的背景图`);
    requestBody.append('image', new Blob([imageBuffer], { type: mimeType }), path.basename(inputPath));
    requestBody.append('size', '1024x1536');
    requestBody.append('quality', 'high');
    requestBody.append('output_format', 'png');
    requestBody.append('n', '1');

    const response = await axios.post(
      `${apiConfig.baseURL}/images/edits`,
      requestBody,
      axiosConfig
    );

    const outputPath = inputPath.replace(/(\.\w+)$/, '_nobg$1');
    fs.writeFileSync(outputPath, Buffer.from(response.data.data[0].b64_json, 'base64'));

    const outputDir = path.dirname(outputPath);
    addLog(`智能去字成功: ${path.basename(outputPath)}`, 'INFO', 'RemoveText');
    return { success: true, outputPath, outputDir };
  } catch (error) {
    addLog(`智能去字失败: ${error.message}`, 'ERROR', 'RemoveText');
    return { success: false, error: error.message };
  }
}

// 提取底图：使用AI提取图片的背景/底图部分
async function extractBackground(inputPath, config) {
  try {
    const imageBuffer = fs.readFileSync(inputPath);
    const ext = path.extname(inputPath).toLowerCase();
    const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
    const apiConfig = getApiConfig(config);

    if (!isOpenAICompatibleProvider(config.api.provider)) {
      return { success: false, error: '提取底图仅支持 OpenAI 或 LupoAPI 等 OpenAI 兼容图片编辑接口，请在 API 设置中切换到对应提供商' };
    }

    const axiosConfig = createAxiosConfig(config, 78000);
    delete axiosConfig.headers['Content-Type'];

    const requestBody = new FormData();
    requestBody.append('model', apiConfig.imageModel);
    requestBody.append('prompt', `请提取这张图片的背景/底图部分。
要求：
1. 识别并移除所有前景元素（文字、图标、人物等）
2. 只保留纯净的背景/底图
3. 被遮挡的区域用周围背景自然填充
4. 保持背景的完整性和美观度
5. 输出一张适合作为模板使用的干净底图`);
    requestBody.append('image', new Blob([imageBuffer], { type: mimeType }), path.basename(inputPath));
    requestBody.append('size', '1024x1536');
    requestBody.append('quality', 'high');
    requestBody.append('output_format', 'png');
    requestBody.append('n', '1');

    const response = await axios.post(
      `${apiConfig.baseURL}/images/edits`,
      requestBody,
      axiosConfig
    );

    const outputPath = inputPath.replace(/(\.\w+)$/, '_extracted_bg$1');
    fs.writeFileSync(outputPath, Buffer.from(response.data.data[0].b64_json, 'base64'));

    const outputDir = path.dirname(outputPath);
    addLog(`底图提取成功: ${path.basename(outputPath)}`, 'INFO', 'ExtractBg');
    return { success: true, outputPath, outputDir };
  } catch (error) {
    addLog(`底图提取失败: ${error.message}`, 'ERROR', 'ExtractBg');
    return { success: false, error: error.message };
  }
}

// ==================== 作品集管理 ====================

function getProjectsFilePath() {
  return path.join(app.getPath('userData'), 'projects.json');
}

function loadProjects() {
  try {
    const projectsFile = getProjectsFilePath();
    if (fs.existsSync(projectsFile)) {
      return JSON.parse(fs.readFileSync(projectsFile, 'utf-8'));
    }
  } catch (e) {}
  return [];
}

function saveProjectsToFile(projects) {
  const projectsFile = getProjectsFilePath();
  fs.mkdirSync(path.dirname(projectsFile), { recursive: true });
  fs.writeFileSync(projectsFile, JSON.stringify(projects, null, 2));
}

// 保存作品到作品集
async function saveProject(projectData) {
  try {
    const projects = loadProjects();
    const project = {
      id: Date.now().toString(),
      name: projectData.name || '未命名作品',
      description: projectData.description || '',
      sourceImage: projectData.sourceImage,
      generatedImage: projectData.generatedImage,
      prompt: projectData.prompt || '',
      style: projectData.style || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    projects.unshift(project); // 新作品放最前面
    saveProjectsToFile(projects);
    addLog(`作品保存成功: ${project.name}`, 'INFO', 'Projects');
    return { success: true, project };
  } catch (error) {
    addLog(`作品保存失败: ${error.message}`, 'ERROR', 'Projects');
    return { success: false, error: error.message };
  }
}

// 获取作品列表
async function getProjects() {
  try {
    const projects = loadProjects();
    return { success: true, projects };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// 删除作品
async function deleteProject(projectId) {
  try {
    let projects = loadProjects();
    projects = projects.filter(p => p.id !== projectId);
    saveProjectsToFile(projects);
    addLog(`作品删除成功`, 'INFO', 'Projects');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// 更新作品
async function updateProject(projectId, updates) {
  try {
    const projects = loadProjects();
    const index = projects.findIndex(p => p.id === projectId);
    if (index === -1) return { success: false, error: '作品不存在' };
    projects[index] = { ...projects[index], ...updates, updatedAt: new Date().toISOString() };
    saveProjectsToFile(projects);
    addLog(`作品更新成功`, 'INFO', 'Projects');
    return { success: true, project: projects[index] };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ==================== AI橡皮擦（擦除文字，保留底图） ====================

// 获取API配置（根据provider返回正确的配置）
function getApiConfig(config) {
  const provider = API_PROVIDERS[config.api.provider] || API_PROVIDERS.openai;
  return {
    baseURL: config.api.baseURL || provider.baseURL,
    imageModel: config.api.imageModel || provider.imageModel,
    chatModel: provider.chatModel,
    token: config.api.token
  };
}

// 创建axios配置（根据provider处理不同的认证方式）
function createAxiosConfig(config, timeout = 30000) {
  const axiosConfig = {
    headers: {
      'Content-Type': 'application/json'
    },
    timeout: timeout
  };

  // 根据不同API提供商设置认证方式
  if (config.api.provider === 'gemini') {
    // Gemini使用query参数方式传递API Key
    axiosConfig.params = { key: config.api.token };
  } else {
    // 其他API使用Bearer token
    axiosConfig.headers['Authorization'] = `Bearer ${config.api.token}`;
  }

  // 配置代理
  if (config.api.proxyHost && config.api.proxyPort) {
    const { HttpsProxyAgent } = require('https-proxy-agent');
    axiosConfig.httpsAgent = new HttpsProxyAgent(`http://${config.api.proxyHost}:${config.api.proxyPort}`);
  }

  return axiosConfig;
}

// AI橡皮擦：擦除图片中的文字，保留纯底图
async function aiEraser(inputPath, config) {
  try {
    const apiConfig = getApiConfig(config);
    const imageBuffer = fs.readFileSync(inputPath);
    const imageBase64 = imageBuffer.toString('base64');
    const ext = path.extname(inputPath).toLowerCase();
    const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';

    // 检查是否支持图片生成
    if (!apiConfig.imageModel) {
      return { success: false, error: `当前API提供商(${config.api.provider})不支持图片生成，请选择OpenAI或智谱AI` };
    }

    if (!['openai', 'zhipu'].includes(config.api.provider)) {
      return { success: false, error: `AI橡皮擦当前仅支持 OpenAI 或智谱AI，当前提供商：${config.api.provider}` };
    }

    const axiosConfig = {
      headers: {
        'Authorization': `Bearer ${apiConfig.token}`,
        'Content-Type': 'application/json'
      },
      timeout: 120000 // 2分钟超时
    };

    if (config.api.proxyHost && config.api.proxyPort) {
      const { HttpsProxyAgent } = require('https-proxy-agent');
      axiosConfig.httpsAgent = new HttpsProxyAgent(`http://${config.api.proxyHost}:${config.api.proxyPort}`);
    }

    // 构造请求（支持OpenAI和智谱AI格式）
    let requestBody;
    let endpoint;

    if (config.api.provider === 'zhipu') {
      // 智谱AI格式
      endpoint = `${apiConfig.baseURL}/images/generations`;
      requestBody = {
        model: apiConfig.imageModel,
        prompt: `请执行以下操作：
1. 识别图片中的所有文字内容（标题、正文、标注、水印等）
2. 使用AI橡皮擦功能，将所有文字完全擦除
3. 被文字遮挡的区域用周围的背景自然填充
4. 保留图片中的所有图形、图案、装饰元素
5. 保持图片整体风格、色调、布局不变
6. 输出一张干净的、没有任何文字的纯净底图

要求：
- 文字擦除要彻底，不能残留任何文字痕迹
- 填充要自然，看不出擦除痕迹
- 保留所有非文字的视觉元素`,
        image: [`data:${mimeType};base64,${imageBase64}`],
        size: '1024x1024'
      };
    } else {
      // OpenAI 图片编辑接口
      endpoint = `${apiConfig.baseURL}/images/edits`;
      requestBody = new FormData();
      requestBody.append('model', apiConfig.imageModel);
      requestBody.append('prompt', `请执行以下操作：
1. 识别图片中的所有文字内容（标题、正文、标注、水印等）
2. 使用AI橡皮擦功能，将所有文字完全擦除
3. 被文字遮挡的区域用周围的背景自然填充
4. 保留图片中的所有图形、图案、装饰元素
5. 保持图片整体风格、色调、布局不变
6. 输出一张干净的、没有任何文字的纯净底图

要求：
- 文字擦除要彻底，不能残留任何文字痕迹
- 填充要自然，看不出擦除痕迹
- 保留所有非文字的视觉元素`);
      requestBody.append('image', new Blob([imageBuffer], { type: mimeType }), path.basename(inputPath));
      requestBody.append('size', '1024x1536');
      requestBody.append('quality', 'high');
      requestBody.append('output_format', 'png');
      requestBody.append('n', '1');
      delete axiosConfig.headers['Content-Type'];
    }

    addLog(`AI橡皮擦处理中: ${path.basename(inputPath)}`, 'INFO', 'Eraser');

    const response = await axios.post(endpoint, requestBody, axiosConfig);

    // 解析响应（兼容不同API格式）
    let b64Data;
    if (config.api.provider === 'zhipu') {
      b64Data = response.data.data[0].b64_json;
    } else {
      b64Data = response.data.data[0].b64_json;
    }

    const outputPath = inputPath.replace(/(\.\w+)$/, '_erased$1');
    fs.writeFileSync(outputPath, Buffer.from(b64Data, 'base64'));

    const outputDir = path.dirname(outputPath);
    addLog(`AI橡皮擦完成: ${path.basename(outputPath)}`, 'INFO', 'Eraser');
    return { success: true, outputPath, outputDir };
  } catch (error) {
    addLog(`AI橡皮擦失败: ${error.message}`, 'ERROR', 'Eraser');
    return { success: false, error: error.message };
  }
}

// AI橡皮擦批量处理：擦除多张图片并导出为PPT
async function aiEraserBatch(imagePaths, config) {
  try {
    const apiConfig = getApiConfig(config);

    if (!apiConfig.imageModel) {
      return { success: false, error: `当前API提供商不支持图片生成` };
    }

    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < imagePaths.length; i++) {
      addLog(`橡皮擦处理 ${i + 1}/${imagePaths.length}: ${path.basename(imagePaths[i])}`, 'INFO', 'EraserBatch');

      const result = await aiEraser(imagePaths[i], config);
      if (result.success) {
        results.push(result);
        successCount++;
      } else {
        failCount++;
      }
    }

    if (results.length === 0) {
      return { success: false, error: '所有图片处理失败' };
    }

    // 导出为PPT
    const PptxGenJS = require('pptxgenjs');
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_WIDE';

    for (const result of results) {
      const slide = pptx.addSlide();
      const imageBase64 = fs.readFileSync(result.outputPath).toString('base64');
      slide.addImage({
        data: `data:image/png;base64,${imageBase64}`,
        x: 0,
        y: 0,
        w: '100%',
        h: '100%'
      });
    }

    const outputDir = path.dirname(results[0].outputPath);
    const pptxPath = path.join(outputDir, `eraser_output_${Date.now()}.pptx`);
    await pptx.writeFile({ fileName: pptxPath });

    addLog(`AI橡皮擦批量完成: 成功${successCount}张, 失败${failCount}张`, 'INFO', 'EraserBatch');
    return {
      success: true,
      outputPath: pptxPath,
      outputDir,
      successCount,
      failCount,
      totalCount: imagePaths.length
    };
  } catch (error) {
    addLog(`AI橡皮擦批量失败: ${error.message}`, 'ERROR', 'EraserBatch');
    return { success: false, error: error.message };
  }
}

// ==================== 本地字体管理 ====================

function getFontsDirPath() {
  return path.join(app.getPath('userData'), 'fonts');
}

function ensureFontsDir() {
  const fontsDir = getFontsDirPath();
  if (!fs.existsSync(fontsDir)) {
    fs.mkdirSync(fontsDir, { recursive: true });
  }
}

// 获取已上传的字体列表
function getLocalFonts() {
  ensureFontsDir();
  const fontsDir = getFontsDirPath();
  const files = fs.readdirSync(fontsDir).filter(f => f.endsWith('.ttf') || f.endsWith('.otf') || f.endsWith('.woff'));
  return files.map(f => ({ name: path.basename(f, path.extname(f)), path: path.join(fontsDir, f) }));
}

// 上传字体
async function uploadFont(fontPath) {
  ensureFontsDir();
  const fontsDir = getFontsDirPath();
  const fileName = path.basename(fontPath);
  const destPath = path.join(fontsDir, fileName);
  fs.copyFileSync(fontPath, destPath);
  addLog(`字体上传成功: ${fileName}`, 'INFO', 'Font');
  return { success: true, name: path.basename(fileName, path.extname(fileName)), path: destPath };
}

// 删除字体
function deleteFont(fontName) {
  const fontsDir = getFontsDirPath();
  const fontPath = path.join(fontsDir, fontName);
  if (fs.existsSync(fontPath)) {
    fs.unlinkSync(fontPath);
    addLog(`字体删除成功: ${fontName}`, 'INFO', 'Font');
    return { success: true };
  }
  return { success: false, error: '字体不存在' };
}

// ==================== 百变拼图升级：竖排+快捷键 ====================
async function createCollageAdvanced(imagePaths, layout = '2x1', options = {}) {
  try {
    const [cols, rows] = layout.split('x').map(Number);
    const images = await Promise.all(imagePaths.map(p => sharp(p).metadata()));

    const cellWidth = Math.max(...images.map(i => i.width));
    const cellHeight = Math.max(...images.map(i => i.height));
    const totalWidth = cellWidth * cols;
    const totalHeight = cellHeight * rows;

    const composites = [];
    for (let i = 0; i < imagePaths.length && i < cols * rows; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);

      // 支持竖排模式
      let left = col * cellWidth;
      let top = row * cellHeight;

      if (options.verticalText) {
        // 竖排模式：每行一个字
        left = col * cellWidth;
        top = row * (cellHeight / rows);
      }

      composites.push({
        input: imagePaths[i],
        left: left,
        top: top
      });
    }

    const result = await sharp({
      create: {
        width: totalWidth,
        height: totalHeight,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    })
      .composite(composites)
      .png()
      .toBuffer();

    return result;
  } catch (error) {
    throw new Error(`拼图生成失败: ${error.message}`);
  }
}

// ==================== 背景换图：历史记录 ====================

function getBgHistoryFilePath() {
  return path.join(app.getPath('userData'), 'bg-history.json');
}

function getBgHistory() {
  try {
    const bgHistoryFile = getBgHistoryFilePath();
    if (fs.existsSync(bgHistoryFile)) {
      return JSON.parse(fs.readFileSync(bgHistoryFile, 'utf-8'));
    }
  } catch (e) {}
  return [];
}

function saveBgHistory(history) {
  const bgHistoryFile = getBgHistoryFilePath();
  fs.mkdirSync(path.dirname(bgHistoryFile), { recursive: true });
  fs.writeFileSync(bgHistoryFile, JSON.stringify(history, null, 2));
}

function addToBgHistory(imagePath) {
  const history = getBgHistory();
  const exists = history.find(h => h.path === imagePath);
  if (!exists) {
    history.unshift({ path: imagePath, name: path.basename(imagePath), addedAt: new Date().toISOString() });
    if (history.length > 20) history.pop(); // 最多保存20条
    saveBgHistory(history);
  }
  return history;
}

// ==================== PDF转视频升级：60页限制+默认2秒 ====================
async function pdfToVideoAdvanced(inputPath, durationPerPage = 2, maxPages = 60) {
  try {
    const outputDir = path.join(path.dirname(inputPath), 'pdf_video_output');
    fs.mkdirSync(outputDir, { recursive: true });

    // PDF转图片
    const imagesDir = path.join(outputDir, 'pages');
    fs.mkdirSync(imagesDir, { recursive: true });

    // 使用LibreOffice转换
    const libreOfficePath = await findLibreOffice();
    if (!libreOfficePath) {
      throw new Error('未找到LibreOffice，请先安装');
    }

    const cmd = `"${libreOfficePath}" --headless --convert-to png --outdir "${imagesDir}" "${inputPath}"`;
    await execPromise(cmd);

    // 限制页数
    let images = fs.readdirSync(imagesDir).filter(f => f.endsWith('.png')).sort();
    if (images.length > maxPages) {
      images = images.slice(0, maxPages);
      addLog(`PDF页数超过${maxPages}页，已截取前${maxPages}页`, 'WARN', 'PdfToVideo');
    }

    // 图片转视频
    const outputPath = path.join(outputDir, path.basename(inputPath, path.extname(inputPath)) + '.mp4');
    const inputList = images.map(img => `file '${path.join(imagesDir, img)}'`).join('\n');
    const listFile = path.join(imagesDir, 'filelist.txt');
    fs.writeFileSync(listFile, inputList);

    const ffmpegPath = require('ffmpeg-static');
    const videoCmd = `"${ffmpegPath}" -y -f concat -safe 0 -i "${listFile}" -vf "fps=1/${durationPerPage}" -c:v libx264 -pix_fmt yuv420p "${outputPath}"`;
    await execPromise(videoCmd);

    addLog(`PDF转视频完成: ${images.length}页, 每页${durationPerPage}秒`, 'INFO', 'PdfToVideo');
    return { success: true, outputPath, pageCount: images.length };
  } catch (error) {
    addLog(`PDF转视频失败: ${error.message}`, 'ERROR', 'PdfToVideo');
    return { success: false, error: error.message };
  }
}

// ==================== 视频绿幕换背景 ====================
async function videoGreenScreen(videoPath, backgroundPath) {
  try {
    const outputDir = path.join(path.dirname(videoPath), 'video_output');
    fs.mkdirSync(outputDir, { recursive: true });

    const outputPath = path.join(outputDir, path.basename(videoPath, path.extname(videoPath)) + '_bg.mp4');
    const ffmpegPath = require('ffmpeg-static');

    const cmd = `"${ffmpegPath}" -y -i "${videoPath}" -i "${backgroundPath}" -filter_complex "[0:v]chromakey=0x00FF00:0.3:0.2[fg];[1:v][fg]overlay=0:0:shortest=1" -c:v libx264 -pix_fmt yuv420p "${outputPath}"`;
    await execPromise(cmd);

    addLog('视频绿幕换背景完成', 'INFO', 'GreenScreen');
    return { success: true, outputPath };
  } catch (error) {
    addLog(`视频绿幕换背景失败: ${error.message}`, 'ERROR', 'GreenScreen');
    return { success: false, error: error.message };
  }
}

// ==================== 获取API提供商列表 ====================
function getApiProviders() {
  return API_PROVIDERS;
}

// 启动应用
startApp();
