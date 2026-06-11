<template>
  <el-drawer v-model="visible" title="✨ AI创作助手" size="400px" direction="rtl">
    <div class="ai-assistant">
      <div class="assistant-section">
        <h4>快速创作</h4>
        <el-button type="primary" block @click="quickAction('generate')">📝 一句话生成PPT</el-button>
        <el-button type="success" block @click="quickAction('outline')" style="margin-top: 8px">📋 生成大纲</el-button>
        <el-button type="warning" block @click="quickAction('xiaohongshu')" style="margin-top: 8px">📱 小红书图文</el-button>
      </div>

      <div class="assistant-section">
        <h4>AI优化</h4>
        <el-button block @click="quickAction('magic-wand')">✨ 魔法棒优化提示词</el-button>
        <el-button block @click="quickAction('rewrite')" style="margin-top: 8px">🔄 二创重塑</el-button>
      </div>

      <div class="assistant-section">
        <h4>工具箱</h4>
        <el-button block @click="quickAction('toolbox')">🧰 百宝箱</el-button>
        <el-button block @click="quickAction('ocr')" style="margin-top: 8px">📝 OCR提取文字</el-button>
        <el-button block @click="quickAction('eraser')" style="margin-top: 8px">🧹 AI橡皮擦</el-button>
      </div>

      <div class="assistant-section">
        <h4>最近使用</h4>
        <div class="recent-list">
          <div v-for="(item, index) in recentItems" :key="index" class="recent-item">
            <span>{{ item.name }}</span>
            <span class="recent-time">{{ item.time }}</span>
          </div>
          <div v-if="recentItems.length === 0" class="empty">暂无最近使用</div>
        </div>
      </div>
    </div>
  </el-drawer>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'

const props = defineProps({ modelValue: Boolean })
const emit = defineEmits(['update:modelValue', 'action'])

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const recentItems = ref([
  { name: '七年级英语Unit3', time: '2分钟前' },
  { name: '端午节主题班会', time: '1小时前' },
  { name: '安全教育PPT', time: '昨天' }
])

const quickAction = (action) => {
  emit('action', action)
  visible.value = false
}
</script>

<style lang="scss" scoped>
.ai-assistant { padding: 16px; }
.assistant-section { margin-bottom: 24px;
  h4 { margin-bottom: 12px; color: #1D4ED8; font-size: 14px; }
  .el-button { width: 100%; justify-content: flex-start; }
}
.recent-list {
  .recent-item { display: flex; justify-content: space-between; padding: 8px 12px; background: #f5f7fa; border-radius: 6px; margin-bottom: 8px; cursor: pointer;
    &:hover { background: #ecf5ff; }
    .recent-time { font-size: 12px; color: #999; }
  }
  .empty { text-align: center; color: #999; padding: 20px; }
}
</style>
