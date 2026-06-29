<template>
  <div class="xhs-workshop">
    <header class="workshop-header">
      <div>
        <p class="eyebrow">小红书图文</p>
        <h2>从教辅资料生成图文卡片方案</h2>
        <p>先生成结构化提示词和卡片规划，再送到创作页使用当前批量生图链路。</p>
      </div>
      <div class="header-actions">
        <el-button @click="planCards">
          <el-icon><Collection /></el-icon>
          规划卡片
        </el-button>
        <el-button type="primary" @click="buildPrompt">
          <el-icon><MagicStick /></el-icon>
          生成提示词
        </el-button>
      </div>
    </header>

    <section class="workbench-grid">
      <div class="control-panel">
        <el-form label-position="top">
          <div class="form-grid">
            <el-form-item label="模板">
              <el-select v-model="form.template">
                <el-option label="资料包封面" value="cover" />
                <el-option label="教辅资料页" value="material" />
                <el-option label="错题本订正页" value="mistake" />
                <el-option label="知识卡片" value="card" />
                <el-option label="学霸笔记" value="note" />
              </el-select>
            </el-form-item>
            <el-form-item label="风格">
              <el-select v-model="form.style">
                <el-option v-for="style in styles" :key="style" :label="style" :value="style" />
              </el-select>
            </el-form-item>
            <el-form-item label="年级">
              <el-select v-model="form.grade">
                <el-option v-for="grade in grades" :key="grade" :label="grade" :value="grade" />
              </el-select>
            </el-form-item>
            <el-form-item label="科目">
              <el-select v-model="form.subject">
                <el-option v-for="subject in subjects" :key="subject" :label="subject" :value="subject" />
              </el-select>
            </el-form-item>
            <el-form-item label="比例">
              <el-select v-model="form.ratio">
                <el-option label="2:3 竖图" value="2:3" />
                <el-option label="3:4 小红书竖版" value="3:4" />
                <el-option label="1:1 方图" value="1:1" />
                <el-option label="9:16 长图" value="9:16" />
              </el-select>
            </el-form-item>
            <el-form-item label="质量">
              <el-select v-model="form.quality">
                <el-option label="medium" value="medium" />
                <el-option label="high" value="high" />
                <el-option label="low" value="low" />
              </el-select>
            </el-form-item>
          </div>

          <el-form-item label="主标题">
            <el-input v-model="form.title" placeholder="例如：四年级下册数学易错应用题" />
          </el-form-item>
          <el-form-item label="副标题/卖点">
            <el-input v-model="form.subtitle" placeholder="例如：抓住易错点，提升解题能力" />
          </el-form-item>
          <el-form-item label="必须出现的内容">
            <el-input
              v-model="form.points"
              type="textarea"
              :rows="7"
              placeholder="每行一个要点，例如：图形面积、和差倍问题、单位换算"
            />
          </el-form-item>
          <el-form-item label="卡片数量">
            <el-input-number v-model="cardCount" :min="1" :max="20" />
          </el-form-item>
        </el-form>
      </div>

      <div class="preview-panel">
        <div class="mock-canvas">
          <div class="mock-badge">{{ form.grade }} · {{ form.subject }}</div>
          <h3>{{ form.title || '教辅资料标题' }}</h3>
          <p>{{ form.subtitle || '副标题/卖点展示在这里' }}</p>
          <div class="mock-lines">
            <span v-for="point in previewPoints" :key="point">{{ point }}</span>
          </div>
        </div>

        <div class="prompt-result">
          <div class="result-header">
            <strong>结构化提示词</strong>
            <el-button size="small" type="success" :disabled="!finalPrompt" @click="usePrompt">
              送去创作页
            </el-button>
          </div>
          <el-input v-model="finalPrompt" type="textarea" :rows="13" />
        </div>
      </div>
    </section>

    <section class="card-section">
      <div class="card-section-head">
        <div>
          <h3>图文卡片</h3>
          <p>共 {{ cardStats.total }} 张，待生成 {{ cardStats.pending }}，生成中 {{ cardStats.running }}，已完成 {{ cardStats.completed }}，失败 {{ cardStats.failed }}</p>
        </div>
        <el-button :disabled="!cards.length" @click="prepareBatchPrompt">使用当前卡片提示词</el-button>
      </div>
      <div class="card-grid" v-if="cards.length">
        <article v-for="card in cards" :key="card.id" class="xhs-card">
          <span>{{ card.subtitle }}</span>
          <el-input v-model="card.title" />
          <el-input v-model="card.pointsText" type="textarea" :rows="4" />
          <el-tag type="info">{{ card.status }}</el-tag>
        </article>
      </div>
      <el-empty v-else description="点击“规划卡片”生成图文结构" />
    </section>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { buildXhsPrompt, createXhsCards, summarizeXhsCards } from '../utils/xhsWorkflow.mjs'

const emit = defineEmits(['use-prompt'])

const styles = ['清爽重点笔记风', '小红书爆款风', '低年级童趣风', '学霸笔记风', '高级极简风', '手账插画风', '试卷封套风', '知识卡片风']
const grades = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级', '七年级', '八年级', '九年级', '高中']
const subjects = ['语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '道法']

const form = reactive({
  template: 'cover',
  style: '小红书爆款风',
  grade: '四年级',
  subject: '数学',
  ratio: '3:4',
  quality: 'medium',
  title: '四年级下册数学易错应用题',
  subtitle: '抓住易错点，提升解题能力',
  points: '先画图整理，再列式计算\n和差倍问题\n长方形面积应用\n单位换算与答题规范'
})

const cardCount = ref(6)
const finalPrompt = ref('')
const cards = ref([])

const previewPoints = computed(() => parsePoints(form.points).slice(0, 5))
const cardStats = computed(() => summarizeXhsCards(cards.value))

function parsePoints(value) {
  return String(value || '')
    .split(/\r?\n/)
    .map(item => item.trim())
    .filter(Boolean)
}

function buildPrompt() {
  if (!form.title.trim()) {
    ElMessage.warning('请先填写主标题')
    return
  }
  finalPrompt.value = buildXhsPrompt(form)
  ElMessage.success('提示词已生成')
}

function planCards() {
  const planned = createXhsCards({
    count: cardCount.value,
    title: form.title,
    points: parsePoints(form.points)
  }).map(card => ({
    ...card,
    pointsText: card.points.join('\n')
  }))
  cards.value = planned
  if (!finalPrompt.value) buildPrompt()
  ElMessage.success(`已规划 ${planned.length} 张图文卡片`)
}

function prepareBatchPrompt() {
  if (!cards.value.length) return
  const cardText = cards.value
    .map((card, index) => `第 ${index + 1} 张：${card.title}\n${card.pointsText}`)
    .join('\n\n')
  finalPrompt.value = `${buildXhsPrompt(form)}\n\n【图文卡片规划】\n${cardText}`
  usePrompt()
}

function usePrompt() {
  if (!finalPrompt.value) {
    buildPrompt()
  }
  emit('use-prompt', finalPrompt.value)
  ElMessage.success('已填入创作页提示词')
}
</script>

<style lang="scss" scoped>
.xhs-workshop {
  height: 100%;
  overflow: auto;
  padding: 22px;
  background: #f4f7fb;
}

.workshop-header {
  display: flex;
  justify-content: space-between;
  gap: 18px;
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

.header-actions {
  display: flex;
  gap: 10px;
}

.workbench-grid {
  display: grid;
  grid-template-columns: minmax(430px, 0.95fr) minmax(540px, 1.05fr);
  gap: 16px;
}

.control-panel,
.preview-panel,
.card-section {
  border: 1px solid #dce6f2;
  border-radius: 10px;
  background: #fff;
}

.control-panel,
.preview-panel,
.card-section {
  padding: 18px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 14px;
}

.preview-panel {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 16px;
}

.mock-canvas {
  aspect-ratio: 3 / 4;
  padding: 24px;
  border-radius: 8px;
  background:
    linear-gradient(180deg, rgba(255, 247, 219, 0.9), rgba(255, 255, 255, 0.96)),
    repeating-linear-gradient(0deg, transparent 0, transparent 30px, rgba(47, 101, 180, 0.08) 31px);
  border: 1px solid #dce6f2;
  box-shadow: inset 12px 0 0 #b9d8f5;

  h3 {
    margin: 22px 0 10px;
    color: #172033;
    font-size: 28px;
    line-height: 1.2;
  }

  p {
    display: inline-block;
    margin: 0;
    padding: 6px 12px;
    border-radius: 999px;
    background: #ffeb8a;
    color: #6b4e00;
    font-weight: 700;
  }
}

.mock-badge {
  display: inline-block;
  padding: 6px 10px;
  border-radius: 6px;
  background: #2f65b4;
  color: #fff;
  font-weight: 800;
}

.mock-lines {
  display: grid;
  gap: 10px;
  margin-top: 28px;

  span {
    padding: 10px 12px;
    border: 1px dashed #9fc3ef;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.75);
    color: #20304a;
    font-weight: 700;
  }
}

.prompt-result {
  min-width: 0;
}

.result-header,
.card-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.card-section {
  margin-top: 16px;

  h3,
  p {
    margin: 0;
  }

  p {
    margin-top: 6px;
    color: #64748b;
  }
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
}

.xhs-card {
  display: grid;
  gap: 10px;
  padding: 14px;
  border: 1px solid #dce6f2;
  border-radius: 8px;
  background: #f8fbff;

  span {
    color: #64748b;
    font-size: 13px;
  }
}

@media (max-width: 1180px) {
  .workbench-grid,
  .preview-panel,
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
