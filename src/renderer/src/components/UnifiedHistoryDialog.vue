<template>
  <el-dialog
    :model-value="visible"
    title="统一历史记录"
    width="82vw"
    top="6vh"
    class="unified-history-dialog"
    @update:model-value="value => emit('update:visible', value)"
  >
    <div class="history-toolbar">
      <div>
        <strong>共 {{ filteredRecords.length }} 条</strong>
        <span>满意 {{ stats.satisfied }} · 需复查 {{ stats.review }} · 失败 {{ stats.failed }}</span>
      </div>
      <div class="toolbar-controls">
        <el-select v-model="typeFilter" size="small">
          <el-option label="全部类型" value="all" />
          <el-option label="参考图重绘" value="redraw" />
          <el-option label="文生图" value="textToImage" />
          <el-option label="二创" value="rewrite" />
          <el-option label="图文分离" value="separation" />
        </el-select>
        <el-select v-model="reviewFilter" size="small">
          <el-option label="全部状态" value="all" />
          <el-option label="满意" value="satisfied" />
          <el-option label="需复查" value="review" />
          <el-option label="失败" value="failed" />
        </el-select>
        <el-button size="small" type="danger" plain :disabled="!records.length" @click="emit('clear')">清空</el-button>
      </div>
    </div>

    <div class="history-scroll" v-if="filteredRecords.length">
      <article v-for="record in filteredRecords" :key="record.id" class="history-record">
        <button type="button" class="record-thumb" @click="emit('preview', record)">
          <img v-if="record.generatedImage || record.sourceImage" :src="fileUrl(record.generatedImage || record.sourceImage)" :alt="record.title" />
          <el-icon v-else :size="34"><Picture /></el-icon>
        </button>
        <div class="record-main">
          <div class="record-title-row">
            <strong :title="record.title">{{ record.title }}</strong>
            <el-tag size="small" :type="record.status === 'failed' ? 'danger' : 'success'">{{ statusLabel(record.status) }}</el-tag>
            <el-tag size="small" type="info">{{ typeLabel(record.type) }}</el-tag>
          </div>
          <p>{{ record.folderName }} · {{ record.provider }} · {{ record.model }} · {{ formatTime(record.updatedAt || record.createdAt) }}</p>
          <p class="record-prompt" :title="record.prompt">{{ record.prompt || record.error || '暂无提示词' }}</p>
        </div>
        <div class="record-actions">
          <el-button size="small" @click="emit('open', record)">位置</el-button>
          <el-button size="small" type="primary" @click="emit('redo', record)">重做</el-button>
          <el-button size="small" type="primary" plain @click="emit('reuse', record)">复用提示词</el-button>
          <el-button size="small" type="success" plain @click="emit('mark', record, 'satisfied')">满意</el-button>
          <el-button size="small" type="warning" plain @click="emit('mark', record, 'review')">复查</el-button>
          <el-button size="small" type="danger" plain @click="emit('delete', record)">删除</el-button>
        </div>
      </article>
    </div>
    <el-empty v-else description="暂无匹配历史记录" />
  </el-dialog>
</template>

<script setup>
import { computed, ref } from 'vue'
import { getTaskHistoryStats } from '../utils/taskHistory.mjs'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  records: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:visible', 'preview', 'open', 'mark', 'reuse', 'redo', 'delete', 'clear'])
const typeFilter = ref('all')
const reviewFilter = ref('all')

const filteredRecords = computed(() => props.records
  .filter(record => typeFilter.value === 'all' || record.type === typeFilter.value)
  .filter(record => {
    if (reviewFilter.value === 'all') return true
    if (reviewFilter.value === 'failed') return record.status === 'failed'
    return record.reviewStatus === reviewFilter.value
  }))

const stats = computed(() => getTaskHistoryStats(props.records))

function fileUrl(imagePath) {
  return imagePath ? `file:///${imagePath.replace(/\\/g, '/')}` : ''
}

function typeLabel(type) {
  const map = {
    redraw: '重绘',
    textToImage: '文生图',
    rewrite: '二创',
    separation: '图文分离'
  }
  return map[type] || '记录'
}

function statusLabel(status) {
  if (status === 'failed') return '失败'
  if (status === 'running') return '生成中'
  if (status === 'pending') return '待处理'
  return '已完成'
}

function formatTime(value) {
  if (!value) return ''
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}
</script>

<style scoped>
.history-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e5edf6;
}

.history-toolbar span {
  margin-left: 12px;
  color: #64748b;
}

.toolbar-controls {
  display: flex;
  gap: 8px;
}

.history-scroll {
  max-height: 68vh;
  padding: 12px 4px 0;
  overflow: auto;
}

.history-record {
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr) 320px;
  align-items: center;
  gap: 14px;
  padding: 12px;
  border: 1px solid #e1e8f2;
  border-radius: 8px;
  background: #ffffff;
}

.history-record + .history-record {
  margin-top: 10px;
}

.record-thumb {
  width: 88px;
  height: 88px;
  display: grid;
  place-items: center;
  border: 1px solid #dbe5f0;
  border-radius: 8px;
  background: #f8fafc;
  overflow: hidden;
  cursor: pointer;
}

.record-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.record-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.record-title-row strong {
  overflow: hidden;
  color: #172033;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.record-main p {
  margin: 6px 0 0;
  color: #64748b;
}

.record-prompt {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.record-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}
</style>
