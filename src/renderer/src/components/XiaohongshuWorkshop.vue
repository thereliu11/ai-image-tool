<template>
  <div class="xhs-workshop">
    <header class="workshop-header">
      <div>
        <h2>文生图工作台</h2>
        <p>把教辅资料需求整理成可直接生图的结构化提示词。</p>
      </div>
      <el-button type="primary" @click="buildPrompt">
        <el-icon><MagicStick /></el-icon>
        生成提示词
      </el-button>
    </header>

    <section class="workbench-grid">
      <div class="control-panel">
        <el-form label-position="top">
          <div class="form-grid">
            <el-form-item label="模板">
              <el-select v-model="form.template">
                <el-option label="资料包封面" value="cover" />
                <el-option label="教辅资料页" value="material" />
                <el-option label="错题本" value="mistake" />
                <el-option label="知识卡片" value="card" />
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
              :rows="6"
              placeholder="每行一个要点，例如：图形面积、和差倍问题、单位换算、答题规范"
            />
          </el-form-item>
        </el-form>
      </div>

      <div class="preview-panel">
        <div class="mock-canvas" :class="form.template">
          <div class="mock-badge">{{ form.grade }} · {{ form.subject }}</div>
          <h3>{{ form.title || '教辅资料标题' }}</h3>
          <p>{{ form.subtitle || '副标题/卖点会展示在这里' }}</p>
          <div class="mock-lines">
            <span v-for="point in previewPoints" :key="point">{{ point }}</span>
          </div>
        </div>

        <div class="prompt-result">
          <div class="result-header">
            <strong>生成提示词</strong>
            <el-button size="small" type="success" :disabled="!finalPrompt" @click="usePrompt">
              送去创作页
            </el-button>
          </div>
          <el-input v-model="finalPrompt" type="textarea" :rows="10" />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'

const emit = defineEmits(['use-prompt'])

const styles = ['清爽教辅风', '小红书爆款风', '低年级童趣风', '学霸笔记风', '高级极简风', '错题本订正风', '试卷封套风', '知识卡片风']
const grades = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级', '七年级', '八年级', '九年级', '高中']
const subjects = ['语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '道法']

const form = ref({
  template: 'cover',
  style: '小红书爆款风',
  grade: '四年级',
  subject: '数学',
  ratio: '2:3',
  quality: 'medium',
  title: '四年级下册数学易错应用题',
  subtitle: '抓住易错点，提升解题能力',
  points: '先画图整理，再列式计算\n和差倍问题\n长方形面积应用\n单位换算与答题规范'
})

const finalPrompt = ref('')

const previewPoints = computed(() => {
  const points = form.value.points.split('\n').map(item => item.trim()).filter(Boolean)
  return points.length ? points.slice(0, 5) : ['重点一', '重点二', '重点三']
})

function buildPrompt() {
  if (!form.value.title.trim()) {
    ElMessage.warning('请先填写主标题')
    return
  }

  finalPrompt.value = `请生成一张适合小红书发布的AI教辅图片。
【画面类型】${templateText(form.value.template)}
【年级科目】${form.value.grade}${form.value.subject}
【主标题】${form.value.title}
【副标题/卖点】${form.value.subtitle || '突出资料价值和提分场景'}
【风格】${form.value.style}，白底为主，信息分区清晰，蓝色、绿色、黄色用于重点标注，少量红笔圈画强调关键点。
【内容要点】
${previewPoints.value.map((point, index) => `${index + 1}. ${point}`).join('\n')}
【比例和质量】${form.value.ratio} 竖版构图，${form.value.quality}质量。
【硬性要求】中文文字必须准确，标题醒目，层级清楚，适合手机阅读；不要生成无关装饰，不要出现乱码，不要改变教育内容含义。`

  ElMessage.success('提示词已生成')
}

function templateText(template) {
  const map = {
    cover: '资料包封面',
    material: '教辅资料页',
    mistake: '错题本订正页',
    card: '知识卡片'
  }
  return map[template] || '教辅图片'
}

function usePrompt() {
  if (!finalPrompt.value) return
  emit('use-prompt', finalPrompt.value)
  ElMessage.success('已填入创作页提示词')
}
</script>

<style lang="scss" scoped>
.xhs-workshop {
  height: 100%;
  padding: 18px;
  background: #edf3f8;
  overflow: auto;
}

.workshop-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;

  h2 {
    margin: 0;
    color: #10213b;
    font-size: 22px;
  }

  p {
    margin: 6px 0 0;
    color: #64748b;
  }
}

.workbench-grid {
  display: grid;
  grid-template-columns: minmax(420px, 0.9fr) minmax(520px, 1.1fr);
  gap: 16px;
}

.control-panel,
.preview-panel {
  border: 1px solid #d9e3ef;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(16, 33, 59, 0.06);
}

.control-panel {
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
  padding: 18px;
}

.mock-canvas {
  aspect-ratio: 2 / 3;
  padding: 24px;
  border-radius: 8px;
  background:
    linear-gradient(180deg, rgba(255, 247, 219, 0.85), rgba(255, 255, 255, 0.92)),
    repeating-linear-gradient(0deg, transparent 0, transparent 30px, rgba(47, 101, 180, 0.08) 31px);
  border: 1px solid #dce5f0;
  box-shadow: inset 12px 0 0 #b9d8f5;

  h3 {
    margin: 22px 0 10px;
    color: #18243a;
    font-size: 30px;
    line-height: 1.18;
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

.result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

@media (max-width: 1200px) {
  .workbench-grid,
  .preview-panel {
    grid-template-columns: 1fr;
  }
}
</style>
