<template>
  <div class="projects-page-v2">
    <header class="projects-header">
      <div>
        <p class="eyebrow">作品集</p>
        <h2>生成结果和可复用素材</h2>
        <p>保存后的作品可以继续创作、打开位置、生成引流视频或删除。</p>
      </div>
      <el-button @click="$emit('refresh')">
        <el-icon><Refresh /></el-icon>
        刷新
      </el-button>
    </header>

    <div class="projects-grid" v-if="projects.length">
      <article v-for="project in projects" :key="project.id" class="project-card">
        <div class="project-preview">
          <img v-if="previewSrc(project)" :src="previewSrc(project)" :alt="project.name" />
          <el-icon v-else :size="56"><Picture /></el-icon>
        </div>
        <div class="project-body">
          <h3>{{ project.name || '未命名作品' }}</h3>
          <p class="project-meta">{{ formatDate(project.createdAt) }} · {{ project.style || '未设置风格' }}</p>
          <p class="project-prompt" v-if="project.prompt">{{ project.prompt }}</p>
        </div>
        <div class="project-actions">
          <el-button type="primary" plain @click="$emit('use', project)">继续创作</el-button>
          <el-button plain @click="openLocation(project)">打开位置</el-button>
          <el-button plain @click="createLeadVideo(project)">引流视频</el-button>
          <el-button type="danger" plain @click="$emit('delete', project.id)">删除</el-button>
        </div>
      </article>
    </div>

    <el-empty v-else description="暂无作品，生成图片后点击“保存到作品集”即可沉淀结果" />
  </div>
</template>

<script setup>
import { ElMessage } from 'element-plus'

defineProps({
  projects: {
    type: Array,
    default: () => []
  }
})

defineEmits(['use', 'delete', 'refresh'])

function previewSrc(project) {
  const imgPath = project.generatedImage || project.sourceImage
  if (!imgPath) return ''
  if (!/\.(png|jpe?g|webp|gif|bmp)$/i.test(imgPath)) return ''
  return `file:///${imgPath.replace(/\\/g, '/')}`
}

function getFolderPath(filePath) {
  if (!filePath) return ''
  const index = Math.max(filePath.lastIndexOf('\\'), filePath.lastIndexOf('/'))
  return index >= 0 ? filePath.slice(0, index) : ''
}

function formatDate(value) {
  if (!value) return '未知时间'
  return new Date(value).toLocaleString()
}

function openLocation(project) {
  const folder = getFolderPath(project.generatedImage || project.sourceImage)
  if (!folder) {
    ElMessage.warning('这个作品没有可打开的本地文件路径')
    return
  }
  window.electronAPI.openFolder(folder)
}

async function createLeadVideo(project) {
  const imagePath = project.generatedImage || project.sourceImage
  if (!imagePath) {
    ElMessage.warning('这个作品没有图片，无法生成引流视频')
    return
  }

  try {
    const result = await window.electronAPI.videoCreate({
      imagePaths: [imagePath],
      durationPerImage: 3
    })
    if (!result?.success) throw new Error(result?.error || '生成失败')
    ElMessage.success('引流视频已生成')
    window.electronAPI.openFolder(result.outputDir)
  } catch (error) {
    ElMessage.error('引流视频生成失败：' + error.message)
  }
}
</script>

<style lang="scss" scoped>
.projects-page-v2 {
  height: 100%;
  overflow: auto;
  padding: 22px;
  background: #f4f7fb;
}

.projects-header {
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

.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.project-card {
  display: grid;
  grid-template-rows: 220px auto auto;
  border: 1px solid #dce6f2;
  border-radius: 10px;
  overflow: hidden;
  background: #fff;
}

.project-preview {
  display: grid;
  place-items: center;
  background: #eef3f8;

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
}

.project-body {
  padding: 16px;

  h3 {
    margin: 0;
    color: #172033;
  }
}

.project-meta {
  margin: 8px 0;
  color: #64748b;
  font-size: 13px;
}

.project-prompt {
  display: -webkit-box;
  margin: 0;
  color: #53627a;
  line-height: 1.6;
  overflow: hidden;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}

.project-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 0 16px 16px;
}
</style>
