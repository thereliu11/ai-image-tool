<template>
  <el-dialog
    v-model="visible"
    title="提示词模板管理"
    width="600px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div class="prompt-manager">
      <!-- 添加/编辑表单 -->
      <div class="add-form">
        <el-input
          v-model="editingName"
          placeholder="模板名称"
          style="width: 200px"
        />
        <el-input
          v-model="editingPrompt"
          type="textarea"
          :rows="2"
          placeholder="输入提示词内容..."
          style="flex: 1"
        />
        <el-button
          type="primary"
          @click="handleSaveTemplate"
          :disabled="!editingName || !editingPrompt"
        >
          {{ editingIndex >= 0 ? '更新' : '添加' }}
        </el-button>
        <el-button v-if="editingIndex >= 0" @click="resetEdit">取消</el-button>
      </div>

      <!-- 模板列表 -->
      <div class="template-list">
        <div
          v-for="(template, index) in templates"
          :key="index"
          class="template-item"
        >
          <div class="template-info">
            <span class="template-name">{{ template.name }}</span>
            <span class="template-prompt">{{ template.prompt }}</span>
          </div>
          <div class="template-actions">
            <el-button size="small" text @click="handleEdit(index)">
              <el-icon><Edit /></el-icon>
            </el-button>
            <el-button size="small" text type="danger" @click="handleDelete(index)">
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
        </div>
        <div v-if="templates.length === 0" class="empty-tip">
          暂无模板，请添加
        </div>
      </div>

      <!-- 导入/导出 -->
      <div class="import-export">
        <el-button @click="handleImport">
          <el-icon><Upload /></el-icon>
          导入模板
        </el-button>
        <el-button @click="handleExport">
          <el-icon><Download /></el-icon>
          导出模板
        </el-button>
      </div>
    </div>

    <template #footer>
      <el-button @click="handleClose">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useAppStore } from '../store/index.js'
import { ElMessage, ElMessageBox } from 'element-plus'

const props = defineProps({
  modelValue: Boolean
})

const emit = defineEmits(['update:modelValue'])

const store = useAppStore()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

// 本地模板数据
const templates = ref([])
const editingName = ref('')
const editingPrompt = ref('')
const editingIndex = ref(-1)

// 初始化时加载模板
watch(visible, (val) => {
  if (val) {
    templates.value = JSON.parse(JSON.stringify(store.promptTemplates))
  }
})

// 保存/更新模板
function handleSaveTemplate() {
  if (editingIndex.value >= 0) {
    // 更新现有模板
    templates.value[editingIndex.value] = {
      name: editingName.value,
      prompt: editingPrompt.value
    }
    ElMessage.success('模板更新成功')
  } else {
    // 添加新模板
    const exists = templates.value.some(t => t.name === editingName.value)
    if (exists) {
      ElMessage.warning('模板名称已存在')
      return
    }
    templates.value.push({
      name: editingName.value,
      prompt: editingPrompt.value
    })
    ElMessage.success('模板添加成功')
  }
  resetEdit()
}

// 编辑模板
function handleEdit(index) {
  editingIndex.value = index
  editingName.value = templates.value[index].name
  editingPrompt.value = templates.value[index].prompt
}

// 删除模板
async function handleDelete(index) {
  try {
    await ElMessageBox.confirm(
      `确定要删除模板"${templates.value[index].name}"吗？`,
      '确认删除',
      { type: 'warning' }
    )
    templates.value.splice(index, 1)
    if (editingIndex.value === index) {
      resetEdit()
    }
    ElMessage.success('模板删除成功')
  } catch {
    // 用户取消
  }
}

// 重置编辑状态
function resetEdit() {
  editingIndex.value = -1
  editingName.value = ''
  editingPrompt.value = ''
}

// 导入模板
async function handleImport() {
  try {
    const result = await window.electronAPI.openFileDialog({
      filters: [
        { name: 'JSON文件', extensions: ['json'] }
      ]
    })

    if (result.canceled) return

    const filePath = result.filePaths?.[0]
    if (!filePath) return

    const readResult = await window.electronAPI.readJsonFile({ filePath })
    if (!readResult.success) {
      ElMessage.error(readResult.error || '读取模板失败')
      return
    }

    const source = Array.isArray(readResult.data) ? readResult.data : readResult.data?.templates
    if (!Array.isArray(source)) {
      ElMessage.error('模板文件格式不正确，请导入模板数组或包含 templates 数组的 JSON')
      return
    }

    const imported = source
      .filter(item => item && typeof item.name === 'string' && typeof item.prompt === 'string')
      .map(item => ({ name: item.name.trim(), prompt: item.prompt.trim() }))
      .filter(item => item.name && item.prompt)

    if (imported.length === 0) {
      ElMessage.warning('没有找到可导入的模板')
      return
    }

    const existingNames = new Set(templates.value.map(item => item.name))
    const newTemplates = imported.filter(item => !existingNames.has(item.name))
    templates.value.push(...newTemplates)

    const skippedCount = imported.length - newTemplates.length
    ElMessage.success(`已导入 ${newTemplates.length} 个模板${skippedCount ? `，跳过 ${skippedCount} 个重名模板` : ''}`)
  } catch (error) {
    ElMessage.error('导入失败: ' + error.message)
  }
}

// 导出模板
async function handleExport() {
  try {
    const data = JSON.stringify(templates.value, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'prompt-templates.json'
    a.click()
    URL.revokeObjectURL(url)
    ElMessage.success('模板导出成功')
  } catch (error) {
    ElMessage.error('导出失败: ' + error.message)
  }
}

// 关闭对话框时同步回store
function handleClose() {
  store.promptTemplates = templates.value
  visible.value = false
}
</script>

<style lang="scss" scoped>
.prompt-manager {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.add-form {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
}

.template-list {
  max-height: 400px;
  overflow-y: auto;
}

.template-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  margin-bottom: 8px;

  &:hover {
    background: #f5f7fa;
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

  .template-actions {
    display: flex;
    gap: 4px;
    margin-left: 12px;
  }
}

.empty-tip {
  text-align: center;
  color: #909399;
  padding: 40px;
}

.import-export {
  display: flex;
  justify-content: center;
  gap: 12px;
  padding-top: 12px;
  border-top: 1px solid #ebeef5;
}
</style>
