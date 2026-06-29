<template>
  <div class="template-library">
    <header class="library-header">
      <div>
        <p class="eyebrow">模板库</p>
        <h2>提示词、风格和版式模板</h2>
        <p>常用风格可以直接套到创作页；版式克隆先保留入口，后续接入参考图训练/克隆流程。</p>
      </div>
      <el-button type="primary" @click="loadTemplates">
        <el-icon><Refresh /></el-icon>
        刷新
      </el-button>
    </header>

    <el-tabs v-model="activeTab" class="library-tabs">
      <el-tab-pane label="内置提示词" name="builtin">
        <div class="template-grid">
          <article v-for="tpl in store.promptTemplates" :key="tpl.name" class="template-card">
            <h3>{{ tpl.name }}</h3>
            <p>{{ tpl.prompt }}</p>
            <el-button type="primary" plain @click="usePrompt(tpl.prompt)">套用到创作页</el-button>
          </article>
        </div>
      </el-tab-pane>

      <el-tab-pane label="我的模板" name="mine">
        <section class="template-form">
          <el-input v-model="newTemplateName" placeholder="模板名称，例如：英语短语重点页" />
          <el-input
            v-model="newTemplatePrompt"
            type="textarea"
            :rows="4"
            placeholder="写入可复用的提示词或风格说明"
          />
          <el-button type="primary" :disabled="!canSave" @click="saveTemplate">保存模板</el-button>
        </section>

        <div class="template-grid" v-if="templates.length">
          <article v-for="(tpl, index) in templates" :key="`${tpl.name}-${index}`" class="template-card">
            <h3>{{ tpl.name }}</h3>
            <el-tag v-if="tpl.type === 'layoutClone'" size="small" type="success">
              版式克隆 · {{ tpl.referenceImages?.length || 0 }} 张参考图
            </el-tag>
            <p>{{ tpl.prompt }}</p>
            <div class="template-actions">
              <el-button type="primary" plain @click="usePrompt(tpl.prompt)">套用</el-button>
              <el-button type="danger" plain @click="deleteTemplate(index)">删除</el-button>
            </div>
          </article>
        </div>
        <el-empty v-else description="还没有保存自己的模板" />
      </el-tab-pane>

      <el-tab-pane label="版式模板" name="layout">
        <section class="layout-clone-panel">
          <div class="layout-form">
            <el-input v-model="layoutName" placeholder="版式模板名称，例如：清爽英语短语页" />
            <el-select v-model="layoutRatio">
              <el-option label="小红书 3:4" value="3:4" />
              <el-option label="竖版 2:3" value="2:3" />
              <el-option label="方图 1:1" value="1:1" />
              <el-option label="手机长图 9:16" value="9:16" />
            </el-select>
            <el-input
              v-model="layoutStyleNote"
              type="textarea"
              :rows="4"
              placeholder="补充你想克隆的规律：白底、标题颜色、重点标注、分栏、边框、贴纸风格等"
            />
            <div class="layout-actions">
              <el-button @click="selectReferenceImages">
                <el-icon><Picture /></el-icon>
                选择参考图
              </el-button>
              <el-button :disabled="referenceImages.length < 3" :loading="layoutAnalyzeLoading" @click="analyzeReferenceLayout">
                <el-icon><MagicStick /></el-icon>
                AI分析参考图
              </el-button>
              <el-button type="primary" :disabled="!canSaveLayout" @click="saveLayoutTemplate">
                <el-icon><MagicStick /></el-icon>
                保存克隆模板
              </el-button>
            </div>
          </div>

          <div class="reference-preview" :class="{ empty: referenceImages.length === 0 }">
            <template v-if="referenceImages.length">
              <article v-for="image in referenceImages" :key="image" class="reference-card">
                <img :src="fileUrl(image)" :alt="image" />
                <span :title="image">{{ fileName(image) }}</span>
              </article>
            </template>
            <div v-else class="reference-empty">
              <el-icon :size="48"><Picture /></el-icon>
              <strong>上传 3-5 张参考图</strong>
              <p>系统会把版式规律、色彩和重点标注方式整理成可复用模板。</p>
            </div>
          </div>
        </section>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAppStore } from '../store/index.js'
import { createLayoutTemplateRecord } from '../utils/layoutTemplateWorkflow.mjs'

const emit = defineEmits(['use-prompt'])
const store = useAppStore()

const activeTab = ref('builtin')
const templates = ref([])
const newTemplateName = ref('')
const newTemplatePrompt = ref('')
const layoutName = ref('')
const layoutRatio = ref('3:4')
const layoutStyleNote = ref('')
const referenceImages = ref([])
const layoutAnalyzeLoading = ref(false)
const canSave = computed(() => newTemplateName.value.trim() && newTemplatePrompt.value.trim())
const canSaveLayout = computed(() => layoutName.value.trim() && referenceImages.value.length >= 3 && referenceImages.value.length <= 5)

async function loadTemplates() {
  try {
    const result = await window.electronAPI.getTemplates()
    templates.value = result?.templates || []
  } catch (error) {
    ElMessage.error('模板加载失败：' + error.message)
  }
}

async function saveTemplate() {
  if (!canSave.value) return
  try {
    const result = await window.electronAPI.saveTemplate({
      name: newTemplateName.value.trim(),
      prompt: newTemplatePrompt.value.trim()
    })
    if (!result?.success) throw new Error(result?.error || '保存失败')
    newTemplateName.value = ''
    newTemplatePrompt.value = ''
    await loadTemplates()
    ElMessage.success('模板已保存')
  } catch (error) {
    ElMessage.error('模板保存失败：' + error.message)
  }
}

async function selectReferenceImages() {
  try {
    const result = await window.electronAPI.openFileDialog({
      title: '选择 3-5 张版式参考图',
      buttonLabel: '选择参考图',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: '图片文件', extensions: ['jpg', 'jpeg', 'png', 'webp'] }
      ]
    })
    if (result?.canceled) return
    referenceImages.value = (result?.filePaths || []).slice(0, 5)
    if (referenceImages.value.length < 3) {
      ElMessage.warning('请至少选择 3 张参考图')
    }
  } catch (error) {
    ElMessage.error('选择参考图失败：' + error.message)
  }
}

async function saveLayoutTemplate() {
  try {
    const record = createLayoutTemplateRecord({
      name: layoutName.value,
      ratio: layoutRatio.value,
      styleNote: layoutStyleNote.value,
      referenceImages: referenceImages.value
    })
    const result = await window.electronAPI.saveTemplate(record)
    if (!result?.success) throw new Error(result?.error || '保存失败')
    layoutName.value = ''
    layoutStyleNote.value = ''
    referenceImages.value = []
    activeTab.value = 'mine'
    await loadTemplates()
    ElMessage.success('版式克隆模板已保存')
  } catch (error) {
    ElMessage.error('保存版式模板失败：' + error.message)
  }
}

async function analyzeReferenceLayout() {
  if (referenceImages.value.length < 3) {
    ElMessage.warning('请至少选择 3 张参考图')
    return
  }
  layoutAnalyzeLoading.value = true
  try {
    const result = await window.electronAPI.analyzeLayoutTemplate({
      imagePaths: referenceImages.value,
      note: layoutStyleNote.value
    })
    if (!result?.success) throw new Error(result?.error || '分析失败')
    layoutStyleNote.value = result.analysis
    ElMessage.success('参考图版式分析已填入说明')
  } catch (error) {
    ElMessage.error('参考图分析失败：' + error.message)
  } finally {
    layoutAnalyzeLoading.value = false
  }
}

async function deleteTemplate(index) {
  try {
    await ElMessageBox.confirm('确定删除这个模板吗？', '删除模板', { type: 'warning' })
    const result = await window.electronAPI.deleteTemplate({ index })
    if (!result?.success) throw new Error(result?.error || '删除失败')
    await loadTemplates()
    ElMessage.success('模板已删除')
  } catch (error) {
    if (error === 'cancel' || error === 'close') return
    ElMessage.error('删除失败：' + (error?.message || error))
  }
}

function usePrompt(prompt) {
  emit('use-prompt', prompt)
}

function fileUrl(imagePath) {
  return imagePath ? `file:///${imagePath.replace(/\\/g, '/')}` : ''
}

function fileName(imagePath) {
  return String(imagePath || '').split(/[\\/]/).pop()
}

onMounted(loadTemplates)
</script>

<style lang="scss" scoped>
.template-library {
  height: 100%;
  overflow: auto;
  padding: 22px;
  background: #f4f7fb;
}

.library-header {
  display: flex;
  justify-content: space-between;
  gap: 20px;
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

.library-tabs {
  padding: 16px;
  border: 1px solid #dce6f2;
  border-radius: 10px;
  background: #fff;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px;
}

.template-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 220px;
  padding: 18px;
  border: 1px solid #dce6f2;
  border-radius: 8px;
  background: #f8fbff;

  h3 {
    margin: 0;
    color: #172033;
  }

  p {
    flex: 1;
    margin: 0;
    color: #53627a;
    line-height: 1.7;
  }
}

.template-actions {
  display: flex;
  gap: 10px;
}

.template-form {
  display: grid;
  grid-template-columns: minmax(220px, 0.5fr) minmax(360px, 1fr) auto;
  gap: 12px;
  align-items: start;
  margin-bottom: 16px;
}

.layout-roadmap {
  display: grid;
  place-items: center;
  gap: 12px;
  min-height: 360px;
  text-align: center;
  color: #64748b;

  h3 {
    margin: 0;
    color: #172033;
  }

  p {
    max-width: 620px;
    margin: 0;
    line-height: 1.8;
  }
}

.layout-clone-panel {
  display: grid;
  grid-template-columns: minmax(320px, 420px) minmax(0, 1fr);
  gap: 18px;
}

.layout-form {
  display: grid;
  gap: 12px;
  align-content: start;
  padding: 16px;
  border: 1px solid #dce6f2;
  border-radius: 8px;
  background: #f8fbff;
}

.layout-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.reference-preview {
  min-height: 360px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
  padding: 16px;
  border: 1px dashed #b8c8dc;
  border-radius: 8px;
  background: #f8fafc;
}

.reference-preview.empty {
  display: grid;
  place-items: center;
}

.reference-card {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.reference-card img {
  width: 100%;
  aspect-ratio: 3 / 4;
  border: 1px solid #dce6f2;
  border-radius: 8px;
  object-fit: cover;
  background: #ffffff;
}

.reference-card span {
  overflow: hidden;
  color: #64748b;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.reference-empty {
  max-width: 360px;
  text-align: center;
  color: #64748b;
}

.reference-empty strong {
  display: block;
  margin-top: 8px;
  color: #172033;
}

.reference-empty p {
  line-height: 1.7;
}

@media (max-width: 980px) {
  .library-header,
  .template-form,
  .layout-clone-panel {
    display: block;
  }

  .template-form > * {
    margin-bottom: 12px;
  }
}
</style>
