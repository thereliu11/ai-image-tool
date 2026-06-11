<template>
  <el-dialog v-model="visible" title="📝 大纲编辑器" width="900px" :close-on-click-modal="false">
    <div class="outline-editor">
      <div class="outline-header">
        <el-input v-model="outlineTitle" placeholder="输入主题，一键生成大纲" style="flex:1" />
        <el-button type="primary" @click="generateOutline" :loading="generating">
          <el-icon><MagicStick /></el-icon> 一键生成大纲
        </el-button>
      </div>

      <div class="outline-content" v-if="outlineItems.length > 0">
        <div class="outline-toolbar">
          <el-button-group>
            <el-button size="small" @click="changeViewMode('list')">📋 列表</el-button>
            <el-button size="small" @click="changeViewMode('split')"> ↔ 左右联动</el-button>
          </el-button-group>
          <el-button-group>
            <el-button size="small" :type="canvasRatio === '16:9' ? 'primary' : ''" @click="canvasRatio = '16:9'">16:9</el-button>
            <el-button size="small" :type="canvasRatio === '3:4' ? 'primary' : ''" @click="canvasRatio = '3:4'">3:4</el-button>
          </el-button-group>
        </div>

        <div class="outline-split" v-if="viewMode === 'split'">
          <div class="outline-left">
            <h4>大纲结构</h4>
            <div v-for="(item, index) in outlineItems" :key="index" class="outline-item">
              <el-input v-model="outlineItems[index]" placeholder="输入内容..." @input="updatePreview">
                <template #prepend>{{ index + 1 }}</template>
              </el-input>
              <el-button size="small" text type="danger" @click="removeItem(index)">
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
            <el-button size="small" @click="addItem">
              <el-icon><Plus /></el-icon> 添加
            </el-button>
          </div>
          <div class="outline-right">
            <h4>预览效果</h4>
            <div class="preview-canvas" :class="canvasRatio">
              <div v-for="(item, index) in outlineItems" :key="index" class="preview-item">
                <span class="item-num">{{ index + 1 }}.</span>
                <span class="item-text">{{ item }}</span>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="outline-list">
          <div v-for="(item, index) in outlineItems" :key="index" class="outline-item">
            <el-input v-model="outlineItems[index]" placeholder="输入内容..." />
            <el-button size="small" text type="danger" @click="removeItem(index)">
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
          <el-button size="small" @click="addItem">
            <el-icon><Plus /></el-icon> 添加
          </el-button>
        </div>
      </div>
    </div>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" @click="handleSave">应用到提示词</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAppStore } from '../store/index.js'
import { ElMessage } from 'element-plus'

const props = defineProps({ modelValue: Boolean })
const emit = defineEmits(['update:modelValue', 'apply-outline'])
const store = useAppStore()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const outlineTitle = ref('')
const outlineItems = ref([])
const generating = ref(false)
const viewMode = ref('list')
const canvasRatio = ref('16:9')

const generateOutline = async () => {
  if (!outlineTitle.value) return ElMessage.warning('请输入主题')
  generating.value = true
  try {
    const result = await window.electronAPI.optimizePrompt({
      prompt: `为"${outlineTitle.value}"生成一个教学大纲，包含5-8个要点，每个要点一行，用JSON数组格式返回，每个元素包含"title"字段`
    })
    if (result.success) {
      try {
        const data = JSON.parse(result.optimized)
        outlineItems.value = data.map(item => item.title || item)
      } catch {
        outlineItems.value = result.optimized.split('\n').filter(l => l.trim())
      }
    }
  } catch (err) {
    ElMessage.error('生成失败: ' + err.message)
  }
  generating.value = false
}

const addItem = () => outlineItems.value.push('')
const removeItem = (index) => outlineItems.value.splice(index, 1)
const changeViewMode = (mode) => viewMode.value = mode

const handleSave = () => {
  if (outlineItems.value.length === 0) return ElMessage.warning('请先生成大纲')
  const outlineText = outlineItems.value.map((item, i) => `${i+1}. ${item}`).join('\n')
  emit('apply-outline', outlineText)
  visible.value = false
  ElMessage.success('大纲已应用到提示词')
}

const handleClose = () => { visible.value = false }
</script>

<style lang="scss" scoped>
.outline-editor { min-height: 400px; }
.outline-header { display: flex; gap: 12px; margin-bottom: 16px; }
.outline-toolbar { display: flex; justify-content: space-between; margin-bottom: 12px; }
.outline-split { display: flex; gap: 20px; }
.outline-left, .outline-right { flex: 1; }
.outline-left h4, .outline-right h4 { margin-bottom: 12px; color: #303133; }
.outline-item { display: flex; gap: 8px; margin-bottom: 8px; align-items: center; }
.preview-canvas {
  background: #f5f7fa; border-radius: 8px; padding: 20px; min-height: 300px;
  &.16\:9 { aspect-ratio: 16/9; }
  &.3\:4 { aspect-ratio: 3/4; }
}
.preview-item { margin-bottom: 12px; .item-num { color: #1D4ED8; font-weight: bold; margin-right: 8px; } }
</style>
