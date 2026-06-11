<template>
  <el-dialog
    v-model="visible"
    title="🧰 百宝箱 - 创意工具箱"
    width="1000px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-tabs v-model="activeTab" type="border-card">
      <!-- 图片处理 -->
      <el-tab-pane label="🖼️ 图片处理" name="image">
        <!-- 预览区域 -->
        <div class="preview-section" v-if="previewBefore || previewAfter">
          <div class="preview-compare">
            <div class="preview-box" v-if="previewBefore">
              <h4>处理前</h4>
              <img :src="previewBefore" alt="处理前" @click="openPreview(previewBefore)" />
            </div>
            <div class="preview-arrow" v-if="previewBefore && previewAfter">→</div>
            <div class="preview-box" v-if="previewAfter">
              <h4>处理后</h4>
              <img :src="previewAfter" alt="处理后" @click="openPreview(previewAfter)" />
            </div>
          </div>
          <el-button size="small" @click="clearPreview" text>清除预览</el-button>
        </div>

        <div class="tool-section">
          <h3>1. 图片加水印</h3>
          <div class="tool-row">
            <el-input v-model="watermarkText" placeholder="输入水印文字" style="width: 300px" />
            <el-select v-model="watermarkPosition" placeholder="位置" style="width: 120px">
              <el-option label="右下角" value="bottom-right" />
              <el-option label="左下角" value="bottom-left" />
              <el-option label="居中" value="center" />
              <el-option label="右上角" value="top-right" />
              <el-option label="左上角" value="top-left" />
            </el-select>
            <el-slider v-model="watermarkOpacity" :min="1" :max="100" :format-tooltip="v => `${v}%`" style="width: 150px" />
            <el-button type="primary" @click="handleWatermark" :loading="processing">添加水印</el-button>
          </div>
        </div>

        <div class="tool-section">
          <h3>2. 图片压缩</h3>
          <div class="tool-row">
            <span>压缩质量：</span>
            <el-slider v-model="compressQuality" :min="10" :max="100" :format-tooltip="v => `${v}%`" style="width: 200px" />
            <el-button type="primary" @click="handleCompress" :loading="processing">压缩图片</el-button>
          </div>
        </div>

        <div class="tool-section">
          <h3>3. 百变拼图</h3>
          <div class="tool-row">
            <el-select v-model="collageLayout" placeholder="布局" style="width: 150px">
              <el-option label="2列横排" value="2x1" />
              <el-option label="2列竖排" value="1x2" />
              <el-option label="3列横排" value="3x1" />
              <el-option label="2x2网格" value="2x2" />
              <el-option label="3x3网格" value="3x3" />
            </el-select>
            <el-button type="primary" @click="handleCollage" :loading="processing">生成拼图</el-button>
          </div>
        </div>

        <div class="tool-section">
          <h3>4. 背景换图</h3>
          <div class="tool-row">
            <el-button @click="selectBgImage">选择背景图</el-button>
            <span v-if="bgImagePath" class="file-selected">✅ 已选择背景图</span>
            <el-button type="primary" @click="handleBgReplace" :loading="processing">换背景</el-button>
          </div>
          <div v-if="bgImagePath" class="bg-preview">
            <img :src="getFilePathSrc(bgImagePath)" alt="背景图" />
          </div>
        </div>
      </el-tab-pane>

      <!-- 视频处理 -->
      <el-tab-pane label="🎬 视频处理" name="video">
        <div class="tool-section">
          <h3>5. 图片转视频</h3>
          <div class="tool-row">
            <span>每张停留：</span>
            <el-input-number v-model="videoDuration" :min="1" :max="10" :step="0.5" />
            <span>秒</span>
            <el-button type="primary" @click="handleImagesToVideo" :loading="processing">生成视频</el-button>
          </div>
        </div>

        <div class="tool-section">
          <h3>6. 视频截取</h3>
          <div class="tool-row">
            <span>开始：</span>
            <el-input v-model="trimStart" placeholder="00:00:00" style="width: 120px" />
            <span>结束：</span>
            <el-input v-model="trimEnd" placeholder="00:00:05" style="width: 120px" />
            <el-button type="primary" @click="handleVideoTrim" :loading="processing">截取视频</el-button>
          </div>
        </div>

        <div class="tool-section">
          <h3>7. 视频添加移动水印</h3>
          <div class="tool-row">
            <el-input v-model="videoWatermarkText" placeholder="水印文字" style="width: 300px" />
            <el-select v-model="videoWatermarkPath" placeholder="移动轨迹" style="width: 150px">
              <el-option label="对角线" value="diagonal" />
              <el-option label="水平来回" value="horizontal" />
              <el-option label="垂直来回" value="vertical" />
            </el-select>
            <el-button type="primary" @click="handleVideoWatermark" :loading="processing">添加水印</el-button>
          </div>
        </div>

        <div class="tool-section">
          <h3>8. 视频换背景</h3>
          <div class="tool-row">
            <el-button @click="selectVideoBgImage">选择背景图</el-button>
            <span v-if="videoBgImagePath" class="file-selected">✅ 已选择背景图</span>
            <el-button type="primary" @click="handleVideoBgReplace" :loading="processing">换背景</el-button>
          </div>
        </div>

        <div class="tool-section">
          <h3>9. 视频转GIF</h3>
          <div class="tool-row">
            <span>宽度：</span>
            <el-input-number v-model="gifWidth" :min="200" :max="1920" :step="100" />
            <span>帧率：</span>
            <el-input-number v-model="gifFps" :min="5" :max="30" :step="1" />
            <el-button type="primary" @click="handleVideoToGif" :loading="processing">转GIF</el-button>
          </div>
        </div>
      </el-tab-pane>

      <!-- 文档处理 -->
      <el-tab-pane label="📄 文档处理" name="doc">
        <div class="tool-section">
          <h3>10. Word转PDF</h3>
          <div class="tool-row">
            <el-alert v-if="!libreOfficeInstalled" title="需要安装LibreOffice" type="warning" :closable="false" show-icon style="margin-right: 12px" />
            <el-button type="primary" @click="handleWordToPdf" :loading="processing" :disabled="!libreOfficeInstalled">Word转PDF</el-button>
          </div>
        </div>

        <div class="tool-section">
          <h3>11. PDF转图片</h3>
          <div class="tool-row">
            <el-button type="primary" @click="handlePdfToImages" :loading="processing">PDF转图片</el-button>
          </div>
        </div>

        <div class="tool-section">
          <h3>12. PDF转视频</h3>
          <div class="tool-row">
            <span>每页停留：</span>
            <el-input-number v-model="pdfPageDuration" :min="1" :max="10" :step="0.5" />
            <span>秒</span>
            <el-button type="primary" @click="handlePdfToVideo" :loading="processing">PDF转视频</el-button>
          </div>
        </div>
      </el-tab-pane>

      <!-- 魔法棒 -->
      <el-tab-pane label="✨ 魔法棒" name="magic">
        <div class="tool-section">
          <h3>智能提示词优化</h3>
          <p class="tip">输入简单的关键词或想法，AI自动优化为专业的绘图提示词</p>
          <el-input
            v-model="simplePrompt"
            type="textarea"
            :rows="3"
            placeholder="例如：端午节班会PPT，可爱风格"
          />
          <el-button type="primary" @click="handleOptimizePrompt" :loading="processing" style="margin-top: 12px">
            ✨ 魔法棒优化
          </el-button>
          <div v-if="optimizedPrompt" class="optimized-result">
            <h4>优化结果：</h4>
            <el-input
              v-model="optimizedPrompt"
              type="textarea"
              :rows="5"
              readonly
            />
            <el-button type="success" @click="copyOptimizedPrompt" style="margin-top: 8px">复制到提示词</el-button>
          </div>
        </div>
      </el-tab-pane>

      <!-- OCR导出 -->
      <el-tab-pane label="📝 OCR导出" name="ocr">
        <div class="tool-section">
          <h3>智能OCR导出</h3>
          <p class="tip">识别图片中的文字，导出为可编辑的PPT或Word文档</p>

          <div class="tool-row">
            <el-button type="primary" @click="handleOcrToPptx" :loading="processing">
              📊 导出为PPT（图文分离）
            </el-button>
            <el-button type="success" @click="handleOcrToDocx" :loading="processing">
              📄 导出为Word（图文分离）
            </el-button>
          </div>

          <div class="ocr-info" style="margin-top: 16px;">
            <el-alert title="功能说明" type="info" :closable="false" show-icon>
              <template #default>
                <ul style="margin: 0; padding-left: 20px;">
                  <li>支持中英文OCR识别</li>
                  <li>导出的PPT/Word中文字可直接编辑</li>
                  <li>图片作为背景保留，文字覆盖在上方</li>
                  <li>可选择多张图片批量导出</li>
                </ul>
              </template>
            </el-alert>
          </div>
        </div>

        <div class="tool-section">
          <h3>智能去字 / 提取底图</h3>
          <p class="tip">使用AI去除图片中的文字，保留纯净的背景图</p>

          <div class="tool-row">
            <el-button type="warning" @click="handleRemoveText" :loading="processing">
              🧹 智能去字（移除文字）
            </el-button>
            <el-button type="info" @click="handleExtractBackground" :loading="processing">
              🖼️ 提取底图（保留背景）
            </el-button>
          </div>

          <div class="ocr-info" style="margin-top: 16px;">
            <el-alert title="功能说明" type="warning" :closable="false" show-icon>
              <template #default>
                <ul style="margin: 0; padding-left: 20px;">
                  <li><b>智能去字</b>：移除所有文字，保留背景和装饰元素</li>
                  <li><b>提取底图</b>：只保留纯净背景，移除所有前景元素</li>
                  <li>需要配置API密钥（使用GPT Image 1.5）</li>
                  <li>适合制作模板、去水印等场景</li>
                </ul>
              </template>
            </el-alert>
          </div>
        </div>
      </el-tab-pane>

      <!-- AI橡皮擦 -->
      <el-tab-pane label="🧹 AI橡皮擦" name="eraser">
        <div class="tool-section">
          <h3>AI橡皮擦 - 擦除文字，保留底图</h3>
          <p class="tip">使用AI智能识别并擦除图片中的所有文字，保留纯净的背景底图，适合制作课件模板</p>

          <div class="tool-row">
            <el-button type="danger" @click="handleAiEraserSingle" :loading="processing" size="large">
              🧹 单张橡皮擦（擦除文字）
            </el-button>
            <el-button type="warning" @click="handleAiEraserBatch" :loading="processing" size="large">
              📊 批量橡皮擦 → 导出PPT
            </el-button>
          </div>

          <div class="eraser-info" style="margin-top: 16px;">
            <el-alert title="功能说明" type="warning" :closable="false" show-icon>
              <template #default>
                <ul style="margin: 0; padding-left: 20px;">
                  <li><b>单张橡皮擦</b>：选择一张图片，擦除所有文字，保留底图</li>
                  <li><b>批量橡皮擦</b>：选择多张图片，逐张擦除文字，最后导出为PPT</li>
                  <li>支持JPG/PNG等常见图片格式</li>
                  <li>字和图分离：文字被擦除，图形和背景保留</li>
                  <li>擦除后的文字区域用周围背景自然填充</li>
                  <li>需要配置API密钥（推荐使用OpenAI或智谱AI）</li>
                </ul>
              </template>
            </el-alert>
          </div>

          <div class="eraser-use-case" style="margin-top: 16px;">
            <el-alert title="典型使用场景" type="info" :closable="false" show-icon>
              <template #default>
                <ul style="margin: 0; padding-left: 20px;">
                  <li>课件制作：擦除模板中的示例文字，替换为自己的内容</li>
                  <li>PPT美化：去除背景图中的水印或多余文字</li>
                  <li>素材处理：获取纯净背景图用于二次创作</li>
                  <li>模板制作：批量处理图片，生成可编辑的PPT模板</li>
                </ul>
              </template>
            </el-alert>
          </div>
        </div>
      </el-tab-pane>

      <!-- 模板库 -->
      <el-tab-pane label="📚 模板库" name="templates">
        <div class="tool-section">
          <h3>风格克隆模板</h3>
          <p class="tip">保存常用的风格模板，下次直接调用</p>
          <div class="template-form">
            <el-input v-model="newTemplateName" placeholder="模板名称" style="width: 200px" />
            <el-input v-model="newTemplatePrompt" placeholder="提示词内容" style="flex: 1" />
            <el-button type="primary" @click="handleSaveTemplate" :disabled="!newTemplateName || !newTemplatePrompt">保存模板</el-button>
          </div>
          <div class="template-list">
            <div v-for="(tpl, index) in templates" :key="index" class="template-item">
              <div class="template-info">
                <span class="template-name">{{ tpl.name }}</span>
                <span class="template-prompt">{{ tpl.prompt }}</span>
              </div>
              <div class="template-actions">
                <el-button size="small" text @click="useTemplate(tpl)">使用</el-button>
                <el-button size="small" text type="danger" @click="handleDeleteTemplate(index)">删除</el-button>
              </div>
            </div>
            <div v-if="templates.length === 0" class="empty-tip">暂无模板</div>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <template #footer>
      <el-button @click="handleClose">关闭</el-button>
    </template>
  </el-dialog>

  <!-- 图片预览对话框 -->
  <el-dialog v-model="previewDialogVisible" title="图片预览" width="80%" destroy-on-close>
    <img :src="previewDialogSrc" style="width: 100%; object-fit: contain;" />
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useAppStore } from '../store/index.js'
import { ElMessage, ElMessageBox } from 'element-plus'

const props = defineProps({
  modelValue: Boolean
})

const emit = defineEmits(['update:modelValue', 'use-prompt'])

const store = useAppStore()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const activeTab = ref('image')
const processing = ref(false)
const libreOfficeInstalled = ref(false)

// 预览相关
const previewBefore = ref('')
const previewAfter = ref('')
const previewDialogVisible = ref(false)
const previewDialogSrc = ref('')

// 图片处理参数
const watermarkText = ref('AI教辅作图工具')
const watermarkPosition = ref('bottom-right')
const watermarkOpacity = ref(30)
const compressQuality = ref(80)
const collageLayout = ref('2x1')
const bgImagePath = ref('')

// 视频处理参数
const videoDuration = ref(2)
const trimStart = ref('00:00:00')
const trimEnd = ref('00:00:05')
const videoWatermarkText = ref('AI教辅')
const videoWatermarkPath = ref('diagonal')
const videoBgImagePath = ref('')
const gifWidth = ref(480)
const gifFps = ref(15)

// 文档处理参数
const pdfPageDuration = ref(3)

// 魔法棒参数
const simplePrompt = ref('')
const optimizedPrompt = ref('')

// 模板库参数
const templates = ref([])
const newTemplateName = ref('')
const newTemplatePrompt = ref('')

// 检查LibreOffice
const checkLibreOffice = async () => {
  try {
    const result = await window.electronAPI.checkLibreOffice()
    libreOfficeInstalled.value = result.installed
  } catch (err) {
    libreOfficeInstalled.value = false
  }
}

// 加载模板
const loadTemplates = async () => {
  try {
    const result = await window.electronAPI.getTemplates()
    if (result && result.templates) {
      templates.value = result.templates
    }
  } catch (err) {
    templates.value = []
  }
}

watch(visible, (val) => {
  if (val) {
    checkLibreOffice()
    loadTemplates()
    clearPreview()
  }
})

// 获取文件路径
const getFilePath = async (filters) => {
  const result = await window.electronAPI.openFileDialog({
    properties: ['openFile'],
    filters: filters || [
      { name: '图片文件', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'] }
    ]
  })
  if (result.canceled || !result.filePaths.length) return null
  return result.filePaths[0]
}

const getMultiFilePath = async (filters) => {
  const result = await window.electronAPI.openFileDialog({
    properties: ['openFile', 'multiSelections'],
    filters: filters || [
      { name: '图片文件', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'] }
    ]
  })
  if (result.canceled || !result.filePaths.length) return null
  return result.filePaths
}

const getSaveFolder = async () => {
  const result = await window.electronAPI.openFolderDialog()
  if (result.canceled || !result.filePaths.length) return null
  return result.filePaths[0]
}

// 预览相关函数
const getFilePathSrc = (filePath) => {
  if (filePath) {
    return `file:///${filePath.replace(/\\/g, '/')}`
  }
  return ''
}

const setPreviewBefore = (filePath) => {
  previewBefore.value = getFilePathSrc(filePath)
}

const setPreviewAfter = (filePath) => {
  previewAfter.value = getFilePathSrc(filePath)
}

const clearPreview = () => {
  previewBefore.value = ''
  previewAfter.value = ''
}

const openPreview = (src) => {
  previewDialogSrc.value = src
  previewDialogVisible.value = true
}

// ========== 图片处理 ==========
const handleWatermark = async () => {
  if (!watermarkText.value) return ElMessage.warning('请输入水印文字')
  const filePath = await getFilePath()
  if (!filePath) return
  setPreviewBefore(filePath)
  processing.value = true
  try {
    const result = await window.electronAPI.imageWatermark({
      inputPath: filePath,
      text: watermarkText.value,
      position: watermarkPosition.value,
      opacity: watermarkOpacity.value
    })
    if (result.success) {
      setPreviewAfter(result.outputPath)
      // 确认对话框
      try {
        await ElMessageBox.confirm(
          '水印已添加，是否打开文件夹查看？',
          '处理完成',
          { type: 'success', confirmButtonText: '打开文件夹', cancelButtonText: '关闭' }
        )
        window.electronAPI.openFolder(result.outputDir)
      } catch {
        // 用户点击关闭
      }
    } else {
      ElMessage.error(result.error)
    }
  } catch (err) {
    ElMessage.error('操作失败: ' + err.message)
  }
  processing.value = false
}

const handleCompress = async () => {
  const filePath = await getFilePath()
  if (!filePath) return
  setPreviewBefore(filePath)
  processing.value = true
  try {
    const result = await window.electronAPI.imageCompress({
      inputPath: filePath,
      quality: compressQuality.value
    })
    if (result.success) {
      setPreviewAfter(result.outputPath)
      try {
        await ElMessageBox.confirm(
          `压缩完成！原始: ${result.originalSize} → 压缩后: ${result.newSize}，是否打开文件夹查看？`,
          '处理完成',
          { type: 'success', confirmButtonText: '打开文件夹', cancelButtonText: '关闭' }
        )
        window.electronAPI.openFolder(result.outputDir)
      } catch {}
    } else {
      ElMessage.error(result.error)
    }
  } catch (err) {
    ElMessage.error('操作失败: ' + err.message)
  }
  processing.value = false
}

const handleCollage = async () => {
  const filePaths = await getMultiFilePath()
  if (!filePaths || filePaths.length < 2) return ElMessage.warning('请选择至少2张图片')
  processing.value = true
  try {
    const result = await window.electronAPI.imageCollage({
      imagePaths: filePaths,
      layout: collageLayout.value
    })
    if (result.success) {
      setPreviewAfter(result.outputPath)
      try {
        await ElMessageBox.confirm('拼图生成成功，是否打开文件夹查看？', '处理完成', { type: 'success' })
        window.electronAPI.openFolder(result.outputDir)
      } catch {}
    } else {
      ElMessage.error(result.error)
    }
  } catch (err) {
    ElMessage.error('操作失败: ' + err.message)
  }
  processing.value = false
}

const selectBgImage = async () => {
  const filePath = await getFilePath()
  if (filePath) {
    bgImagePath.value = filePath
    ElMessage.success('背景图已选择')
  }
}

const handleBgReplace = async () => {
  if (!bgImagePath.value) return ElMessage.warning('请先选择背景图')
  const filePath = await getFilePath()
  if (!filePath) return
  setPreviewBefore(filePath)
  processing.value = true
  try {
    const result = await window.electronAPI.imageBgReplace({
      foregroundPath: filePath,
      backgroundPath: bgImagePath.value
    })
    if (result.success) {
      setPreviewAfter(result.outputPath)
      ElMessage.success('背景替换成功！')
      window.electronAPI.openFolder(result.outputDir)
    } else {
      ElMessage.error(result.error)
    }
  } catch (err) {
    ElMessage.error('操作失败: ' + err.message)
  }
  processing.value = false
}

// ========== 视频处理 ==========
const handleImagesToVideo = async () => {
  const filePaths = await getMultiFilePath()
  if (!filePaths || filePaths.length < 1) return ElMessage.warning('请选择至少1张图片')
  processing.value = true
  try {
    const result = await window.electronAPI.videoCreate({
      imagePaths: filePaths,
      durationPerImage: videoDuration.value
    })
    if (result.success) {
      ElMessage.success('视频生成成功！')
      window.electronAPI.openFolder(result.outputDir)
    } else {
      ElMessage.error(result.error)
    }
  } catch (err) {
    ElMessage.error('操作失败: ' + err.message)
  }
  processing.value = false
}

const handleVideoTrim = async () => {
  const filePath = await getFilePath([{ name: '视频文件', extensions: ['mp4', 'avi', 'mov', 'mkv', 'webm'] }])
  if (!filePath) return
  processing.value = true
  try {
    const result = await window.electronAPI.videoTrim({
      inputPath: filePath,
      startTime: trimStart.value,
      endTime: trimEnd.value
    })
    if (result.success) {
      ElMessage.success('视频截取成功！')
      window.electronAPI.openFolder(result.outputDir)
    } else {
      ElMessage.error(result.error)
    }
  } catch (err) {
    ElMessage.error('操作失败: ' + err.message)
  }
  processing.value = false
}

const handleVideoWatermark = async () => {
  if (!videoWatermarkText.value) return ElMessage.warning('请输入水印文字')
  const filePath = await getFilePath([{ name: '视频文件', extensions: ['mp4', 'avi', 'mov', 'mkv', 'webm'] }])
  if (!filePath) return
  processing.value = true
  try {
    const result = await window.electronAPI.videoWatermark({
      inputPath: filePath,
      text: videoWatermarkText.value,
      path: videoWatermarkPath.value
    })
    if (result.success) {
      ElMessage.success('视频水印添加成功！')
      window.electronAPI.openFolder(result.outputDir)
    } else {
      ElMessage.error(result.error)
    }
  } catch (err) {
    ElMessage.error('操作失败: ' + err.message)
  }
  processing.value = false
}

const selectVideoBgImage = async () => {
  const filePath = await getFilePath()
  if (filePath) {
    videoBgImagePath.value = filePath
    ElMessage.success('背景图已选择')
  }
}

const handleVideoBgReplace = async () => {
  if (!videoBgImagePath.value) return ElMessage.warning('请先选择背景图')
  const filePath = await getFilePath([{ name: '视频文件', extensions: ['mp4', 'avi', 'mov', 'mkv', 'webm'] }])
  if (!filePath) return
  processing.value = true
  try {
    const result = await window.electronAPI.videoBgReplace({
      videoPath: filePath,
      backgroundPath: videoBgImagePath.value
    })
    if (result.success) {
      ElMessage.success('视频背景替换成功！')
      window.electronAPI.openFolder(result.outputDir)
    } else {
      ElMessage.error(result.error)
    }
  } catch (err) {
    ElMessage.error('操作失败: ' + err.message)
  }
  processing.value = false
}

const handleVideoToGif = async () => {
  const filePath = await getFilePath([{ name: '视频文件', extensions: ['mp4', 'avi', 'mov', 'mkv', 'webm'] }])
  if (!filePath) return
  processing.value = true
  try {
    const result = await window.electronAPI.videoToGif({
      inputPath: filePath,
      width: gifWidth.value,
      fps: gifFps.value
    })
    if (result.success) {
      ElMessage.success('GIF转换成功！')
      window.electronAPI.openFolder(result.outputDir)
    } else {
      ElMessage.error(result.error)
    }
  } catch (err) {
    ElMessage.error('操作失败: ' + err.message)
  }
  processing.value = false
}

// ========== 文档处理 ==========
const handleWordToPdf = async () => {
  const filePath = await getFilePath([{ name: 'Word文档', extensions: ['docx', 'doc'] }])
  if (!filePath) return
  processing.value = true
  try {
    const result = await window.electronAPI.docWordToPdf({ inputPath: filePath })
    if (result.success) {
      ElMessage.success('Word转PDF成功！')
      window.electronAPI.openFolder(result.outputDir)
    } else {
      ElMessage.error(result.error)
    }
  } catch (err) {
    ElMessage.error('操作失败: ' + err.message)
  }
  processing.value = false
}

const handlePdfToImages = async () => {
  const filePath = await getFilePath([{ name: 'PDF文件', extensions: ['pdf'] }])
  if (!filePath) return
  processing.value = true
  try {
    const result = await window.electronAPI.docPdfToImages({ inputPath: filePath })
    if (result.success) {
      ElMessage.success(`PDF转图片成功！共 ${result.pageCount} 页`)
      window.electronAPI.openFolder(result.outputDir)
    } else {
      ElMessage.error(result.error)
    }
  } catch (err) {
    ElMessage.error('操作失败: ' + err.message)
  }
  processing.value = false
}

const handlePdfToVideo = async () => {
  const filePath = await getFilePath([{ name: 'PDF文件', extensions: ['pdf'] }])
  if (!filePath) return
  processing.value = true
  try {
    const result = await window.electronAPI.docPdfToVideo({
      inputPath: filePath,
      durationPerPage: pdfPageDuration.value
    })
    if (result.success) {
      ElMessage.success('PDF转视频成功！')
      window.electronAPI.openFolder(result.outputDir)
    } else {
      ElMessage.error(result.error)
    }
  } catch (err) {
    ElMessage.error('操作失败: ' + err.message)
  }
  processing.value = false
}

// ========== 魔法棒 ==========
const handleOptimizePrompt = async () => {
  if (!simplePrompt.value) return ElMessage.warning('请输入简单的提示词')
  processing.value = true
  try {
    const result = await window.electronAPI.optimizePrompt({
      prompt: simplePrompt.value
    })
    if (result.success) {
      optimizedPrompt.value = result.optimized
      ElMessage.success('提示词优化完成！')
    } else {
      ElMessage.error(result.error)
    }
  } catch (err) {
    ElMessage.error('优化失败: ' + err.message)
  }
  processing.value = false
}

const copyOptimizedPrompt = () => {
  emit('use-prompt', optimizedPrompt.value)
  visible.value = false
  ElMessage.success('已复制到提示词输入框')
}

// ========== OCR导出 ==========
const handleOcrToPptx = async () => {
  const filePaths = await getMultiFilePath()
  if (!filePaths || filePaths.length === 0) return ElMessage.warning('请选择至少1张图片')
  processing.value = true
  try {
    ElMessage.info('正在OCR识别中，请稍候...')
    const result = await window.electronAPI.ocrToPptx({ imagePaths: filePaths })
    if (result.success) {
      ElMessage.success('OCR导出PPT成功！文字可直接编辑')
      window.electronAPI.openFolder(result.outputDir)
    } else {
      ElMessage.error(result.error)
    }
  } catch (err) {
    ElMessage.error('OCR导出失败: ' + err.message)
  }
  processing.value = false
}

const handleOcrToDocx = async () => {
  const filePaths = await getMultiFilePath()
  if (!filePaths || filePaths.length === 0) return ElMessage.warning('请选择至少1张图片')
  processing.value = true
  try {
    ElMessage.info('正在OCR识别中，请稍候...')
    const result = await window.electronAPI.ocrToDocx({ imagePaths: filePaths })
    if (result.success) {
      ElMessage.success('OCR导出Word成功！文字可直接编辑')
      window.electronAPI.openFolder(result.outputDir)
    } else {
      ElMessage.error(result.error)
    }
  } catch (err) {
    ElMessage.error('OCR导出失败: ' + err.message)
  }
  processing.value = false
}

// ========== 智能去字/提取底图 ==========
const handleRemoveText = async () => {
  const filePath = await getFilePath()
  if (!filePath) return
  setPreviewBefore(filePath)
  processing.value = true
  try {
    ElMessage.info('正在AI去字中，请稍候...')
    const result = await window.electronAPI.removeText({ imagePath: filePath })
    if (result.success) {
      setPreviewAfter(result.outputPath)
      ElMessage.success('智能去字成功！')
      window.electronAPI.openFolder(result.outputDir)
    } else {
      ElMessage.error(result.error)
    }
  } catch (err) {
    ElMessage.error('去字失败: ' + err.message)
  }
  processing.value = false
}

const handleExtractBackground = async () => {
  const filePath = await getFilePath()
  if (!filePath) return
  setPreviewBefore(filePath)
  processing.value = true
  try {
    ElMessage.info('正在AI提取底图，请稍候...')
    const result = await window.electronAPI.extractBackground({ imagePath: filePath })
    if (result.success) {
      setPreviewAfter(result.outputPath)
      ElMessage.success('底图提取成功！')
      window.electronAPI.openFolder(result.outputDir)
    } else {
      ElMessage.error(result.error)
    }
  } catch (err) {
    ElMessage.error('提取失败: ' + err.message)
  }
  processing.value = false
}

// ========== AI橡皮擦 ==========
const handleAiEraserSingle = async () => {
  const filePath = await getFilePath()
  if (!filePath) return
  setPreviewBefore(filePath)
  processing.value = true
  try {
    ElMessage.info('正在AI橡皮擦处理中，请稍候（可能需要1-2分钟）...')
    const result = await window.electronAPI.aiEraser({ imagePath: filePath })
    if (result.success) {
      setPreviewAfter(result.outputPath)
      ElMessage.success('AI橡皮擦完成！文字已擦除，底图已保留')
      window.electronAPI.openFolder(result.outputDir)
    } else {
      ElMessage.error(result.error)
    }
  } catch (err) {
    ElMessage.error('橡皮擦失败: ' + err.message)
  }
  processing.value = false
}

const handleAiEraserBatch = async () => {
  const filePaths = await getMultiFilePath()
  if (!filePaths || filePaths.length === 0) return ElMessage.warning('请选择至少1张图片')
  processing.value = true
  try {
    ElMessage.info(`正在批量处理 ${filePaths.length} 张图片，每张约1-2分钟，请耐心等待...`)
    const result = await window.electronAPI.aiEraserBatch({ imagePaths: filePaths })
    if (result.success) {
      ElMessage.success(`批量橡皮擦完成！成功${result.successCount}张，失败${result.failCount}张，已导出为PPT`)
      window.electronAPI.openFolder(result.outputDir)
    } else {
      ElMessage.error(result.error)
    }
  } catch (err) {
    ElMessage.error('批量橡皮擦失败: ' + err.message)
  }
  processing.value = false
}

// ========== 模板库 ==========
const handleSaveTemplate = async () => {
  if (!newTemplateName.value || !newTemplatePrompt.value) return
  try {
    const result = await window.electronAPI.saveTemplate({
      name: newTemplateName.value,
      prompt: newTemplatePrompt.value
    })
    if (result.success) {
      ElMessage.success('模板保存成功！')
      newTemplateName.value = ''
      newTemplatePrompt.value = ''
      loadTemplates()
    }
  } catch (err) {
    ElMessage.error('保存失败: ' + err.message)
  }
}

const handleDeleteTemplate = async (index) => {
  try {
    await ElMessageBox.confirm('确定要删除这个模板吗？', '确认删除', { type: 'warning' })
    const result = await window.electronAPI.deleteTemplate({ index })
    if (result.success) {
      ElMessage.success('模板已删除')
      loadTemplates()
    }
  } catch {
    // 用户取消
  }
}

const useTemplate = (tpl) => {
  emit('use-prompt', tpl.prompt)
  visible.value = false
  ElMessage.success('模板已应用到提示词')
}

const handleClose = () => {
  visible.value = false
}
</script>

<style lang="scss" scoped>
.preview-section {
  padding: 16px;
  margin-bottom: 16px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e7ed 100%);
  border-radius: 12px;
  border: 2px dashed #dcdfe6;

  .preview-compare {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 20px;
    margin-bottom: 12px;

    .preview-box {
      flex: 1;
      max-width: 45%;
      background: white;
      border-radius: 8px;
      padding: 12px;
      text-align: center;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

      h4 {
        margin: 0 0 8px 0;
        color: #303133;
        font-size: 14px;
      }

      img {
        max-width: 100%;
        max-height: 200px;
        border-radius: 4px;
        cursor: pointer;
        transition: transform 0.3s;

        &:hover {
          transform: scale(1.02);
        }
      }
    }

    .preview-arrow {
      font-size: 32px;
      color: #409eff;
      font-weight: bold;
    }
  }
}

.bg-preview {
  margin-top: 12px;
  text-align: center;

  img {
    max-width: 200px;
    max-height: 100px;
    border-radius: 4px;
    border: 1px solid #dcdfe6;
  }
}

.tool-section {
  padding: 16px;
  margin-bottom: 12px;
  background: #f5f7fa;
  border-radius: 8px;

  h3 {
    margin: 0 0 12px 0;
    color: #303133;
    font-size: 15px;
  }

  .tip {
    color: #909399;
    font-size: 13px;
    margin-bottom: 12px;
  }
}

.tool-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.file-selected {
  color: #67c23a;
  font-size: 13px;
}

.optimized-result {
  margin-top: 16px;
  padding: 12px;
  background: #f0f9eb;
  border-radius: 8px;
  border: 1px solid #e1f3d8;

  h4 {
    margin: 0 0 8px 0;
    color: #67c23a;
  }
}

.template-form {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.template-list {
  max-height: 300px;
  overflow-y: auto;
}

.template-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: white;
  border-radius: 6px;
  margin-bottom: 8px;
  border: 1px solid #ebeef5;

  &:hover {
    border-color: #409eff;
  }

  .template-info {
    flex: 1;
    overflow: hidden;

    .template-name {
      font-weight: 600;
      color: #303133;
      display: block;
      margin-bottom: 4px;
    }

    .template-prompt {
      font-size: 13px;
      color: #909399;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  }
}

.empty-tip {
  text-align: center;
  color: #909399;
  padding: 40px;
}
</style>
