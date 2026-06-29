<template>
  <el-dialog
    v-model="visible"
    title="创作套件"
    width="1080px"
    :close-on-click-modal="false"
    class="creative-suite-dialog"
  >
    <el-tabs v-model="activeTab">
      <el-tab-pane label="一句话 PPT/绘本" name="presentation">
        <section class="suite-grid">
          <el-form label-position="top" class="suite-form">
            <el-form-item label="主题">
              <el-input v-model="presentationForm.topic" placeholder="例如：四年级下册数学易错应用题" />
            </el-form-item>
            <div class="form-row">
              <el-form-item label="类型">
                <el-select v-model="presentationForm.outputType">
                  <el-option label="教学 PPT" value="ppt" />
                  <el-option label="绘本故事" value="pictureBook" />
                </el-select>
              </el-form-item>
              <el-form-item label="页数">
                <el-input-number v-model="presentationForm.pageCount" :min="3" :max="30" />
              </el-form-item>
              <el-form-item label="比例">
                <el-select v-model="presentationForm.ratio">
                  <el-option label="小红书 3:4" value="3:4" />
                  <el-option label="竖版 2:3" value="2:3" />
                  <el-option label="宽屏 16:9" value="16:9" />
                </el-select>
              </el-form-item>
            </div>
            <el-form-item label="受众">
              <el-input v-model="presentationForm.audience" />
            </el-form-item>
            <el-form-item label="风格">
              <el-input v-model="presentationForm.style" />
            </el-form-item>
            <div class="suite-actions">
              <el-button type="primary" @click="generatePresentationPlan">生成方案</el-button>
              <el-button :disabled="!presentationPlan" @click="usePresentationPrompt">套用总提示词</el-button>
              <el-button :disabled="!presentationPlan" @click="$emit('open-text-image')">去文生图</el-button>
            </div>
          </el-form>

          <div class="suite-result">
            <h3>页面规划</h3>
            <div v-if="presentationPlan" class="page-plan-list">
              <article v-for="page in presentationPlan.pages" :key="page.id">
                <span>第 {{ page.index }} 页</span>
                <strong>{{ page.title }}</strong>
                <el-button size="small" text @click="usePrompt(page.prompt)">套用本页</el-button>
              </article>
            </div>
            <el-empty v-else description="生成后显示每页作图提示词" />
          </div>
        </section>
      </el-tab-pane>

      <el-tab-pane label="小红书闭环" name="xhs">
        <section class="suite-grid">
          <el-form label-position="top" class="suite-form">
            <el-form-item label="主题">
              <el-input v-model="xhsForm.topic" />
            </el-form-item>
            <div class="form-row">
              <el-form-item label="卡片数">
                <el-input-number v-model="xhsForm.cardCount" :min="1" :max="20" />
              </el-form-item>
              <el-form-item label="年级">
                <el-input v-model="xhsForm.grade" />
              </el-form-item>
              <el-form-item label="科目">
                <el-input v-model="xhsForm.subject" />
              </el-form-item>
            </div>
            <el-form-item label="卖点">
              <el-input v-model="xhsForm.sellingPoint" />
            </el-form-item>
            <div class="suite-actions">
              <el-button type="primary" @click="generateXhsCampaign">生成闭环方案</el-button>
              <el-button :disabled="!xhsCampaign" @click="useXhsCards">套用卡片提示词</el-button>
              <el-button :disabled="!xhsCampaign" @click="copyPublishText">复制发布文案</el-button>
            </div>
          </el-form>

          <div class="suite-result">
            <h3>标题与卡片</h3>
            <template v-if="xhsCampaign">
              <div class="title-list">
                <el-tag v-for="title in xhsCampaign.titles.slice(0, 5)" :key="title">{{ title }}</el-tag>
              </div>
              <article v-for="card in xhsCampaign.cards" :key="card.id" class="mini-card">
                <strong>{{ card.title }}</strong>
                <p>{{ card.role }}</p>
              </article>
            </template>
            <el-empty v-else description="生成后显示标题、卡片和分发文案" />
          </div>
        </section>
      </el-tab-pane>

      <el-tab-pane label="二创内容模板" name="rewrite">
        <section class="suite-grid">
          <el-form label-position="top" class="suite-form">
            <el-form-item label="内容模板">
              <el-select v-model="rewriteForm.template">
                <el-option v-for="item in contentTemplates" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>
            <el-form-item label="来源名称">
              <el-input v-model="rewriteForm.sourceName" placeholder="例如：原资料.pdf" />
            </el-form-item>
            <el-form-item label="处理目标">
              <el-input v-model="rewriteForm.goal" type="textarea" :rows="4" />
            </el-form-item>
            <div class="suite-actions">
              <el-button type="primary" @click="generateRewritePrompt">生成模板提示词</el-button>
              <el-button :disabled="!rewritePrompt" @click="usePrompt(rewritePrompt)">套用到创作页</el-button>
            </div>
          </el-form>
          <div class="suite-result">
            <h3>模板提示词</h3>
            <el-input v-model="rewritePrompt" type="textarea" :rows="18" />
          </div>
        </section>
      </el-tab-pane>
    </el-tabs>
  </el-dialog>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  buildContentTemplatePrompt,
  buildPresentationPlan,
  buildXhsCampaignPlan,
  getContentTemplateOptions
} from '../utils/creativeSuiteWorkflow.mjs'

const props = defineProps({
  modelValue: Boolean
})

const emit = defineEmits(['update:modelValue', 'use-prompt', 'open-text-image'])

const visible = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

const activeTab = ref('presentation')
const presentationForm = reactive({
  topic: '四年级下册数学易错应用题',
  outputType: 'ppt',
  pageCount: 8,
  ratio: '3:4',
  audience: '小红书老师和家长',
  style: '清爽重点笔记风'
})
const xhsForm = reactive({
  topic: '七下英语必背短语',
  cardCount: 6,
  grade: '七年级',
  subject: '英语',
  sellingPoint: '考前冲刺和短语归纳'
})
const rewriteForm = reactive({
  template: 'framework-upgrade',
  sourceName: '上传资料',
  goal: '保留原结构，但更适合小红书销售和手机阅读'
})
const contentTemplates = getContentTemplateOptions()
const presentationPlan = ref(null)
const xhsCampaign = ref(null)
const rewritePrompt = ref('')

function usePrompt(prompt) {
  if (!prompt) return
  emit('use-prompt', prompt)
  ElMessage.success('已套用到创作页提示词')
}

function generatePresentationPlan() {
  presentationPlan.value = buildPresentationPlan(presentationForm)
  ElMessage.success('一句话方案已生成')
}

function usePresentationPrompt() {
  usePrompt(presentationPlan.value?.prompt)
}

function generateXhsCampaign() {
  xhsCampaign.value = buildXhsCampaignPlan(xhsForm)
  ElMessage.success('小红书闭环方案已生成')
}

function useXhsCards() {
  if (!xhsCampaign.value) return
  const prompt = xhsCampaign.value.cards.map(card => card.prompt).join('\n\n')
  usePrompt(prompt)
}

async function copyPublishText() {
  if (!xhsCampaign.value) return
  await window.electronAPI.writeClipboardText(xhsCampaign.value.publishText)
  ElMessage.success('发布文案已复制')
}

function generateRewritePrompt() {
  rewritePrompt.value = buildContentTemplatePrompt(rewriteForm.template, rewriteForm)
  ElMessage.success('二创内容模板提示词已生成')
}
</script>

<style scoped lang="scss">
.suite-grid {
  display: grid;
  grid-template-columns: 380px minmax(0, 1fr);
  gap: 18px;
}

.suite-form,
.suite-result {
  border: 1px solid #dce5f0;
  border-radius: 8px;
  padding: 16px;
  background: #fff;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.suite-actions,
.title-list {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.page-plan-list {
  display: grid;
  gap: 10px;
  max-height: 560px;
  overflow: auto;
}

.page-plan-list article,
.mini-card {
  border: 1px solid #e5edf6;
  border-radius: 8px;
  padding: 12px;
  background: #f8fafc;
}

.page-plan-list article {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
}

.page-plan-list span,
.mini-card p {
  color: #64748b;
}

.mini-card {
  margin-top: 10px;
}
</style>
