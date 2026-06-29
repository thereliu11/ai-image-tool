<template>
  <div class="toolbox-page">
    <section class="toolbox-hero">
      <div>
        <p class="eyebrow">百宝箱工具台</p>
        <h2>把文档里的实用工具集中到一个入口</h2>
        <p class="hero-copy">
          图片、视频、文档转换、图文分离和创作增强都按场景归类；能直接调用的能力标为“已接入”，需要画布编辑器的能力标为“待升级”。
        </p>
      </div>
      <div class="hero-actions">
        <el-button type="primary" @click="$emit('open-toolbox')">
          <el-icon><Box /></el-icon>
          打开完整工具箱
        </el-button>
        <el-button @click="$emit('network-diagnosis')">
          <el-icon><Connection /></el-icon>
          网络诊断
        </el-button>
        <el-button @click="$emit('open-settings')">
          <el-icon><Setting /></el-icon>
          API 设置
        </el-button>
      </div>
    </section>

    <section class="stats-row">
      <div class="stat-card">
        <strong>{{ stats.total }}</strong>
        <span>文档功能</span>
      </div>
      <div class="stat-card ready">
        <strong>{{ stats.ready }}</strong>
        <span>已接入</span>
      </div>
      <div class="stat-card planned">
        <strong>{{ stats.planned }}</strong>
        <span>待升级</span>
      </div>
    </section>

    <el-tabs v-model="activeCategory" class="feature-tabs">
      <el-tab-pane
        v-for="category in categories"
        :key="category.name"
        :label="category.name"
        :name="category.name"
      >
        <div class="category-head">
          <div>
            <h3>{{ category.name }}</h3>
            <p>{{ category.description }}</p>
          </div>
        </div>

        <div class="feature-grid">
          <button
            v-for="feature in category.features"
            :key="feature.id"
            class="feature-card"
            :class="{ planned: feature.status === 'planned' }"
            @click="runFeature(feature)"
          >
            <span class="feature-status">{{ feature.status === 'ready' ? '已接入' : '待升级' }}</span>
            <strong>{{ feature.name }}</strong>
            <small>{{ feature.handler === 'local' ? '本地流程' : `调用 ${feature.handler}` }}</small>
          </button>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getFeatureCategories, getPrimaryFeatureStats } from '../utils/featureCatalog.mjs'

const emit = defineEmits(['open-toolbox', 'network-diagnosis', 'open-settings'])

const categories = getFeatureCategories()
const stats = getPrimaryFeatureStats()
const activeCategory = ref(categories[0]?.name || '创作增强')

function runFeature(feature) {
  if (feature.status === 'planned') {
    ElMessage.info('这个能力需要第二阶段的画布/区域编辑器，已先保留入口。')
    return
  }

  if (feature.handler === 'local') {
    ElMessage.info('这是本地流程能力，请到对应模块继续操作。')
    return
  }

  ElMessage.info('已打开完整工具箱，请在对应分类里执行该工具。')
  emit('open-toolbox')
}
</script>

<style lang="scss" scoped>
.toolbox-page {
  height: 100%;
  overflow: auto;
  padding: 22px;
  background: #f4f7fb;
}

.toolbox-hero {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  padding: 24px;
  border: 1px solid #dce6f2;
  border-radius: 10px;
  background: linear-gradient(135deg, #ffffff 0%, #eef6ff 100%);
}

.eyebrow {
  margin: 0 0 8px;
  color: #2563eb;
  font-weight: 700;
}

h2,
h3 {
  margin: 0;
  color: #172033;
}

.hero-copy {
  max-width: 760px;
  margin: 10px 0 0;
  color: #53627a;
  line-height: 1.7;
}

.hero-actions {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  flex-wrap: wrap;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin: 16px 0;
}

.stat-card {
  padding: 16px 18px;
  border-radius: 8px;
  border: 1px solid #dce6f2;
  background: #fff;

  strong {
    display: block;
    color: #172033;
    font-size: 28px;
  }

  span {
    color: #64748b;
  }
}

.stat-card.ready strong {
  color: #15803d;
}

.stat-card.planned strong {
  color: #b7791f;
}

.feature-tabs {
  border: 1px solid #dce6f2;
  border-radius: 10px;
  background: #fff;
  padding: 16px;
}

.category-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;

  p {
    margin: 8px 0 0;
    color: #64748b;
  }
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.feature-card {
  display: grid;
  gap: 8px;
  min-height: 118px;
  padding: 16px;
  text-align: left;
  border: 1px solid #dce6f2;
  border-radius: 8px;
  background: #f8fbff;
  cursor: pointer;

  &:hover {
    border-color: #3b82f6;
    box-shadow: 0 10px 24px rgba(37, 99, 235, 0.12);
  }

  strong {
    color: #172033;
    font-size: 17px;
  }

  small {
    color: #64748b;
  }
}

.feature-card.planned {
  background: #fffbeb;
  border-color: #f4d99b;
}

.feature-status {
  width: fit-content;
  padding: 4px 8px;
  border-radius: 999px;
  color: #166534;
  background: #dcfce7;
  font-size: 12px;
  font-weight: 700;
}

.feature-card.planned .feature-status {
  color: #92400e;
  background: #fef3c7;
}

@media (max-width: 980px) {
  .toolbox-hero,
  .hero-actions {
    display: block;
  }

  .hero-actions {
    margin-top: 16px;
  }

  .stats-row {
    grid-template-columns: 1fr;
  }
}
</style>
