import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAppStore = defineStore('app', () => {
  // ==================== 状态 ====================
  const goodsList = ref([])
  const currentFolderName = ref('')
  const currentFolderPath = ref('')
  const promptText = ref('')
  const progress = ref(0)
  const isGenerating = ref(false)
  const logs = ref([])
  const config = ref({
    api: {
      token: '',
      baseURL: 'https://api.openai.com/v1',
      provider: 'openai',
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
  })

  // 预览相关
  const previewVisible = ref(false)
  const previewIndex = ref(0)

  // 尺寸和分辨率选项
  const sizeOptions = [
    { label: '竖版 2:3 (推荐)', value: '1024x1536' },
    { label: '方图 1:1', value: '1024x1024' },
    { label: '横版 3:2', value: '1536x1024' },
    { label: '自动', value: 'auto' }
  ]
  const selectedSize = ref('1024x1536')

  const resolutionOptions = [
    { label: '1k (1024)', value: '1024' },
    { label: '2k (2048)', value: '2048' }
  ]
  const selectedResolution = ref('1024')

  // 提示词模板
  const promptTemplates = ref([
    {
      name: '清爽重点笔记风',
      prompt: '请重新绘制为清爽重点笔记风：白底为主，蓝色、绿色和黄色做重点标注，保留原图全部文字、题号、公式、表格和排版结构，适合小红书手机阅读，不添加无关装饰。'
    },
    {
      name: '小红书爆款教辅资料页风',
      prompt: '请重新绘制为小红书爆款教辅资料页风：页面明亮、边框清晰、重点区域用荧光笔和红笔圈画突出，信息密度高但不拥挤，文字内容必须准确完整。'
    },
    {
      name: '错题本订正风',
      prompt: '请重新绘制为错题本订正风：保留原题内容，加入适度红笔批注、错因提示、步骤拆解和答案区域，结构清楚，不能改动题目文字和公式。'
    },
    {
      name: '学霸笔记风',
      prompt: '请重新绘制为学霸笔记风：标题醒目，知识点分层，重点词句使用下划线、箭头、色块和小标签标注，整体整洁专业，保留原始内容。'
    },
    {
      name: '低年级童趣风',
      prompt: '请重新绘制为低年级童趣风：使用明快柔和的配色、圆角模块和少量可爱学习元素，文字大而清晰，适合小学低年级阅读，不影响原内容准确性。'
    },
    {
      name: '试卷封套风',
      prompt: '请重新绘制为试卷封套风：适合资料包封面或提优卷展示，标题强识别，留出清楚的年级、科目、单元、用途信息区域，画面干净有卖点。'
    },
    {
      name: '知识卡片风',
      prompt: '请重新绘制为知识卡片风：将内容整理成清楚的卡片分区，重点概念、例题、易错点、口诀分层展示，配色轻快，适合收藏和转发。'
    },
    {
      name: '考前冲刺资料风',
      prompt: '请重新绘制为考前冲刺资料风：强调必背、易错、提分、重点速记，使用红色和黄色突出紧迫感，结构清晰，内容完整准确。'
    }
  ])
  const selectedTemplate = ref('')

  // ==================== 计算属性 ====================
  const completedCount = computed(() => {
    return goodsList.value.filter(item => item.status === '已完成' || item.status === 'completed').length
  })

  const failedCount = computed(() => {
    return goodsList.value.filter(item => item.status === '失败' || item.status === 'failed').length
  })

  const pendingCount = computed(() => {
    return goodsList.value.filter(item => item.status === '待生成' || item.status === 'pending').length
  })

  const totalCount = computed(() => goodsList.value.length)

  const selectedItems = computed(() => {
    return goodsList.value.filter(item => item.selected)
  })

  // ==================== 方法 ====================
  function addLog(message, level = 'INFO', module = 'UI') {
    const time = new Date().toISOString().replace('T', ' ').substring(0, 19)
    const line = `[${time}] [${level}] [${module}] ${message}`
    logs.value.push(line)

    // 保持日志在合理范围内
    if (logs.value.length > 500) {
      logs.value = logs.value.slice(-300)
    }

    // 写入本地日志文件
    if (window.electronAPI && window.electronAPI.writeLog) {
      window.electronAPI.writeLog(line + '\n')
    }
  }

  function updateItemStatus(updatedItem) {
    const index = goodsList.value.findIndex(item => item.id === updatedItem.id)
    if (index !== -1) {
      goodsList.value[index] = { ...goodsList.value[index], ...updatedItem }
    }
  }

  function clearAll() {
    goodsList.value = []
    currentFolderName.value = ''
    currentFolderPath.value = ''
    progress.value = 0
    isGenerating.value = false
  }

  function selectAll() {
    goodsList.value.forEach(item => {
      item.selected = true
    })
  }

  function deselectAll() {
    goodsList.value.forEach(item => {
      item.selected = false
    })
  }

  function invertSelection() {
    goodsList.value.forEach(item => {
      item.selected = !item.selected
    })
  }

  return {
    // 状态
    goodsList,
    currentFolderName,
    currentFolderPath,
    promptText,
    progress,
    isGenerating,
    logs,
    config,
    previewVisible,
    previewIndex,
    sizeOptions,
    selectedSize,
    resolutionOptions,
    selectedResolution,
    promptTemplates,
    selectedTemplate,

    // 计算属性
    completedCount,
    failedCount,
    pendingCount,
    totalCount,
    selectedItems,

    // 方法
    addLog,
    updateItemStatus,
    clearAll,
    selectAll,
    deselectAll,
    invertSelection
  }
})
