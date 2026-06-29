<template>
  <div class="rewrite-page">
    <header class="rewrite-header">
      <div>
        <p class="eyebrow">二创重塑</p>
        <h2>文档上传后转成可编辑的教辅资料</h2>
        <p>支持 PDF、Word、PPT，按页码范围处理，可选择内容优化或模板替换，并导出图文分离 PPT/Word。</p>
      </div>
      <el-button v-if="uploadedFile" @click="clearFile">重新选择</el-button>
    </header>

    <section v-if="!uploadedFile" class="upload-panel">
      <el-upload
        drag
        :auto-upload="false"
        :on-change="handleFileUpload"
        accept=".pdf,.doc,.docx,.ppt,.pptx"
        :limit="1"
      >
        <el-icon :size="48"><Upload /></el-icon>
        <div class="el-upload__text">拖拽文件到这里，或 <em>点击选择</em></div>
        <div class="el-upload__tip">支持 PDF / Word / PPT，建议单个文件不超过 100MB</div>
      </el-upload>
    </section>

    <section v-else class="rewrite-grid">
      <div class="config-card">
        <div class="file-info">
          <el-icon><Document /></el-icon>
          <div>
            <strong>{{ uploadedFile.name }}</strong>
            <span>{{ uploadedFile.path }}</span>
          </div>
        </div>

        <el-form label-position="top">
          <el-form-item label="处理模式">
            <div class="mode-grid">
              <button
                v-for="item in modeOptions"
                :key="item.value"
                type="button"
                class="mode-card"
                :class="{ active: mode === item.value }"
                @click="mode = item.value"
              >
                <strong>{{ item.title }}</strong>
                <span>{{ item.description }}</span>
              </button>
            </div>
          </el-form-item>

          <div class="form-grid">
            <el-form-item label="页码范围">
              <el-input v-model="pageRange" placeholder="如 1-3,5；留空处理全部" />
            </el-form-item>
            <el-form-item label="生成尺寸">
              <el-select v-model="ratio">
                <el-option
                  v-for="option in ratioOptions"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="输出格式">
              <el-radio-group v-model="outputFormat">
                <el-radio-button label="pptx">图文分离 PPT</el-radio-button>
                <el-radio-button label="docx">图文分离 Word</el-radio-button>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="原页处理">
              <el-switch v-model="preserveOriginal" active-text="保留原版页面" inactive-text="仅输出二创结果" />
            </el-form-item>
          </div>

          <el-button type="primary" size="large" :loading="processing" @click="processRewrite">
            <el-icon><MagicStick /></el-icon>
            开始二创
          </el-button>
        </el-form>
      </div>

      <div class="flow-card">
        <h3>运行逻辑</h3>
        <el-steps direction="vertical" :active="activeStep" finish-status="success">
          <el-step v-for="step in steps" :key="step.key" :title="step.title" />
        </el-steps>
      </div>

      <div class="result-card">
        <h3>处理结果</h3>
        <div v-if="rewriteResult" class="result-success">
          <el-alert
            :title="`处理完成，共 ${rewriteResult.pageCount || 0} 页`"
            type="success"
            show-icon
            :closable="false"
          />
          <div class="result-actions">
            <el-button type="primary" @click="openResult">
              <el-icon><FolderOpened /></el-icon>
              打开结果目录
            </el-button>
            <el-button @click="saveToProjects">
              <el-icon><Collection /></el-icon>
              保存到作品集
            </el-button>
          </div>
        </div>
        <el-empty v-else description="还没有二创结果" />
      </div>

      <div class="history-card">
        <h3>二创历史</h3>
        <div v-if="history.length" class="history-list">
          <article v-for="record in history" :key="record.id" class="history-item">
            <strong>{{ record.name }}</strong>
            <span>{{ record.modeText }} · {{ record.outputFormat.toUpperCase() }} · {{ record.createdAt }}</span>
            <el-button size="small" text @click="openHistory(record)">打开</el-button>
          </article>
        </div>
        <el-empty v-else description="暂无历史记录" />
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  buildRewriteSteps,
  getRewriteModeMeta,
  getRewriteRatioOptions,
  normalizeRewriteRequest
} from '../utils/rewriteWorkflow.mjs'

const uploadedFile = ref(null)
const mode = ref('optimize')
const outputFormat = ref('pptx')
const pageRange = ref('')
const ratio = ref('2:3')
const preserveOriginal = ref(true)
const processing = ref(false)
const rewriteResult = ref(null)
const activeStep = ref(0)
const history = ref(loadHistory())

const modeOptions = computed(() => [
  { value: 'optimize', ...getRewriteModeMeta('optimize') },
  { value: 'replace', ...getRewriteModeMeta('replace') }
])
const ratioOptions = getRewriteRatioOptions()
const steps = computed(() => buildRewriteSteps({
  mode: mode.value,
  outputFormat: outputFormat.value,
  preserveOriginal: preserveOriginal.value
}))

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem('rewrite-history') || '[]')
  } catch {
    return []
  }
}

function saveHistory(records) {
  history.value = records.slice(0, 30)
  localStorage.setItem('rewrite-history', JSON.stringify(history.value))
}

function handleFileUpload(file) {
  if (file.size > 100 * 1024 * 1024) {
    ElMessage.error('文件大小不能超过 100MB')
    return
  }
  if (!file.raw?.path) {
    ElMessage.error('未获取到文件本地路径，请在桌面端重新选择文件')
    return
  }
  uploadedFile.value = file.raw
  rewriteResult.value = null
  activeStep.value = 0
}

function clearFile() {
  uploadedFile.value = null
  rewriteResult.value = null
  activeStep.value = 0
}

async function processRewrite() {
  try {
    const request = normalizeRewriteRequest({
      inputPath: uploadedFile.value?.path,
      mode: mode.value,
      outputFormat: outputFormat.value,
      pageRange: pageRange.value,
      ratio: ratio.value,
      preserveOriginal: preserveOriginal.value
    })

    processing.value = true
    rewriteResult.value = null
    activeStep.value = 1
    ElMessage.info('二创处理中，请稍等...')

    const result = await window.electronAPI.rewriteDocument(request)
    if (!result?.success) throw new Error(result?.error || '处理失败')

    activeStep.value = steps.value.length
    rewriteResult.value = { ...result, ...request }
    const record = {
      id: `${Date.now()}-${uploadedFile.value.name}`,
      name: uploadedFile.value.name,
      mode: mode.value,
      modeText: getRewriteModeMeta(mode.value).title,
      outputFormat: outputFormat.value,
      outputDir: result.outputDir,
      outputPath: result.outputPath,
      createdAt: new Date().toLocaleString()
    }
    saveHistory([record, ...history.value])
    ElMessage.success(`二创完成，共处理 ${result.pageCount || 0} 页`)
  } catch (error) {
    activeStep.value = 0
    ElMessage.error('二创失败：' + error.message)
  } finally {
    processing.value = false
  }
}

function openResult() {
  if (!rewriteResult.value?.outputDir) {
    ElMessage.warning('暂无可打开的结果目录')
    return
  }
  window.electronAPI.openFolder(rewriteResult.value.outputDir)
}

function openHistory(record) {
  if (!record.outputDir) {
    ElMessage.warning('这条记录没有结果目录')
    return
  }
  window.electronAPI.openFolder(record.outputDir)
}

async function saveToProjects() {
  if (!rewriteResult.value) return
  try {
    const result = await window.electronAPI.saveProject({
      name: `${uploadedFile.value.name} 二创结果`,
      description: `二创模式：${getRewriteModeMeta(mode.value).title}`,
      sourceImage: uploadedFile.value.path,
      generatedImage: rewriteResult.value.outputPath,
      prompt: `页码：${pageRange.value || '全部'}；比例：${ratio.value}`,
      style: getRewriteModeMeta(mode.value).title
    })
    if (!result?.success) throw new Error(result?.error || '保存失败')
    ElMessage.success('已保存到作品集')
  } catch (error) {
    ElMessage.error('保存失败：' + error.message)
  }
}
</script>

<style lang="scss" scoped>
.rewrite-page {
  height: 100%;
  overflow: auto;
  padding: 22px;
  background: #f4f7fb;
}

.rewrite-header {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 16px;
  padding: 22px;
  border: 1px solid #dce6f2;
  border-radius: 10px;
  background: #fff;

  h2,
  p {
    margin: 0;
  }

  p:last-child {
    margin-top: 8px;
    color: #64748b;
  }
}

.eyebrow {
  color: #2563eb;
  font-weight: 700;
}

.upload-panel,
.config-card,
.flow-card,
.result-card,
.history-card {
  border: 1px solid #dce6f2;
  border-radius: 10px;
  background: #fff;
}

.upload-panel {
  padding: 60px;
}

.rewrite-grid {
  display: grid;
  grid-template-columns: minmax(520px, 1.15fr) minmax(300px, 0.85fr);
  gap: 16px;
}

.config-card,
.flow-card,
.result-card,
.history-card {
  padding: 18px;
}

.file-info {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 18px;
  padding: 12px;
  border-radius: 8px;
  background: #f8fbff;

  span {
    display: block;
    max-width: 620px;
    margin-top: 4px;
    color: #64748b;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.mode-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.mode-card {
  min-height: 112px;
  padding: 14px;
  text-align: left;
  border: 1px solid #dce6f2;
  border-radius: 8px;
  background: #f8fbff;
  cursor: pointer;

  strong,
  span {
    display: block;
  }

  strong {
    margin-bottom: 8px;
    color: #172033;
  }

  span {
    color: #64748b;
    line-height: 1.6;
  }
}

.mode-card.active {
  border-color: #2563eb;
  background: #eff6ff;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 14px;
}

.result-actions {
  display: flex;
  gap: 10px;
  margin-top: 14px;
  flex-wrap: wrap;
}

.history-list {
  display: grid;
  gap: 10px;
}

.history-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 6px 12px;
  padding: 12px;
  border: 1px solid #dce6f2;
  border-radius: 8px;
  background: #f8fbff;

  span {
    color: #64748b;
    font-size: 13px;
  }
}

@media (max-width: 1100px) {
  .rewrite-grid,
  .form-grid,
  .mode-grid {
    grid-template-columns: 1fr;
  }
}
</style>
