<template>
  <div class="text-image-workbench">
    <header class="text-image-header">
      <div>
        <p class="eyebrow">文生图</p>
        <h2>从文字直接生成教辅封面和资料图</h2>
        <p>适合资料包封面、错题本订正页、知识卡片和课程宣传图。生成结果会自动进入统一历史。</p>
      </div>
      <div class="header-actions">
        <el-button @click="buildPrompt">
          <el-icon><MagicStick /></el-icon>
          生成提示词
        </el-button>
        <el-button type="primary" :loading="generating" @click="generateImage">
          <el-icon><Picture /></el-icon>
          AI 生图
        </el-button>
        <el-button :loading="importingMaterials" @click="importMaterials">
          <el-icon><Upload /></el-icon>
          导入素材
        </el-button>
        <el-button :disabled="!finalPrompt" @click="emit('use-prompt', finalPrompt)">
          送去创作页
        </el-button>
      </div>
    </header>

    <section class="workbench-grid">
      <aside class="form-panel">
        <el-form label-position="top">
          <div class="form-grid">
            <el-form-item label="模板">
              <el-select v-model="form.template">
                <el-option v-for="option in templateOptions" :key="option.value" :label="option.label" :value="option.value" />
              </el-select>
            </el-form-item>
            <el-form-item label="风格">
              <el-select v-model="form.style">
                <el-option v-for="style in styles" :key="style" :label="style" :value="style" />
              </el-select>
            </el-form-item>
            <el-form-item label="年级">
              <el-select v-model="form.grade">
                <el-option v-for="grade in grades" :key="grade" :label="grade" :value="grade" />
              </el-select>
            </el-form-item>
            <el-form-item label="科目">
              <el-select v-model="form.subject">
                <el-option v-for="subject in subjects" :key="subject" :label="subject" :value="subject" />
              </el-select>
            </el-form-item>
            <el-form-item label="比例">
              <el-select v-model="form.ratio">
                <el-option v-for="option in ratioOptions" :key="option.value" :label="option.label" :value="option.value" />
              </el-select>
            </el-form-item>
            <el-form-item label="质量">
              <el-select v-model="form.quality">
                <el-option label="low" value="low" />
                <el-option label="medium" value="medium" />
                <el-option label="high" value="high" />
              </el-select>
            </el-form-item>
          </div>
          <el-form-item label="主标题">
            <el-input v-model="form.title" placeholder="例如：四年级下册数学易错应用题" />
          </el-form-item>
          <el-form-item label="副标题">
            <el-input v-model="form.subtitle" placeholder="例如：抓住易错点，提升解题能力" />
          </el-form-item>
          <el-form-item label="内容要点">
            <el-input v-model="form.points" type="textarea" :rows="7" placeholder="每行一个要点" />
          </el-form-item>
        </el-form>

        <section class="batch-panel">
          <div class="section-head">
            <strong>批量素材</strong>
            <span>{{ materialFolderName || '未导入' }} · {{ materials.length }} 页</span>
          </div>
          <div class="batch-controls">
            <el-input
              v-model="materialPageRange"
              placeholder="PDF/文档页码，如 1-3,5，留空导入全部"
              clearable
            />
            <el-button :loading="importingMaterials" @click="importMaterials">
              <el-icon><Upload /></el-icon>
              导入
            </el-button>
          </div>
          <div class="batch-actions">
            <el-button :disabled="!materials.length" @click="planBatchTasks">
              <el-icon><Document /></el-icon>
              生成任务
            </el-button>
            <el-button :loading="extractingOcr" :disabled="!materials.length" @click="extractOcrAndPlanTasks">
              <el-icon><Reading /></el-icon>
              OCR生成任务
            </el-button>
            <el-button
              type="primary"
              :loading="batchGenerating"
              :disabled="!batchTasks.length"
              @click="runBatchGeneration"
            >
              <el-icon><VideoPlay /></el-icon>
              批量生图
            </el-button>
          </div>
          <div class="batch-summary" v-if="batchTasks.length">
            <span>总 {{ batchSummary.total }}</span>
            <span>待生成 {{ batchSummary.pending }}</span>
            <span>生成中 {{ batchSummary.running }}</span>
            <span>完成 {{ batchSummary.completed }}</span>
            <span>失败 {{ batchSummary.failed }}</span>
          </div>
          <div class="material-list" v-if="materials.length && !batchTasks.length">
            <button
              v-for="material in materials.slice(0, 8)"
              :key="material.referenceImage"
              type="button"
              class="material-row"
            >
              <img :src="fileUrl(material.referenceImage)" :alt="material.title" />
              <span :title="material.title">{{ material.title }}</span>
            </button>
            <p v-if="materials.length > 8" class="more-tip">还有 {{ materials.length - 8 }} 页，生成任务后可逐条查看。</p>
          </div>
          <div class="task-list" v-if="batchTasks.length">
            <button
              v-for="task in batchTasks"
              :key="task.id"
              type="button"
              class="task-row"
              :class="{ active: selectedBatchTaskId === task.id }"
              @click="selectBatchTask(task)"
            >
              <span class="task-page">第 {{ task.pageNumber }} 页</span>
              <span class="task-title" :title="task.title">{{ task.title }}</span>
              <el-tag size="small" :type="statusType(task.status)">{{ statusLabel(task.status) }}</el-tag>
            </button>
          </div>
        </section>
      </aside>

      <main class="prompt-panel">
        <div class="section-head">
          <strong>提示词</strong>
          <el-button size="small" :disabled="!finalPrompt" @click="copyPrompt">复制</el-button>
        </div>
        <div class="selected-task-card" v-if="selectedBatchTask">
          <strong>{{ selectedBatchTask.title }}</strong>
          <span>批量任务 · {{ statusLabel(selectedBatchTask.status) }}</span>
        </div>
        <el-input v-model="finalPrompt" type="textarea" :rows="18" placeholder="点击生成提示词，或直接在这里粘贴完整提示词" />
        <div class="prompt-tips">
          <span>尺寸 {{ currentRatio.size }}</span>
          <span>{{ form.template }} · {{ form.style }}</span>
        </div>
      </main>

      <aside class="result-panel">
        <div class="section-head">
          <strong>生成结果</strong>
          <el-button size="small" :disabled="!previewResultImage" @click="openResultFolder">打开位置</el-button>
        </div>
        <div class="result-preview">
          <img v-if="previewResultImage" :src="fileUrl(previewResultImage)" :alt="previewResultTitle" />
          <div v-else class="empty-result">
            <el-icon :size="58"><Picture /></el-icon>
            <p>暂无生成结果</p>
          </div>
        </div>
        <div class="result-meta" v-if="lastResult || selectedBatchTask">
          <strong>{{ previewResultTitle }}</strong>
          <span v-if="lastResult">{{ lastResult.provider }} · {{ lastResult.model }}</span>
          <span v-if="previewResultImage">{{ previewResultImage }}</span>
          <span v-else-if="selectedBatchTask?.error">{{ selectedBatchTask.error }}</span>
        </div>
      </aside>
    </section>
  </div>
</template>

<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  buildTextImagePrompt,
  createOcrTextImageTasks,
  createTextImageBatchTasks,
  getTextImageRatioOptions,
  getTextImageTemplateOptions,
  normalizeTextImageRequest,
  summarizeTextImageTasks
} from '../utils/textToImageWorkflow.mjs'
import { createGeneratedHistoryRecord } from '../utils/taskHistory.mjs'

const props = defineProps({
  hasApiToken: {
    type: Boolean,
    default: false
  },
  redoRequest: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['history-record', 'open-settings', 'use-prompt'])

const templateOptions = getTextImageTemplateOptions()
const ratioOptions = getTextImageRatioOptions()
const styles = ['清爽重点笔记风', '小红书爆款风', '错题本订正风', '学霸笔记风', '低年级童趣风', '高级极简风', '手账插画风', '试卷封套风']
const grades = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级', '七年级', '八年级', '九年级', '高中']
const subjects = ['语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '道法']

const form = reactive({
  template: 'cover',
  style: '小红书爆款风',
  grade: '四年级',
  subject: '数学',
  ratio: '3:4',
  quality: 'medium',
  title: '四年级下册数学易错应用题',
  subtitle: '抓住易错点，提升解题能力',
  points: '先画图整理，再列式计算\n和差倍问题\n长方形面积应用\n单位换算与答题规范'
})

const finalPrompt = ref('')
const generating = ref(false)
const importingMaterials = ref(false)
const extractingOcr = ref(false)
const batchGenerating = ref(false)
const resultImage = ref('')
const resultDir = ref('')
const lastResult = ref(null)
const materials = ref([])
const materialFolderName = ref('')
const materialPageRange = ref('')
const batchTasks = ref([])
const selectedBatchTaskId = ref('')

const currentRatio = computed(() => ratioOptions.find(option => option.value === form.ratio) || ratioOptions[0])
const batchSummary = computed(() => summarizeTextImageTasks(batchTasks.value))
const selectedBatchTask = computed(() => batchTasks.value.find(task => task.id === selectedBatchTaskId.value) || null)
const previewResultImage = computed(() => selectedBatchTask.value ? selectedBatchTask.value.generatedImage : resultImage.value)
const previewResultTitle = computed(() => selectedBatchTask.value?.title || form.title)

function fileUrl(imagePath) {
  return imagePath ? `file:///${imagePath.replace(/\\/g, '/')}` : ''
}

function buildPrompt() {
  finalPrompt.value = buildTextImagePrompt(form)
  ElMessage.success('文生图提示词已生成')
}

async function copyPrompt() {
  await window.electronAPI.writeClipboardText(finalPrompt.value)
  ElMessage.success('提示词已复制')
}

async function generateImage() {
  if (!props.hasApiToken) {
    ElMessage.warning('请先配置 API Key')
    emit('open-settings')
    return
  }
  if (!finalPrompt.value.trim()) {
    buildPrompt()
  }

  let request
  try {
    request = normalizeTextImageRequest({
      prompt: finalPrompt.value,
      ratio: form.ratio,
      quality: form.quality,
      outputName: form.title
    })
  } catch (error) {
    ElMessage.warning(error.message)
    return
  }

  generating.value = true
  try {
    const result = await window.electronAPI.textToImageGenerate(request)
    if (!result.success) {
      ElMessage.error(result.error || '文生图失败')
      emit('history-record', createGeneratedHistoryRecord({
        type: 'textToImage',
        title: form.title,
        folderName: '文生图',
        status: 'failed',
        provider: result.provider || 'openai',
        model: result.model || 'gpt-image-2',
        mode: form.template,
        prompt: finalPrompt.value,
        error: result.error || '文生图失败',
        metadata: {
          ratio: form.ratio,
          quality: form.quality
        },
        taskId: `text-image-${Date.now()}`
      }))
      return
    }

    resultImage.value = result.outputPath
    resultDir.value = result.outputDir
    lastResult.value = result
    emit('history-record', createGeneratedHistoryRecord({
      type: 'textToImage',
      title: form.title,
      folderName: '文生图',
      generatedImage: result.outputPath,
      provider: result.provider,
      model: result.model,
      mode: form.template,
      prompt: finalPrompt.value,
      metadata: {
        ratio: form.ratio,
        quality: form.quality
      },
      taskId: `text-image-${Date.now()}`
    }))
    ElMessage.success('文生图生成完成')
  } catch (error) {
    ElMessage.error(`文生图失败：${error.message}`)
  } finally {
    generating.value = false
  }
}

function openResultFolder() {
  const imagePath = previewResultImage.value
  if (imagePath) {
    const folderPath = imagePath.replace(/[\\/][^\\/]+$/, '')
    window.electronAPI.openFolder(folderPath)
  }
}

async function importMaterials() {
  importingMaterials.value = true
  try {
    const result = await window.electronAPI.importMaterialFiles({
      pageRanges: materialPageRange.value
    })

    if (result?.canceled) return
    if (result?.error) {
      ElMessage.error(result.error)
      return
    }
    if (!Array.isArray(result?.goods) || result.goods.length === 0) {
      ElMessage.warning('没有导入到可用素材页')
      return
    }

    materials.value = result.goods
    materialFolderName.value = result.folderName || '导入素材'
    batchTasks.value = []
    selectedBatchTaskId.value = ''
    ElMessage.success(`已导入 ${result.goods.length} 页素材`)
  } catch (error) {
    ElMessage.error(`导入素材失败：${error.message}`)
  } finally {
    importingMaterials.value = false
  }
}

function planBatchTasks() {
  if (!materials.value.length) {
    ElMessage.warning('请先导入素材')
    return
  }

  batchTasks.value = createTextImageBatchTasks({
    materials: materials.value,
    pageRange: '',
    baseForm: { ...form },
    timestamp: Date.now()
  })
  if (batchTasks.value[0]) {
    selectBatchTask(batchTasks.value[0])
  }
  ElMessage.success(`已生成 ${batchTasks.value.length} 个文生图任务`)
}

function normalizeOcrResult(result) {
  if (!result?.success) return ''
  if (result.text) return result.text
  if (Array.isArray(result.words)) {
    return result.words.map(word => word.text).filter(Boolean).join(' ')
  }
  return ''
}

async function extractOcrAndPlanTasks() {
  if (!materials.value.length) {
    ElMessage.warning('请先导入素材')
    return
  }

  extractingOcr.value = true
  const enrichedMaterials = []
  try {
    for (const material of materials.value) {
      const result = await window.electronAPI.ocrExtractText({
        imagePath: material.referenceImage
      })
      enrichedMaterials.push({
        ...material,
        ocrText: normalizeOcrResult(result)
      })
    }

    materials.value = enrichedMaterials
    batchTasks.value = createOcrTextImageTasks({
      materials: enrichedMaterials,
      pageRange: '',
      baseForm: { ...form },
      timestamp: Date.now()
    })
    if (batchTasks.value[0]) {
      selectBatchTask(batchTasks.value[0])
    }
    ElMessage.success(`已根据 OCR 内容生成 ${batchTasks.value.length} 个任务`)
  } catch (error) {
    ElMessage.error(`OCR生成任务失败：${error.message}`)
  } finally {
    extractingOcr.value = false
  }
}

function selectBatchTask(task) {
  selectedBatchTaskId.value = task.id
  finalPrompt.value = task.prompt
  if (task.generatedImage) {
    resultImage.value = task.generatedImage
    resultDir.value = task.generatedImage.replace(/[\\/][^\\/]+$/, '')
  }
}

function updateBatchTask(taskId, patch) {
  batchTasks.value = batchTasks.value.map(task => (
    task.id === taskId
      ? { ...task, ...patch, updatedAt: Date.now() }
      : task
  ))
}

async function runBatchGeneration() {
  if (!props.hasApiToken) {
    ElMessage.warning('请先配置 API Key')
    emit('open-settings')
    return
  }
  if (!batchTasks.value.length) {
    planBatchTasks()
  }

  const runnableTasks = batchTasks.value.filter(task => task.status !== 'completed')
  if (!runnableTasks.length) {
    ElMessage.info('当前批量任务都已完成')
    return
  }

  batchGenerating.value = true
  try {
    for (const task of runnableTasks) {
      selectedBatchTaskId.value = task.id
      finalPrompt.value = task.prompt
      updateBatchTask(task.id, { status: 'running', error: '', generatedImage: '' })

      try {
        const request = normalizeTextImageRequest({
          prompt: task.prompt,
          ratio: form.ratio,
          quality: form.quality,
          outputName: task.title
        })
        const result = await window.electronAPI.textToImageGenerate(request)
        if (!result.success) {
          throw new Error(result.error || '文生图失败')
        }

        updateBatchTask(task.id, {
          status: 'completed',
          generatedImage: result.outputPath,
          error: ''
        })
        resultImage.value = result.outputPath
        resultDir.value = result.outputDir
        lastResult.value = result
        emit('history-record', createGeneratedHistoryRecord({
          type: 'textToImage',
          title: task.title,
          folderName: materialFolderName.value || '文生图批量',
          sourceImage: task.sourceImage,
          generatedImage: result.outputPath,
          provider: result.provider,
          model: result.model,
          mode: form.template,
          prompt: task.prompt,
          taskId: task.id,
          metadata: {
            pageNumber: task.pageNumber,
            ratio: form.ratio,
            quality: form.quality,
            ocrText: task.metadata?.ocrText || ''
          }
        }))
      } catch (error) {
        updateBatchTask(task.id, {
          status: 'failed',
          error: error.message || '文生图失败'
        })
        emit('history-record', createGeneratedHistoryRecord({
          type: 'textToImage',
          title: task.title,
          folderName: materialFolderName.value || '文生图批量',
          sourceImage: task.sourceImage,
          status: 'failed',
          provider: lastResult.value?.provider || 'openai',
          model: lastResult.value?.model || 'gpt-image-2',
          mode: form.template,
          prompt: task.prompt,
          error: error.message || '文生图失败',
        taskId: task.id,
        metadata: {
          pageNumber: task.pageNumber,
          ratio: form.ratio,
          quality: form.quality,
          ocrText: task.metadata?.ocrText || ''
        }
      }))
      }
    }
    ElMessage.success('批量文生图处理完成')
  } finally {
    batchGenerating.value = false
  }
}

function statusLabel(status) {
  if (status === 'running') return '生成中'
  if (status === 'completed') return '完成'
  if (status === 'failed') return '失败'
  return '待生成'
}

function statusType(status) {
  if (status === 'completed') return 'success'
  if (status === 'failed') return 'danger'
  if (status === 'running') return 'warning'
  return 'info'
}

async function applyRedoRequest(request) {
  if (!request || request.type !== 'textToImage') return
  selectedBatchTaskId.value = ''
  form.title = request.title || form.title
  if (request.mode && templateOptions.some(option => option.value === request.mode)) {
    form.template = request.mode
  }
  if (request.ratio) {
    form.ratio = request.ratio
  }
  if (request.quality) {
    form.quality = request.quality
  }
  finalPrompt.value = request.prompt || ''
  resultImage.value = ''
  lastResult.value = null
  await nextTick()
  await generateImage()
}

watch(() => props.redoRequest, request => {
  if (request) {
    applyRedoRequest(request)
  }
})
</script>

<style scoped>
.text-image-workbench {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: #f4f7fb;
  overflow: hidden;
}

.text-image-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 18px;
  padding: 16px 18px;
  background: #ffffff;
  border: 1px solid #dfe7f2;
  border-radius: 8px;
}

.eyebrow {
  margin: 0 0 4px;
  color: #2d6cdf;
  font-size: 13px;
  font-weight: 700;
}

.text-image-header h2 {
  margin: 0;
  color: #162033;
  font-size: 22px;
}

.text-image-header p:last-child {
  margin: 6px 0 0;
  color: #64748b;
}

.header-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.workbench-grid {
  min-height: 0;
  flex: 1;
  display: grid;
  grid-template-columns: 360px minmax(420px, 1fr) 440px;
  gap: 12px;
  overflow: hidden;
}

.form-panel,
.prompt-panel,
.result-panel {
  min-height: 0;
  background: #ffffff;
  border: 1px solid #dfe7f2;
  border-radius: 8px;
  overflow: auto;
}

.form-panel,
.prompt-panel {
  padding: 14px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 12px;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.prompt-tips {
  display: flex;
  gap: 10px;
  margin-top: 10px;
  color: #64748b;
}

.batch-panel {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid #e5edf6;
}

.batch-panel .section-head span {
  max-width: 170px;
  overflow: hidden;
  color: #64748b;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.batch-controls,
.batch-actions,
.batch-summary {
  display: flex;
  gap: 8px;
}

.batch-controls {
  align-items: center;
}

.batch-controls .el-input {
  min-width: 0;
}

.batch-actions {
  margin-top: 10px;
}

.batch-summary {
  flex-wrap: wrap;
  margin-top: 10px;
  color: #64748b;
  font-size: 12px;
}

.material-list,
.task-list {
  display: grid;
  gap: 8px;
  max-height: 260px;
  margin-top: 12px;
  overflow: auto;
}

.material-row,
.task-row {
  width: 100%;
  border: 1px solid #dfe7f2;
  border-radius: 8px;
  background: #f8fafc;
  cursor: pointer;
}

.material-row {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  padding: 8px;
  text-align: left;
}

.material-row img {
  width: 42px;
  height: 42px;
  border: 1px solid #e1e8f2;
  border-radius: 6px;
  object-fit: cover;
}

.material-row span,
.task-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.more-tip {
  margin: 0;
  color: #8a98aa;
  font-size: 12px;
}

.task-row {
  display: grid;
  grid-template-columns: 68px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  padding: 9px 10px;
  text-align: left;
}

.task-row:hover,
.task-row.active {
  border-color: #8db5ee;
  background: #edf5ff;
}

.task-page {
  color: #64748b;
  font-size: 12px;
}

.task-title {
  color: #172033;
  font-size: 13px;
  font-weight: 700;
}

.selected-task-card {
  display: grid;
  gap: 4px;
  margin-bottom: 10px;
  padding: 10px 12px;
  border: 1px solid #d8e7fb;
  border-radius: 8px;
  background: #f1f7ff;
}

.selected-task-card strong,
.selected-task-card span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.selected-task-card strong {
  color: #173a6a;
}

.selected-task-card span {
  color: #64748b;
  font-size: 12px;
}

.result-panel {
  display: flex;
  flex-direction: column;
  padding: 14px;
}

.result-preview {
  min-height: 0;
  flex: 1;
  display: grid;
  place-items: center;
  overflow: auto;
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
}

.result-preview img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.empty-result {
  color: #8a98aa;
  text-align: center;
}

.result-meta {
  display: grid;
  gap: 4px;
  margin-top: 12px;
  color: #64748b;
  font-size: 13px;
}

.result-meta strong {
  color: #172033;
  font-size: 15px;
}

@media (max-width: 1360px) {
  .workbench-grid {
    grid-template-columns: 320px minmax(360px, 1fr) 380px;
  }
}
</style>
