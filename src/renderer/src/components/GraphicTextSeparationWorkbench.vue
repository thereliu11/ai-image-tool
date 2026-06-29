<template>
  <div class="separation-workbench">
    <header class="separation-header">
      <div>
        <p class="eyebrow">图文分离</p>
        <h2>教辅图片图层化编辑工作台</h2>
        <p>导入图片后，可先 OCR 提取文字，再用遮罩、画笔和文本层做局部修正，最后导出图片、PPT 或 Word。</p>
      </div>
      <div class="header-actions">
        <el-button type="primary" @click="importImages">
          <el-icon><Picture /></el-icon>
          导入图片
        </el-button>
        <el-button :disabled="!activePage" :loading="processingAction === 'ocr'" @click="runOcrForActive">
          <el-icon><Document /></el-icon>
          OCR 提取文字
        </el-button>
        <el-button :disabled="!pages.length" :loading="processingAction === 'batchOcr'" @click="batchOcrSelectedPages">
          <el-icon><Document /></el-icon>
          批量分离
        </el-button>
        <el-button :disabled="!activePage" :loading="processingAction === 'removeText'" @click="removeTextForActive">
          <el-icon><Brush /></el-icon>
          智能去字
        </el-button>
        <el-button type="success" :disabled="!pages.length" :loading="processingAction === 'export'" @click="exportWorkspace">
          <el-icon><Download /></el-icon>
          导出
        </el-button>
      </div>
    </header>

    <section class="workspace-grid">
      <aside class="page-rail">
        <div class="rail-title">
          <el-checkbox :model-value="allSelected" :indeterminate="partlySelected" @change="toggleAllPages" />
          <strong>素材列表</strong>
          <span>{{ stats.total }} 页</span>
        </div>
        <div class="page-list" v-if="pages.length">
          <button
            v-for="(page, index) in pages"
            :key="page.id"
            type="button"
            class="page-item"
            :class="{ active: activePageId === page.id }"
            @click="setActivePage(page.id)"
          >
            <el-checkbox
              :model-value="selectedPageIds.includes(page.id)"
              @click.stop
              @change="checked => togglePageSelection(page.id, checked)"
            />
            <span class="page-index">{{ index + 1 }}</span>
            <img :src="fileUrl(page.imagePath)" :alt="page.name" />
            <div>
              <strong :title="page.name">{{ page.name }}</strong>
              <el-tag size="small" :type="statusTagType(page.status)">{{ statusLabel(page.status) }}</el-tag>
            </div>
          </button>
        </div>
        <el-empty v-else description="导入图片后开始图文分离" />
      </aside>

      <main class="canvas-panel">
        <div class="canvas-toolbar">
          <el-radio-group v-model="toolMode" size="small">
            <el-radio-button label="select">选择</el-radio-button>
            <el-radio-button label="text">文字</el-radio-button>
            <el-radio-button label="mask">白块</el-radio-button>
            <el-radio-button label="brush">画笔</el-radio-button>
            <el-radio-button label="region">识别区</el-radio-button>
          </el-radio-group>
          <div class="toolbar-actions">
            <el-button size="small" :disabled="!historyState.canUndo" @click="undoEdit">撤销</el-button>
            <el-button size="small" :disabled="!historyState.canRedo" @click="redoEdit">重做</el-button>
            <el-button size="small" :disabled="!activePage" @click="addTextAtDefault">加文字</el-button>
            <el-button size="small" :disabled="!activePage" @click="addMaskAtDefault">加白块</el-button>
            <el-button size="small" :disabled="!activePage" @click="addRecognitionRegionAtDefault">识别区</el-button>
            <el-button size="small" :disabled="!selectedLayer" @click="deleteSelectedLayer">删除图层</el-button>
          </div>
        </div>

        <div class="canvas-stage">
          <div
            v-if="activePage"
            class="image-frame"
            :class="{ 'region-tool': toolMode === 'region' }"
            ref="canvasRef"
            @click="handleCanvasClick"
            @pointerdown="startRegionDrag"
          >
            <img class="base-image" :src="fileUrl(activePage.imagePath)" :alt="activePage.name" draggable="false" />
            <button
              v-for="layer in visibleLayers"
              :key="layer.id"
              type="button"
              class="canvas-layer"
              :class="[`layer-${layer.type}`, { selected: selectedLayerId === layer.id, locked: layer.locked }]"
              :style="layerStyle(layer)"
              @click.stop="selectLayer(layer.id)"
              @pointerdown.stop="startLayerDrag($event, layer)"
            >
              <span v-if="layer.type === 'text'">{{ layer.text }}</span>
            </button>
            <button
              v-for="region in activeRegions"
              :key="region.id"
              type="button"
              class="recognition-region"
              :class="{ selected: selectedRegionId === region.id, excluded: region.excluded }"
              :style="regionStyle(region)"
              @click.stop="selectRegion(region.id)"
            >
              {{ region.excluded ? '排除' : '保留' }}
            </button>
            <div
              v-if="regionDraft"
              class="recognition-region region-draft"
              :style="regionStyle(regionDraft)"
            >
              识别区
            </div>
          </div>
          <div v-else class="canvas-empty">
            <el-icon :size="54"><Picture /></el-icon>
            <p>选择图片后可在这里叠加文字、白块和画笔</p>
          </div>
        </div>
      </main>

      <aside class="inspector">
        <section class="inspector-section">
          <div class="section-head">
            <strong>导出设置</strong>
            <span>{{ selectedPageIds.length }} 已勾选</span>
          </div>
          <el-form label-position="top">
            <el-form-item label="文件名">
              <el-input v-model="exportForm.outputName" placeholder="图文分离导出" />
            </el-form-item>
            <el-form-item label="格式">
              <el-segmented v-model="exportForm.format" :options="exportFormatOptions" />
            </el-form-item>
            <el-form-item label="页码范围">
              <el-input v-model="exportForm.pageRange" placeholder="如 1,3-5；留空导出全部" />
            </el-form-item>
            <el-checkbox v-model="exportForm.selectedOnly">只导出勾选页面</el-checkbox>
          </el-form>
        </section>

        <section class="inspector-section">
          <div class="section-head">
            <strong>字体</strong>
            <el-button size="small" text @click="uploadFont">上传</el-button>
          </div>
          <div class="font-row">
            <el-select v-model="fontChoice" filterable placeholder="选择字体">
              <el-option v-for="font in fontOptions" :key="font" :label="font" :value="font" />
            </el-select>
            <el-button :disabled="!fontChoice || !pages.length" @click="applyFontToAll">批量套用</el-button>
          </div>
        </section>

        <section class="inspector-section layer-section">
          <div class="section-head">
            <strong>图层</strong>
            <span>{{ activePage?.layers?.length || 0 }}</span>
          </div>
          <div class="layer-list" v-if="activePage?.layers?.length">
            <button
              v-for="layer in activePage.layers"
              :key="layer.id"
              type="button"
              class="layer-row"
              :class="{ active: selectedLayerId === layer.id }"
              @click="selectLayer(layer.id)"
            >
              <span>{{ layerTypeLabel(layer.type) }}</span>
              <strong>{{ layer.type === 'text' ? layer.text : `${Math.round(layer.width)} x ${Math.round(layer.height)}` }}</strong>
              <em>{{ layer.locked ? '锁定' : '' }}</em>
              <el-switch
                :model-value="layer.visible !== false"
                size="small"
                @click.stop
                @change="value => patchLayer(layer.id, { visible: value })"
              />
            </button>
          </div>
          <el-empty v-else description="暂无图层" :image-size="64" />
        </section>

        <section class="inspector-section region-section">
          <div class="section-head">
            <strong>识别区域</strong>
            <span>{{ activeRegions.length }}</span>
          </div>
          <div class="region-list" v-if="activeRegions.length">
            <button
              v-for="region in activeRegions"
              :key="region.id"
              type="button"
              class="region-row"
              :class="{ active: selectedRegionId === region.id }"
              @click="selectRegion(region.id)"
            >
              <strong>{{ region.text || '识别区域' }}</strong>
              <span>{{ Math.round(region.width) }} x {{ Math.round(region.height) }}</span>
              <el-switch
                :model-value="region.excluded"
                size="small"
                active-text="排除"
                inactive-text="保留"
                @click.stop
                @change="value => toggleRegionExcluded(region.id, value)"
              />
            </button>
          </div>
          <el-empty v-else description="可添加保留/排除识别区" :image-size="64" />
          <div class="region-actions" v-if="selectedRegionId">
            <el-button size="small" @click="nudgeSelectedRegion(0, -1)">上移</el-button>
            <el-button size="small" @click="nudgeSelectedRegion(-1, 0)">左移</el-button>
            <el-button size="small" @click="nudgeSelectedRegion(1, 0)">右移</el-button>
            <el-button size="small" @click="nudgeSelectedRegion(0, 1)">下移</el-button>
            <el-button size="small" type="danger" plain @click="deleteSelectedRegion">删除</el-button>
          </div>
        </section>

        <section class="inspector-section" v-if="selectedLayer">
          <div class="section-head">
            <strong>属性</strong>
            <div class="property-actions">
              <el-button size="small" text @click="duplicateSelectedLayer">复制</el-button>
              <el-button size="small" text @click="toggleSelectedLock">{{ selectedLayer.locked ? '解锁' : '锁定' }}</el-button>
              <el-button size="small" text type="danger" @click="deleteSelectedLayer">删除</el-button>
            </div>
          </div>

          <el-form label-position="top" class="property-form">
            <el-form-item v-if="selectedLayer.type === 'text'" label="文字内容">
              <el-input
                :model-value="selectedLayer.text"
                type="textarea"
                :rows="4"
                @update:model-value="value => patchSelectedLayer({ text: value })"
              />
            </el-form-item>
            <div class="property-grid">
              <el-form-item label="X">
                <el-input-number :model-value="selectedLayer.x" :min="0" :max="100" @change="value => patchSelectedLayer({ x: value })" />
              </el-form-item>
              <el-form-item label="Y">
                <el-input-number :model-value="selectedLayer.y" :min="0" :max="100" @change="value => patchSelectedLayer({ y: value })" />
              </el-form-item>
              <el-form-item label="宽">
                <el-input-number :model-value="selectedLayer.width" :min="1" :max="100" @change="value => patchSelectedLayer({ width: value })" />
              </el-form-item>
              <el-form-item label="高">
                <el-input-number :model-value="selectedLayer.height" :min="1" :max="100" @change="value => patchSelectedLayer({ height: value })" />
              </el-form-item>
            </div>
            <el-form-item label="旋转">
              <el-slider
                :model-value="selectedLayer.rotation || 0"
                :min="0"
                :max="359"
                :disabled="selectedLayer.locked"
                @update:model-value="value => patchSelectedLayer({ rotation: value })"
              />
            </el-form-item>

            <template v-if="selectedLayer.type === 'text'">
              <div class="property-grid">
                <el-form-item label="字号">
                  <el-input-number :model-value="selectedLayer.fontSize" :min="8" :max="96" @change="value => patchSelectedLayer({ fontSize: value })" />
                </el-form-item>
                <el-form-item label="颜色">
                  <el-color-picker :model-value="selectedLayer.color" @change="value => patchSelectedLayer({ color: value })" />
                </el-form-item>
              </div>
              <el-form-item label="字体">
                <el-select :model-value="selectedLayer.fontFamily" filterable @change="value => patchSelectedLayer({ fontFamily: value })">
                  <el-option v-for="font in fontOptions" :key="font" :label="font" :value="font" />
                </el-select>
              </el-form-item>
              <el-form-item label="对齐">
                <el-segmented
                  :model-value="selectedLayer.align"
                  :options="alignOptions"
                  @update:model-value="value => patchSelectedLayer({ align: value })"
                />
              </el-form-item>
            </template>

            <template v-else>
              <div class="property-grid">
                <el-form-item label="颜色">
                  <el-color-picker :model-value="selectedLayer.fill" @change="value => patchSelectedLayer({ fill: value })" />
                </el-form-item>
                <el-form-item label="透明度">
                  <el-input-number :model-value="selectedLayer.opacity" :min="1" :max="100" @change="value => patchSelectedLayer({ opacity: value })" />
                </el-form-item>
              </div>
            </template>

            <div class="nudge-grid">
              <el-button @click="nudgeSelected(0, -1)">上移</el-button>
              <el-button @click="nudgeSelected(-1, 0)">左移</el-button>
              <el-button @click="nudgeSelected(1, 0)">右移</el-button>
              <el-button @click="nudgeSelected(0, 1)">下移</el-button>
            </div>
          </el-form>
        </section>
      </aside>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  applyFontToTextLayers,
  buildSeparationExportPayload,
  createBrushLayer,
  createHistoryState,
  createMaskLayer,
  createSeparationPages,
  createTextLayer,
  duplicateLayer,
  getBatchSeparationCandidates,
  layersFromOcrResult,
  nudgeLayer,
  removeLayer,
  summarizeSeparationPages,
  toggleLayerLock,
  pushHistoryState,
  redoHistoryState,
  updateLayer,
  undoHistoryState,
  upsertLayer
} from '../utils/separationWorkspace.mjs'
import {
  createRecognitionRegion,
  createRecognitionRegionFromDrag,
  nudgeRecognitionRegion,
  toggleRecognitionRegion
} from '../utils/separationRegionWorkflow.mjs'

const pages = ref([])
const historyState = ref(createHistoryState([]))
const activePageId = ref('')
const selectedPageIds = ref([])
const selectedLayerId = ref('')
const selectedRegionId = ref('')
const toolMode = ref('select')
const canvasRef = ref(null)
const processingAction = ref('')
const fontChoice = ref('Microsoft YaHei')
const localFonts = ref([])
const dragState = ref(null)
const regionDragState = ref(null)
const regionDraft = ref(null)

const exportForm = reactive({
  outputName: '图文分离导出',
  format: 'pptx',
  pageRange: '',
  selectedOnly: false
})

const exportFormatOptions = [
  { label: '图片', value: 'images' },
  { label: 'PPT', value: 'pptx' },
  { label: 'Word', value: 'docx' },
  { label: 'PDF', value: 'pdf' }
]
const alignOptions = [
  { label: '左', value: 'left' },
  { label: '中', value: 'center' },
  { label: '右', value: 'right' }
]
const builtinFonts = ['Microsoft YaHei', 'SimSun', 'SimHei', 'KaiTi', 'FangSong']

const activePage = computed(() => pages.value.find(page => page.id === activePageId.value) || null)
const selectedLayer = computed(() => (activePage.value?.layers || []).find(layer => layer.id === selectedLayerId.value) || null)
const visibleLayers = computed(() => (activePage.value?.layers || []).filter(layer => layer.visible !== false))
const activeRegions = computed(() => activePage.value?.recognitionRegions || [])
const stats = computed(() => summarizeSeparationPages(pages.value))
const fontOptions = computed(() => {
  const uploaded = localFonts.value.map(font => font.name || font).filter(Boolean)
  return Array.from(new Set([...builtinFonts, ...uploaded]))
})
const allSelected = computed(() => pages.value.length > 0 && selectedPageIds.value.length === pages.value.length)
const partlySelected = computed(() => selectedPageIds.value.length > 0 && selectedPageIds.value.length < pages.value.length)

onMounted(loadFonts)

function fileUrl(imagePath) {
  return imagePath ? `file:///${imagePath.replace(/\\/g, '/')}` : ''
}

function setActivePage(pageId) {
  activePageId.value = pageId
  selectedLayerId.value = ''
  selectedRegionId.value = ''
}

function syncActiveAfterHistory() {
  if (!pages.value.length) {
    activePageId.value = ''
    selectedPageIds.value = []
    selectedLayerId.value = ''
    selectedRegionId.value = ''
    return
  }
  if (!pages.value.some(page => page.id === activePageId.value)) {
    activePageId.value = pages.value[0].id
  }
  selectedPageIds.value = selectedPageIds.value.filter(id => pages.value.some(page => page.id === id))
  if (!selectedPageIds.value.length) {
    selectedPageIds.value = pages.value.map(page => page.id)
  }
  if (selectedLayerId.value && !activePage.value?.layers?.some(layer => layer.id === selectedLayerId.value)) {
    selectedLayerId.value = ''
  }
  if (selectedRegionId.value && !activeRegions.value.some(region => region.id === selectedRegionId.value)) {
    selectedRegionId.value = ''
  }
}

function commitPages(nextPages) {
  historyState.value = pushHistoryState(historyState.value, nextPages)
  pages.value = historyState.value.present
  syncActiveAfterHistory()
}

function undoEdit() {
  historyState.value = undoHistoryState(historyState.value)
  pages.value = historyState.value.present
  syncActiveAfterHistory()
}

function redoEdit() {
  historyState.value = redoHistoryState(historyState.value)
  pages.value = historyState.value.present
  syncActiveAfterHistory()
}

function replacePage(nextPage) {
  commitPages(pages.value.map(page => page.id === nextPage.id ? nextPage : page))
}

function updateActivePage(patcher) {
  if (!activePage.value) return
  replacePage(patcher(activePage.value))
}

function selectLayer(layerId) {
  selectedLayerId.value = layerId
  selectedRegionId.value = ''
  toolMode.value = 'select'
}

function selectRegion(regionId) {
  selectedRegionId.value = regionId
  selectedLayerId.value = ''
  toolMode.value = 'select'
}

async function importImages() {
  const result = await window.electronAPI.openFileDialog({
    properties: ['openFile', 'multiSelections'],
    title: '导入需要图文分离的图片',
    filters: [
      { name: '图片文件', extensions: ['jpg', 'jpeg', 'png', 'webp'] }
    ]
  })
  if (result.canceled || !result.filePaths?.length) return

  const imported = createSeparationPages(result.filePaths)
  commitPages([...pages.value, ...imported])
  selectedPageIds.value = Array.from(new Set([...selectedPageIds.value, ...imported.map(page => page.id)]))
  activePageId.value = activePageId.value || imported[0].id
  if (exportForm.outputName === '图文分离导出') {
    exportForm.outputName = imported[0].name.replace(/\.[^.]+$/, '')
  }
  ElMessage.success(`已导入 ${imported.length} 张图片`)
}

function toggleAllPages(checked) {
  selectedPageIds.value = checked ? pages.value.map(page => page.id) : []
}

function togglePageSelection(pageId, checked) {
  selectedPageIds.value = checked
    ? Array.from(new Set([...selectedPageIds.value, pageId]))
    : selectedPageIds.value.filter(id => id !== pageId)
}

async function runOcrForActive() {
  if (!activePage.value) return
  processingAction.value = 'ocr'
  try {
    const result = await window.electronAPI.ocrExtractText({
      imagePath: activePage.value.imagePath,
      regions: activeRegions.value
    })
    if (!result.success) {
      ElMessage.error(result.error || 'OCR 提取失败')
      return
    }

    const layers = layersFromOcrResult(result)
    if (!layers.length) {
      ElMessage.warning('没有识别到可编辑文字')
      return
    }

    updateActivePage(page => ({
      ...page,
      status: 'ocr',
      layers: [...page.layers, ...layers],
      updatedAt: Date.now()
    }))
    selectedLayerId.value = layers[0].id
    ElMessage.success(`已提取 ${layers.length} 条文字`)
  } catch (error) {
    ElMessage.error(`OCR 失败：${error.message}`)
  } finally {
    processingAction.value = ''
  }
}

async function batchOcrSelectedPages() {
  const candidates = getBatchSeparationCandidates(pages.value, selectedPageIds.value)
  if (!candidates.length) {
    ElMessage.warning('没有可批量分离的待处理页面')
    return
  }

  processingAction.value = 'batchOcr'
  let nextPages = pages.value.map(page => ({ ...page, layers: [...(page.layers || [])] }))
  let successCount = 0
  let failedCount = 0

  try {
    for (const candidate of candidates) {
      const currentPage = nextPages.find(page => page.id === candidate.id)
      if (!currentPage) continue
      activePageId.value = currentPage.id

      try {
        const result = await window.electronAPI.ocrExtractText({
          imagePath: currentPage.imagePath,
          regions: currentPage.recognitionRegions || []
        })
        if (!result.success) {
          throw new Error(result.error || 'OCR 提取失败')
        }

        const layers = layersFromOcrResult(result)
        if (!layers.length) {
          throw new Error('没有识别到可编辑文字')
        }

        nextPages = nextPages.map(page => page.id === currentPage.id
          ? {
              ...page,
              status: 'ocr',
              layers: [...(page.layers || []), ...layers],
              error: '',
              updatedAt: Date.now()
            }
          : page)
        successCount += 1
      } catch (error) {
        nextPages = nextPages.map(page => page.id === currentPage.id
          ? {
              ...page,
              status: 'failed',
              error: error.message || '分离失败',
              updatedAt: Date.now()
            }
          : page)
        failedCount += 1
      }
    }

    commitPages(nextPages)
    if (successCount > 0) {
      ElMessage.success(`批量分离完成：成功 ${successCount} 页，失败 ${failedCount} 页`)
    } else {
      ElMessage.warning(`批量分离完成：成功 0 页，失败 ${failedCount} 页`)
    }
  } finally {
    processingAction.value = ''
  }
}

async function removeTextForActive() {
  if (!activePage.value) return
  processingAction.value = 'removeText'
  try {
    const result = await window.electronAPI.removeText({
      imagePath: activePage.value.imagePath,
      regions: activeRegions.value
    })
    if (!result.success) {
      ElMessage.error(result.error || '智能去字失败')
      return
    }
    updateActivePage(page => ({
      ...page,
      imagePath: result.outputPath,
      status: 'editing',
      updatedAt: Date.now()
    }))
    ElMessage.success('已替换为去字后的底图')
  } catch (error) {
    ElMessage.error(`智能去字失败：${error.message}`)
  } finally {
    processingAction.value = ''
  }
}

function addLayer(layer) {
  if (!activePage.value) return
  updateActivePage(page => upsertLayer(page, layer))
  selectedLayerId.value = layer.id
}

function addTextAtDefault() {
  addLayer(createTextLayer({ text: '补充文字', x: 12, y: 12, width: 45, height: 7, fontFamily: fontChoice.value }))
}

function addMaskAtDefault() {
  addLayer(createMaskLayer({ x: 22, y: 22, width: 28, height: 10 }))
}

function updateRegions(updater) {
  if (!activePage.value) return
  updateActivePage(page => ({
    ...page,
    status: page.status === 'completed' ? 'editing' : (page.status || 'editing'),
    recognitionRegions: updater(page.recognitionRegions || []),
    updatedAt: Date.now()
  }))
}

function addRecognitionRegionAtDefault() {
  if (!activePage.value) return
  const region = createRecognitionRegion({
    x: 18,
    y: 18,
    width: 36,
    height: 12,
    text: '重点识别区域'
  })
  updateRegions(regions => [...regions, region])
  selectRegion(region.id)
}

function toggleRegionExcluded(regionId, excluded) {
  updateRegions(regions => regions.map(region => (
    region.id === regionId ? toggleRecognitionRegion(region, excluded) : region
  )))
}

function nudgeSelectedRegion(dx, dy) {
  if (!selectedRegionId.value) return
  updateRegions(regions => regions.map(region => (
    region.id === selectedRegionId.value
      ? nudgeRecognitionRegion(region, { dx, dy })
      : region
  )))
}

function deleteSelectedRegion() {
  if (!selectedRegionId.value) return
  const regionId = selectedRegionId.value
  updateRegions(regions => regions.filter(region => region.id !== regionId))
  selectedRegionId.value = ''
}

function handleCanvasClick(event) {
  if (!activePage.value || toolMode.value === 'select' || toolMode.value === 'region') return
  const point = getCanvasPoint(event)
  if (!point) return

  if (toolMode.value === 'text') {
    addLayer(createTextLayer({ text: '补充文字', x: point.x, y: point.y, width: 36, height: 7, fontFamily: fontChoice.value }))
  } else if (toolMode.value === 'mask') {
    addLayer(createMaskLayer({ x: point.x, y: point.y, width: 22, height: 8 }))
  } else if (toolMode.value === 'brush') {
    addLayer(createBrushLayer({ x: point.x, y: point.y, size: 6 }))
  }
}

function createRegionFromPointer(start, end, state, isClick = false) {
  if (isClick) {
    return createRecognitionRegion({
      id: state.id,
      x: Math.max(0, Math.min(70, start.x)),
      y: Math.max(0, Math.min(88, start.y)),
      width: 30,
      height: 12,
      text: '重点识别区域'
    }, { now: state.now })
  }
  return createRecognitionRegionFromDrag(start, end, {
    id: state.id,
    now: state.now,
    text: '重点识别区域'
  })
}

function getCanvasPoint(event) {
  const rect = canvasRef.value?.getBoundingClientRect()
  if (!rect) return null
  return {
    x: Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100)),
    y: Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100))
  }
}

function startRegionDrag(event) {
  if (!activePage.value || toolMode.value !== 'region' || event.button !== 0) return
  const point = getCanvasPoint(event)
  if (!point) return

  const now = Date.now()
  const state = {
    start: point,
    now,
    id: `region-${now}`
  }
  regionDragState.value = state
  regionDraft.value = createRegionFromPointer(point, point, state, true)
  event.preventDefault()
  window.addEventListener('pointermove', moveRegionDrag)
  window.addEventListener('pointerup', stopRegionDrag, { once: true })
  window.addEventListener('pointercancel', cancelRegionDrag, { once: true })
}

function moveRegionDrag(event) {
  if (!regionDragState.value) return
  const point = getCanvasPoint(event)
  if (!point) return
  regionDraft.value = createRegionFromPointer(regionDragState.value.start, point, regionDragState.value)
}

function stopRegionDrag(event) {
  const state = regionDragState.value
  if (!state) return
  const point = getCanvasPoint(event) || state.start
  const isClick = Math.abs(point.x - state.start.x) < 1 && Math.abs(point.y - state.start.y) < 1
  const region = createRegionFromPointer(state.start, point, state, isClick)
  cancelRegionDrag()
  updateRegions(regions => [...regions, region])
  selectRegion(region.id)
}

function cancelRegionDrag() {
  regionDragState.value = null
  regionDraft.value = null
  window.removeEventListener('pointermove', moveRegionDrag)
  window.removeEventListener('pointerup', stopRegionDrag)
  window.removeEventListener('pointercancel', cancelRegionDrag)
}

function startLayerDrag(event, layer) {
  if (toolMode.value !== 'select') return
  if (layer.locked) {
    selectLayer(layer.id)
    ElMessage.info('图层已锁定，解锁后再移动')
    return
  }
  selectLayer(layer.id)
  const rect = canvasRef.value?.getBoundingClientRect()
  if (!rect) return

  dragState.value = {
    id: layer.id,
    startX: event.clientX,
    startY: event.clientY,
    layerX: layer.x,
    layerY: layer.y,
    canvasWidth: rect.width,
    canvasHeight: rect.height
  }
  window.addEventListener('pointermove', moveLayer)
  window.addEventListener('pointerup', stopLayerDrag, { once: true })
}

function moveLayer(event) {
  if (!dragState.value) return
  const dx = ((event.clientX - dragState.value.startX) / dragState.value.canvasWidth) * 100
  const dy = ((event.clientY - dragState.value.startY) / dragState.value.canvasHeight) * 100
  patchLayer(dragState.value.id, {
    x: Math.max(0, Math.min(100, dragState.value.layerX + dx)),
    y: Math.max(0, Math.min(100, dragState.value.layerY + dy))
  })
}

function stopLayerDrag() {
  dragState.value = null
  window.removeEventListener('pointermove', moveLayer)
}

function patchLayer(layerId, patch) {
  updateActivePage(page => updateLayer(page, layerId, patch))
}

function patchSelectedLayer(patch) {
  if (!selectedLayer.value) return
  patchLayer(selectedLayer.value.id, patch)
}

function duplicateSelectedLayer() {
  if (!selectedLayer.value || !activePage.value) return
  const nextPage = duplicateLayer(activePage.value, selectedLayer.value.id)
  replacePage(nextPage)
  selectedLayerId.value = nextPage.layers[nextPage.layers.length - 1]?.id || selectedLayer.value.id
}

function toggleSelectedLock() {
  if (!selectedLayer.value) return
  updateActivePage(page => toggleLayerLock(page, selectedLayer.value.id, !selectedLayer.value.locked))
}

function nudgeSelected(dx, dy) {
  if (!selectedLayer.value) return
  updateActivePage(page => nudgeLayer(page, selectedLayer.value.id, { dx, dy }))
}

function deleteSelectedLayer() {
  if (!selectedLayer.value) return
  const id = selectedLayer.value.id
  updateActivePage(page => removeLayer(page, id))
  selectedLayerId.value = ''
}

async function loadFonts() {
  try {
    const result = await window.electronAPI.getLocalFonts()
    localFonts.value = result.success ? result.fonts : []
  } catch {
    localFonts.value = []
  }
}

async function uploadFont() {
  const result = await window.electronAPI.openFileDialog({
    properties: ['openFile'],
    title: '上传字体文件',
    filters: [
      { name: '字体文件', extensions: ['ttf', 'otf', 'woff'] }
    ]
  })
  if (result.canceled || !result.filePaths?.length) return

  const uploadResult = await window.electronAPI.uploadFont({ fontPath: result.filePaths[0] })
  if (uploadResult.success) {
    fontChoice.value = uploadResult.name
    await loadFonts()
    ElMessage.success('字体已上传')
  } else {
    ElMessage.error(uploadResult.error || '字体上传失败')
  }
}

function applyFontToAll() {
  commitPages(applyFontToTextLayers(pages.value, fontChoice.value))
  ElMessage.success('已批量套用字体')
}

async function exportWorkspace() {
  const payload = buildSeparationExportPayload({
    pages: pages.value,
    selectedPageIds: selectedPageIds.value,
    selectedOnly: exportForm.selectedOnly,
    format: exportForm.format,
    pageRange: exportForm.pageRange,
    outputName: exportForm.outputName
  })

  if (!payload.pages.length) {
    ElMessage.warning('没有可导出的页面')
    return
  }

  processingAction.value = 'export'
  try {
    const result = await window.electronAPI.separationExport(payload)
    if (!result.success) {
      ElMessage.error(result.error || '导出失败')
      return
    }
    const exportedIds = new Set(payload.pages.map(page => page.id))
    commitPages(pages.value.map(page => exportedIds.has(page.id)
      ? { ...page, status: 'completed', updatedAt: Date.now() }
      : page))
    ElMessage.success('图文分离导出完成')
    if (result.outputDir) {
      window.electronAPI.openFolder(result.outputDir)
    }
  } catch (error) {
    ElMessage.error(`导出失败：${error.message}`)
  } finally {
    processingAction.value = ''
  }
}

function layerStyle(layer) {
  const base = {
    left: `${layer.x}%`,
    top: `${layer.y}%`,
    width: `${layer.width}%`,
    height: `${layer.height}%`,
    transform: `rotate(${layer.rotation || 0}deg)`
  }

  if (layer.type === 'text') {
    return {
      ...base,
      color: layer.color,
      fontFamily: layer.fontFamily,
      fontSize: `${layer.fontSize}px`,
      fontWeight: layer.fontWeight,
      textAlign: layer.align || 'left'
    }
  }

  return {
    ...base,
    background: layer.fill,
    opacity: (layer.opacity || 100) / 100,
    borderRadius: layer.radius === 999 ? '999px' : `${layer.radius || 0}px`
  }
}

function regionStyle(region) {
  return {
    left: `${region.x}%`,
    top: `${region.y}%`,
    width: `${region.width}%`,
    height: `${region.height}%`,
    transform: `rotate(${region.angle || 0}deg)`
  }
}

function layerTypeLabel(type) {
  const map = { text: '文字', mask: '白块', brush: '画笔' }
  return map[type] || '图层'
}

function statusLabel(status) {
  const map = {
    pending: '待处理',
    ocr: '已 OCR',
    editing: '编辑中',
    completed: '已完成',
    failed: '失败'
  }
  return map[status] || '待处理'
}

function statusTagType(status) {
  if (status === 'failed') return 'danger'
  if (status === 'completed') return 'success'
  if (status === 'ocr' || status === 'editing') return 'warning'
  return 'info'
}
</script>

<style scoped>
.separation-workbench {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: #f4f7fb;
  overflow: hidden;
}

.separation-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
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

.separation-header h2 {
  margin: 0;
  color: #162033;
  font-size: 22px;
}

.separation-header p:last-child {
  margin: 6px 0 0;
  color: #64748b;
}

.header-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.workspace-grid {
  min-height: 0;
  flex: 1;
  display: grid;
  grid-template-columns: 320px minmax(520px, 1fr) 360px;
  gap: 12px;
  overflow: hidden;
}

.page-rail,
.canvas-panel,
.inspector {
  min-height: 0;
  background: #ffffff;
  border: 1px solid #dfe7f2;
  border-radius: 8px;
  overflow: hidden;
}

.page-rail,
.inspector {
  display: flex;
  flex-direction: column;
}

.rail-title,
.section-head,
.canvas-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 14px;
  border-bottom: 1px solid #e7edf5;
}

.rail-title span,
.section-head span {
  color: #64748b;
  font-size: 13px;
}

.page-list {
  min-height: 0;
  flex: 1;
  overflow: auto;
}

.page-item {
  width: 100%;
  display: grid;
  grid-template-columns: 28px 28px 58px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  padding: 12px;
  border: 0;
  border-bottom: 1px solid #edf2f7;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.page-item.active {
  background: #eaf2ff;
}

.page-item img {
  width: 48px;
  height: 60px;
  object-fit: cover;
  border: 1px solid #dfe7f2;
  border-radius: 6px;
  background: #f8fafc;
}

.page-item strong {
  display: block;
  overflow: hidden;
  color: #182235;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.page-index {
  color: #73839b;
}

.canvas-panel {
  display: flex;
  flex-direction: column;
}

.toolbar-actions {
  display: flex;
  gap: 8px;
}

.canvas-stage {
  position: relative;
  min-height: 0;
  flex: 1;
  margin: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto;
  background:
    linear-gradient(45deg, #eef3fa 25%, transparent 25%),
    linear-gradient(-45deg, #eef3fa 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #eef3fa 75%),
    linear-gradient(-45deg, transparent 75%, #eef3fa 75%);
  background-color: #f8fafc;
  background-size: 28px 28px;
  background-position: 0 0, 0 14px, 14px -14px, -14px 0;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
}

.image-frame {
  position: relative;
  display: inline-flex;
  max-width: 100%;
  max-height: 100%;
}

.image-frame.region-tool {
  cursor: crosshair;
}

.base-image {
  display: block;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  pointer-events: none;
  user-select: none;
}

.canvas-layer {
  position: absolute;
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  padding: 2px;
  border: 1px dashed transparent;
  background: transparent;
  overflow: hidden;
  cursor: move;
  transform-origin: center center;
}

.canvas-layer.selected {
  border-color: #2d6cdf;
  box-shadow: 0 0 0 2px rgba(45, 108, 223, 0.16);
}

.canvas-layer.locked {
  cursor: not-allowed;
  border-style: solid;
  border-color: rgba(148, 163, 184, 0.75);
}

.recognition-region {
  position: absolute;
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  padding: 4px;
  border: 2px dashed #2d6cdf;
  background: rgba(45, 108, 223, 0.08);
  color: #1d4ed8;
  font-size: 12px;
  cursor: pointer;
  transform-origin: center center;
}

.recognition-region.excluded {
  border-color: #f56c6c;
  background: rgba(245, 108, 108, 0.08);
  color: #c2410c;
}

.recognition-region.selected {
  box-shadow: 0 0 0 3px rgba(45, 108, 223, 0.18);
}

.region-draft {
  pointer-events: none;
  border-style: dashed;
  background: rgba(45, 108, 223, 0.12);
}

.layer-text span {
  width: 100%;
  white-space: pre-wrap;
}

.canvas-empty {
  color: #8a98aa;
  text-align: center;
}

.inspector {
  overflow: auto;
}

.inspector-section {
  padding: 0 14px 14px;
  border-bottom: 1px solid #e7edf5;
}

.inspector-section .section-head {
  margin: 0 -14px 12px;
}

.font-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 86px;
  gap: 8px;
}

.layer-section {
  min-height: 180px;
}

.layer-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.layer-row {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) 42px 44px;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border: 1px solid #dfe7f2;
  border-radius: 6px;
  background: #f8fafc;
  cursor: pointer;
}

.layer-row.active {
  border-color: #2d6cdf;
  background: #eaf2ff;
}

.layer-row strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.layer-row em {
  color: #8a6d1d;
  font-size: 12px;
  font-style: normal;
}

.region-section {
  min-height: 160px;
}

.region-list,
.region-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.region-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: 10px;
}

.region-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 64px 82px;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border: 1px solid #dfe7f2;
  border-radius: 6px;
  background: #f8fafc;
  cursor: pointer;
  text-align: left;
}

.region-row.active {
  border-color: #2d6cdf;
  background: #eaf2ff;
}

.region-row strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.property-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.property-form :deep(.el-input-number) {
  width: 100%;
}

.property-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.nudge-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

@media (max-width: 1280px) {
  .workspace-grid {
    grid-template-columns: 280px minmax(420px, 1fr) 320px;
  }
}
</style>
