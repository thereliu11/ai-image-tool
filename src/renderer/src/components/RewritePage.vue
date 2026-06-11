<template>
  <div class="rewrite-page">
    <div class="rewrite-header">
      <h2>二创重塑</h2>
      <p class="subtitle">上传 PDF、Word 或 PPT，自动转成可编辑的图文分离文档</p>
    </div>

    <div class="rewrite-content">
      <div class="rewrite-upload" v-if="!uploadedFile">
        <el-upload
          drag
          :auto-upload="false"
          :on-change="handleFileUpload"
          accept=".pdf,.doc,.docx,.ppt,.pptx"
          :limit="1"
        >
          <el-icon :size="48"><Upload /></el-icon>
          <div class="el-upload__text">拖拽文件到此处，或 <em>点击上传</em></div>
          <div class="el-upload__tip">支持 PDF、Word、PPT，最大 50MB</div>
        </el-upload>
      </div>

      <div class="rewrite-config" v-else>
        <div class="file-info">
          <el-icon :size="24"><Document /></el-icon>
          <span>{{ uploadedFile.name }}</span>
          <el-button size="small" text type="danger" @click="clearFile">移除</el-button>
        </div>

        <el-form label-width="120px">
          <el-form-item label="处理模式">
            <el-radio-group v-model="mode">
              <el-radio value="optimize">内容优化</el-radio>
              <el-radio value="replace">模板替换</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="输出格式">
            <el-radio-group v-model="outputFormat">
              <el-radio value="pptx">图文分离 PPT</el-radio>
              <el-radio value="docx">图文分离 Word</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="processRewrite" :loading="processing">
              <el-icon><MagicStick /></el-icon>
              开始二创
            </el-button>
          </el-form-item>
        </el-form>

        <div class="rewrite-result" v-if="rewriteResult">
          <el-alert
            :title="`处理完成，共 ${rewriteResult.pageCount || 0} 页`"
            type="success"
            show-icon
            :closable="false"
          />
          <el-button type="primary" @click="downloadResult" style="margin-top: 12px">
            <el-icon><Download /></el-icon>
            打开结果目录
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'

const uploadedFile = ref(null)
const mode = ref('optimize')
const outputFormat = ref('pptx')
const processing = ref(false)
const rewriteResult = ref(null)

const handleFileUpload = (file) => {
  if (file.size > 50 * 1024 * 1024) {
    ElMessage.error('文件大小不能超过 50MB')
    return
  }
  if (!file.raw?.path) {
    ElMessage.error('未获取到文件本地路径，请在桌面端重新选择文件')
    return
  }
  uploadedFile.value = file.raw
  rewriteResult.value = null
}

const clearFile = () => {
  uploadedFile.value = null
  rewriteResult.value = null
}

const processRewrite = async () => {
  if (!uploadedFile.value) return ElMessage.warning('请先上传文件')
  processing.value = true
  try {
    ElMessage.info('二创处理中，请稍候...')
    const result = await window.electronAPI.rewriteDocument({
      inputPath: uploadedFile.value.path,
      mode: mode.value,
      outputFormat: outputFormat.value
    })
    if (!result.success) {
      throw new Error(result.error || '处理失败')
    }
    rewriteResult.value = result
    ElMessage.success(`二创完成，共处理 ${result.pageCount || 0} 页`)
  } catch (err) {
    ElMessage.error('处理失败: ' + err.message)
  } finally {
    processing.value = false
  }
}

const downloadResult = () => {
  if (!rewriteResult.value?.outputDir) return ElMessage.warning('暂无可打开的结果目录')
  window.electronAPI.openFolder(rewriteResult.value.outputDir)
}
</script>

<style lang="scss" scoped>
.rewrite-page { padding: 20px; }
.rewrite-header { margin-bottom: 24px; h2 { color: #1D4ED8; margin-bottom: 8px; } .subtitle { color: #666; } }
.rewrite-upload { border: 2px dashed #dcdfe6; border-radius: 12px; padding: 60px; text-align: center;
  .el-upload__text { margin-top: 12px; em { color: #1D4ED8; } }
  .el-upload__tip { color: #999; font-size: 12px; margin-top: 8px; }
}
.rewrite-config { background: #f5f7fa; padding: 24px; border-radius: 12px; }
.file-info { display: flex; align-items: center; gap: 12px; padding: 12px; background: white; border-radius: 8px; margin-bottom: 20px;
  span { flex: 1; font-weight: 500; }
}
.rewrite-result { margin-top: 20px; }
</style>
