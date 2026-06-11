<template>
  <div class="privacy-badge">
    <el-icon><Lock /></el-icon>
    <span>🔒 本地处理，隐私安全。文件不会上传到服务器</span>
  </div>
</template>

<script setup>
</script>

<style lang="scss" scoped>
.privacy-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #f0f9eb;
  border: 1px solid #e1f3d8;
  border-radius: 6px;
  font-size: 12px;
  color: #67c23a;
  margin-bottom: 12px;
}
</style>
