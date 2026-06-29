<template>
  <el-dialog
    v-model="visible"
    title="平台中心"
    width="920px"
    :close-on-click-modal="false"
    class="platform-center-dialog"
  >
    <el-tabs v-model="activeTab">
      <el-tab-pane label="本地账号" name="profile">
        <section class="profile-layout">
          <div class="profile-card">
            <div class="avatar">{{ profile.nickname.slice(0, 1) }}</div>
            <div>
              <h3>{{ profile.nickname }}</h3>
              <p>{{ roleLabel(profile.role) }} · 本地桌面版</p>
              <el-tag type="info">云端同步待接入后端</el-tag>
            </div>
          </div>
          <el-form label-position="top" class="profile-form">
            <el-form-item label="昵称">
              <el-input v-model="profileForm.nickname" />
            </el-form-item>
            <el-form-item label="身份">
              <el-select v-model="profileForm.role">
                <el-option label="老师" value="teacher" />
                <el-option label="教辅运营" value="operator" />
                <el-option label="设计/助教" value="designer" />
              </el-select>
            </el-form-item>
            <el-form-item label="工作区">
              <el-input v-model="profileForm.workspace" placeholder="例如 E:/教辅资料" />
            </el-form-item>
            <el-button type="primary" @click="saveProfile">保存本地资料</el-button>
          </el-form>
        </section>
      </el-tab-pane>

      <el-tab-pane label="反馈" name="feedback">
        <section class="feedback-grid">
          <el-form label-position="top" class="feedback-form">
            <el-form-item label="类型">
              <el-select v-model="feedbackForm.type">
                <el-option label="问题反馈" value="bug" />
                <el-option label="功能建议" value="suggestion" />
                <el-option label="体验优化" value="experience" />
              </el-select>
            </el-form-item>
            <el-form-item label="内容">
              <el-input v-model="feedbackForm.content" type="textarea" :rows="6" placeholder="描述遇到的问题、期望效果或建议" />
            </el-form-item>
            <el-form-item label="联系方式">
              <el-input v-model="feedbackForm.contact" placeholder="微信 / 电话 / 邮箱，可不填" />
            </el-form-item>
            <div class="feedback-actions">
              <el-button @click="selectScreenshots">上传截图</el-button>
              <el-button type="primary" @click="submitFeedback">保存反馈</el-button>
            </div>
            <div class="screenshot-list" v-if="feedbackForm.screenshots.length">
              <el-tag v-for="file in feedbackForm.screenshots" :key="file" closable @close="removeScreenshot(file)">
                {{ fileName(file) }}
              </el-tag>
            </div>
          </el-form>
          <div class="feedback-history">
            <h3>本地反馈记录</h3>
            <article v-for="record in feedbackRecords" :key="record.id">
              <strong>{{ typeLabel(record.type) }}</strong>
              <p>{{ record.content }}</p>
              <span>{{ new Date(record.createdAt).toLocaleString() }} · {{ record.priority === 'high' ? '高优先级' : '普通' }}</span>
            </article>
            <el-empty v-if="!feedbackRecords.length" description="暂无反馈记录" />
          </div>
        </section>
      </el-tab-pane>

      <el-tab-pane label="帮助中心" name="help">
        <div class="help-grid">
          <section v-for="section in helpSections" :key="section.id" class="help-section">
            <h3>{{ section.title }}</h3>
            <article v-for="item in section.items" :key="item.title">
              <strong>{{ item.title }}</strong>
              <p>{{ item.content }}</p>
            </article>
          </section>
        </div>
      </el-tab-pane>

      <el-tab-pane label="公告" name="announcements">
        <article v-for="announcement in announcements" :key="announcement.version" class="announcement-card">
          <div>
            <h3>{{ announcement.title }}</h3>
            <span>{{ announcement.date }}</span>
          </div>
          <ul>
            <li v-for="item in announcement.highlights" :key="item">{{ item }}</li>
          </ul>
        </article>
      </el-tab-pane>
    </el-tabs>
  </el-dialog>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  buildAnnouncementCards,
  buildFeedbackRecord,
  buildHelpSections,
  normalizeLocalProfile
} from '../utils/platformWorkflow.mjs'

const PROFILE_KEY = 'aiTeachingLocalProfile'
const FEEDBACK_KEY = 'aiTeachingFeedbackRecords'

const props = defineProps({
  modelValue: Boolean
})

const emit = defineEmits(['update:modelValue'])

const visible = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

const activeTab = ref('profile')
const profile = ref(normalizeLocalProfile(loadJson(PROFILE_KEY, {})))
const profileForm = reactive({ ...profile.value })
const feedbackForm = reactive({
  type: 'bug',
  content: '',
  contact: '',
  screenshots: []
})
const feedbackRecords = ref(loadJson(FEEDBACK_KEY, []))
const helpSections = buildHelpSections()
const announcements = buildAnnouncementCards('0.0.9')

watch(visible, value => {
  if (!value) return
  profile.value = normalizeLocalProfile(loadJson(PROFILE_KEY, {}))
  Object.assign(profileForm, profile.value)
  feedbackRecords.value = loadJson(FEEDBACK_KEY, [])
})

function loadJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback))
  } catch {
    return fallback
  }
}

function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

function roleLabel(role) {
  return ({ teacher: '老师', operator: '教辅运营', designer: '设计/助教' })[role] || '老师'
}

function typeLabel(type) {
  return ({ bug: '问题反馈', suggestion: '功能建议', experience: '体验优化' })[type] || '反馈'
}

function fileName(filePath) {
  return String(filePath || '').split(/[\\/]/).pop()
}

function saveProfile() {
  profile.value = normalizeLocalProfile(profileForm)
  saveJson(PROFILE_KEY, profile.value)
  ElMessage.success('本地资料已保存')
}

async function selectScreenshots() {
  const result = await window.electronAPI.openFileDialog({
    title: '选择反馈截图',
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: '图片文件', extensions: ['jpg', 'jpeg', 'png', 'webp'] }]
  })
  if (result?.canceled) return
  feedbackForm.screenshots = [...new Set([...(feedbackForm.screenshots || []), ...(result.filePaths || [])])].slice(0, 3)
}

function removeScreenshot(file) {
  feedbackForm.screenshots = feedbackForm.screenshots.filter(item => item !== file)
}

function submitFeedback() {
  try {
    const record = buildFeedbackRecord(feedbackForm)
    feedbackRecords.value = [record, ...feedbackRecords.value].slice(0, 50)
    saveJson(FEEDBACK_KEY, feedbackRecords.value)
    feedbackForm.content = ''
    feedbackForm.contact = ''
    feedbackForm.screenshots = []
    ElMessage.success('反馈已保存到本机')
  } catch (error) {
    ElMessage.warning(error.message)
  }
}
</script>

<style scoped lang="scss">
.profile-layout,
.feedback-grid {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 18px;
}

.profile-card,
.feedback-history,
.help-section,
.announcement-card {
  border: 1px solid #dce5f0;
  border-radius: 8px;
  padding: 16px;
  background: #fff;
}

.avatar {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: #1d4ed8;
  color: #fff;
  font-weight: 800;
  font-size: 24px;
}

.profile-card {
  display: flex;
  gap: 14px;
  align-items: center;
}

.feedback-actions,
.screenshot-list {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 10px;
}

.feedback-history article + article,
.help-section article + article {
  border-top: 1px solid #eef2f7;
  margin-top: 12px;
  padding-top: 12px;
}

.feedback-history p,
.help-section p {
  color: #5f6f86;
  margin: 6px 0;
  line-height: 1.6;
}

.help-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.announcement-card + .announcement-card {
  margin-top: 12px;
}

.announcement-card ul {
  margin: 12px 0 0;
  padding-left: 18px;
  color: #4b5b73;
  line-height: 1.8;
}
</style>
