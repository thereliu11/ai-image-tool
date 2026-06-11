<template>
  <div class="waterfall-container">
    <div class="waterfall-header">
      <h3>📚 作品展示</h3>
      <div class="waterfall-actions">
        <el-button size="small" @click="refreshGrid">
          <el-icon><Refresh /></el-icon> 刷新
        </el-button>
      </div>
    </div>

    <div class="waterfall-grid">
      <div v-for="(item, index) in items" :key="item.id"
           class="waterfall-item"
           @mouseenter="hoveredItem = index"
           @mouseleave="hoveredItem = null">
        <div class="item-image">
          <img :src="item.image" v-if="item.image" @click="openPreview(item)" />
          <div v-else class="item-placeholder">
            <el-icon :size="48"><Picture /></el-icon>
          </div>
        </div>
        <div class="item-content">
          <h4 v-if="editingId !== item.id" @click="startEdit(item)">{{ item.title }}</h4>
          <el-input v-else v-model="item.title" @blur="stopEdit" @keyup.enter="stopEdit" size="small" />
          <p class="item-desc">{{ item.description }}</p>
          <div class="item-meta">
            <span class="item-date">{{ item.date }}</span>
            <span class="item-status" :class="item.status">{{ getStatusText(item.status) }}</span>
          </div>
        </div>
        <div class="item-actions" v-show="hoveredItem === index">
          <el-button size="small" text type="primary" @click.stop="regenerateItem(item)">
            <el-icon><Refresh /></el-icon> 重做文案
          </el-button>
          <el-button size="small" text type="success" @click.stop="generateImage(item)">
            <el-icon><Picture /></el-icon> 生成图片
          </el-button>
          <el-button size="small" text type="danger" @click.stop="deleteItem(item)">
            <el-icon><Delete /></el-icon>
          </el-button>
        </div>
      </div>
    </div>

    <div v-if="items.length === 0" class="empty-state">
      <el-icon :size="64"><Picture /></el-icon>
      <p>暂无作品，开始创作吧！</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const props = defineProps({
  items: { type: Array, default: () => [] }
})

const emit = defineEmits(['refresh', 'delete', 'regenerate', 'generate-image', 'preview'])

const hoveredItem = ref(null)
const editingId = ref(null)

const getStatusText = (status) => {
  const map = { draft: '草稿', published: '已发布', archived: '已归档' }
  return map[status] || status
}

const refreshGrid = () => emit('refresh')

const startEdit = (item) => { editingId.value = item.id }
const stopEdit = () => { editingId.value = null }

const regenerateItem = (item) => emit('regenerate', item)
const generateImage = (item) => emit('generate-image', item)
const openPreview = (item) => emit('preview', item)

const deleteItem = async (item) => {
  try {
    await ElMessageBox.confirm('确定删除此作品？', '确认', { type: 'warning' })
    emit('delete', item)
  } catch {}
}
</script>

<style lang="scss" scoped>
.waterfall-container { padding: 20px; }
.waterfall-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;
  h3 { color: #1D4ED8; margin: 0; }
}
.waterfall-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
.waterfall-item {
  background: white; border-radius: 12px; overflow: hidden;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08); transition: all 0.3s; position: relative;
  &:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(0,0,0,0.15);
    .item-actions { opacity: 1; }
  }
  .item-image { height: 200px; background: #f0f0f0; display: flex; align-items: center; justify-content: center;
    img { width: 100%; height: 100%; object-fit: cover; cursor: pointer; }
  }
  .item-placeholder { color: #ccc; }
  .item-content { padding: 16px;
    h4 { margin: 0 0 8px; color: #303133; cursor: pointer; &:hover { color: #1D4ED8; } }
    .item-desc { font-size: 13px; color: #666; margin: 0 0 8px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .item-meta { display: flex; justify-content: space-between; font-size: 12px; color: #999;
      .item-status { padding: 2px 8px; border-radius: 4px; &.draft { background: #fef0f0; color: #f56c6c; } &.published { background: #f0f9eb; color: #67c23a; } }
    }
  }
  .item-actions { position: absolute; bottom: 0; left: 0; right: 0; background: white; padding: 8px 12px; border-top: 1px solid #eee; display: flex; gap: 8px; opacity: 0; transition: opacity 0.3s; }
}
.empty-state { text-align: center; padding: 80px; color: #999; }
</style>
