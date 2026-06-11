<template>
  <el-dialog
    v-model="visible"
    title="API 设置"
    width="860px"
    class="settings-dialog"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-tabs v-model="activeTab">
      <el-tab-pane label="API 配置" name="api">
        <div class="provider-cards">
          <button
            v-for="provider in imageProviders"
            :key="provider.key"
            class="provider-card"
            :class="{ active: formData.api.provider === provider.key }"
            type="button"
            @click="handleProviderChange(provider.key)"
          >
            <span class="provider-name">{{ provider.name }}</span>
            <span class="provider-model">{{ provider.imageModel }}</span>
          </button>
        </div>

        <el-form :model="formData" label-width="110px" label-position="right" class="settings-form">
          <el-form-item label="API Key">
            <el-input
              v-model="formData.api.token"
              :placeholder="getTokenPlaceholder()"
              show-password
            />
          </el-form-item>
          <el-form-item label="备用 Key">
            <el-input
              v-model="apiKeysText"
              type="textarea"
              :rows="3"
              placeholder="可选：一行一个 API Key，批量生成时自动轮换"
              show-password
            />
          </el-form-item>
          <el-form-item label="Base URL">
            <el-input
              v-model="formData.api.baseURL"
              :placeholder="getBaseURLPlaceholder()"
            />
          </el-form-item>
          <el-form-item label="图片模型">
            <el-input
              v-model="formData.api.imageModel"
              placeholder="例如：gpt-image-2"
            />
          </el-form-item>
          <el-form-item label="图片质量">
            <el-select v-model="formData.api.imageQuality">
              <el-option label="low - 批量预览省成本" value="low" />
              <el-option label="medium - 审校平衡" value="medium" />
              <el-option label="high - 最终发布" value="high" />
            </el-select>
          </el-form-item>
          <el-alert
            v-if="!currentProvider?.supportsImage"
            title="当前提供商不支持图片生成，只适合提示词优化或聊天类能力。"
            type="warning"
            :closable="false"
            show-icon
            class="settings-alert"
          />

          <el-divider content-position="left">代理设置</el-divider>
          <el-row :gutter="14">
            <el-col :span="12">
              <el-form-item label="代理 Host">
                <el-input v-model="formData.api.proxyHost" placeholder="127.0.0.1" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="代理 Port">
                <el-input-number v-model="formData.api.proxyPort" :min="0" :max="65535" placeholder="7890" />
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
      </el-tab-pane>

      <el-tab-pane label="输出设置" name="output">
        <el-form :model="formData" label-width="130px" label-position="right" class="settings-form">
          <el-form-item label="原始输出目录">
            <el-input v-model="formData.output.rawOutputDir" readonly>
              <template #append>
                <el-button @click="selectOutputDir('rawOutputDir')">选择</el-button>
              </template>
            </el-input>
          </el-form-item>
          <el-form-item label="最终输出目录">
            <el-input v-model="formData.output.finalOutputDir" readonly>
              <template #append>
                <el-button @click="selectOutputDir('finalOutputDir')">选择</el-button>
              </template>
            </el-input>
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <el-tab-pane label="原创增强" name="originality">
        <el-form :model="formData" label-width="130px" label-position="right" class="settings-form">
          <el-form-item label="启用增强">
            <el-switch v-model="formData.originality.enabled" />
          </el-form-item>
          <el-form-item label="叠加素材目录">
            <el-input v-model="formData.originality.overlayFolder" readonly>
              <template #append>
                <el-button @click="selectOverlayFolder">选择</el-button>
              </template>
            </el-input>
          </el-form-item>
          <el-form-item label="叠加数量">
            <el-input-number v-model="formData.originality.overlayCount" :min="0" :max="5" />
          </el-form-item>
          <el-form-item label="透明度范围">
            <el-slider v-model="opacityRange" range :min="0" :max="10" :step="1" />
          </el-form-item>
          <el-row :gutter="14">
            <el-col :span="12">
              <el-form-item label="空间形变">
                <el-input-number v-model="formData.originality.spatialDistortion" :min="0" :max="100" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="色彩偏移">
                <el-input-number v-model="formData.originality.colorShift" :min="0" :max="100" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="克隆 EXIF">
            <el-switch v-model="formData.originality.cloneExif" />
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <el-tab-pane label="批量设置" name="batch">
        <el-form :model="formData" label-width="130px" label-position="right" class="settings-form">
          <el-form-item label="最大并发数">
            <el-input-number v-model="formData.batch.maxConcurrency" :min="1" :max="16" />
            <span class="form-tip">LupoAPI 或 OpenAI 遇到 429 时建议改为 1-2。</span>
          </el-form-item>
          <el-form-item label="最大批量数">
            <el-input-number v-model="formData.batch.maxBatchSize" :min="1" :max="200" />
            <span class="form-tip">建议 20；大批量会按批次释放内存。</span>
          </el-form-item>
          <el-form-item label="限速请求数">
            <el-input-number v-model="formData.rateLimit.requests" :min="0" :max="60" />
            <span class="form-tip">0 表示不限速。</span>
          </el-form-item>
          <el-form-item label="限速周期(秒)">
            <el-input-number v-model="formData.rateLimit.perSeconds" :min="1" :max="60" />
          </el-form-item>
          <el-form-item label="最大重试次数">
            <el-input-number v-model="formData.rateLimit.maxRetries" :min="0" :max="10" />
          </el-form-item>
          <el-form-item label="重试延迟(秒)">
            <el-input-number v-model="formData.rateLimit.retryDelay" :min="0.5" :max="30" :step="0.5" />
          </el-form-item>
        </el-form>
      </el-tab-pane>
    </el-tabs>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" @click="handleSave">保存设置</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useAppStore } from '../store/index.js'
import { ElMessage } from 'element-plus'

const props = defineProps({
  modelValue: Boolean
})

const emit = defineEmits(['update:modelValue'])
const store = useAppStore()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const activeTab = ref('api')

const API_PROVIDERS = {
  openai: {
    name: 'OpenAI 官方',
    baseURL: 'https://api.openai.com/v1',
    imageModel: 'gpt-image-2',
    tokenPlaceholder: 'sk-...',
    supportsImage: true
  },
  lupoapi: {
    name: 'LupoAPI',
    baseURL: 'https://ai.lupoapi.com/v1',
    imageModel: 'gpt-image-2',
    tokenPlaceholder: 'LupoAPI 密钥',
    supportsImage: true
  },
  gemini: {
    name: 'Google Gemini',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta',
    imageModel: 'gemini-2.5-flash-image',
    tokenPlaceholder: 'AIza...',
    supportsImage: true
  },
  zhipu: {
    name: '智谱 AI',
    baseURL: 'https://open.bigmodel.cn/api/paas/v4',
    imageModel: 'cogview-4',
    tokenPlaceholder: '智谱 API Key',
    supportsImage: true
  },
  deepseek: {
    name: 'DeepSeek',
    baseURL: 'https://api.deepseek.com/v1',
    imageModel: '',
    tokenPlaceholder: 'sk-...',
    supportsImage: false
  },
  minimax: {
    name: 'MiniMax',
    baseURL: 'https://api.minimax.chat/v1',
    imageModel: '',
    tokenPlaceholder: 'MiniMax API Key',
    supportsImage: false
  },
  xiaomi: {
    name: 'Xiaomi MiMo',
    baseURL: 'https://open.ai.xiaomi.com/v1',
    imageModel: '',
    tokenPlaceholder: '小米 API Key',
    supportsImage: false
  }
}

const imageProviders = computed(() => Object.entries(API_PROVIDERS)
  .filter(([, provider]) => provider.supportsImage)
  .map(([key, provider]) => ({ key, ...provider })))

const currentProvider = computed(() => API_PROVIDERS[formData.value.api.provider || 'openai'])

function cloneConfigForForm(config) {
  const cloned = JSON.parse(JSON.stringify(config || {}))
  cloned.api = cloned.api || {}
  cloned.output = cloned.output || {}
  cloned.originality = cloned.originality || {}
  cloned.rateLimit = cloned.rateLimit || {}
  cloned.batch = cloned.batch || {}
  cloned.api.provider = cloned.api.provider || 'openai'
  cloned.api.baseURL = cloned.api.baseURL || API_PROVIDERS[cloned.api.provider]?.baseURL || API_PROVIDERS.openai.baseURL
  cloned.api.imageModel = cloned.api.imageModel || API_PROVIDERS[cloned.api.provider]?.imageModel || 'gpt-image-2'
  cloned.api.imageQuality = ['low', 'medium', 'high'].includes(cloned.api.imageQuality) ? cloned.api.imageQuality : 'high'
  cloned.api.apiKeys = Array.isArray(cloned.api.apiKeys) ? cloned.api.apiKeys : []
  cloned.api.token = ''
  return cloned
}

const formData = ref(cloneConfigForForm(store.config))
const apiKeysText = ref((formData.value.api.apiKeys || []).join('\n'))

const opacityRange = ref([
  formData.value.originality.minOpacity ?? 3,
  formData.value.originality.maxOpacity ?? 7
])

watch(opacityRange, (val) => {
  formData.value.originality.minOpacity = val[0]
  formData.value.originality.maxOpacity = val[1]
}, { deep: true })

watch(() => store.config, (newConfig) => {
  formData.value = cloneConfigForForm(newConfig)
  apiKeysText.value = (formData.value.api.apiKeys || []).join('\n')
  opacityRange.value = [
    formData.value.originality.minOpacity ?? 3,
    formData.value.originality.maxOpacity ?? 7
  ]
}, { deep: true })

async function selectOutputDir(field) {
  const result = await window.electronAPI.openFolderDialog()
  if (!result.canceled) {
    formData.value.output[field] = result.filePaths[0]
  }
}

async function selectOverlayFolder() {
  const result = await window.electronAPI.openFolderDialog()
  if (!result.canceled) {
    formData.value.originality.overlayFolder = result.filePaths[0]
  }
}

function handleProviderChange(provider) {
  const config = API_PROVIDERS[provider]
  if (!config) return

  formData.value.api.provider = provider
  formData.value.api.baseURL = config.baseURL
  formData.value.api.imageModel = config.imageModel
  formData.value.api.hasToken = false
  formData.value.api.token = ''
  ElMessage.info(`已切换到 ${config.name}，请确认 API Key 和模型名。`)
}

function getTokenPlaceholder() {
  if (formData.value.api.hasToken) {
    return '已保存密钥，留空则继续使用'
  }

  const provider = formData.value.api.provider || 'openai'
  return API_PROVIDERS[provider]?.tokenPlaceholder || '输入 API 密钥'
}

function getBaseURLPlaceholder() {
  const provider = formData.value.api.provider || 'openai'
  return API_PROVIDERS[provider]?.baseURL || 'https://api.openai.com/v1'
}

async function handleSave() {
  try {
    const apiKeys = apiKeysText.value.split(/\r?\n|,/).map(key => key.trim()).filter(Boolean)
    if (!formData.value.api.token && !formData.value.api.hasToken && apiKeys.length === 0) {
      ElMessage.warning('请输入 API Key')
      return
    }

    const cleanData = JSON.parse(JSON.stringify(formData.value))
    cleanData.api.apiKeys = apiKeys
    cleanData.api.proxyPort = cleanData.api.proxyPort ? Number(cleanData.api.proxyPort) : null
    cleanData.api.proxyHost = cleanData.api.proxyHost || ''
    cleanData.api.baseURL = cleanData.api.baseURL || getBaseURLPlaceholder()
    cleanData.api.imageModel = cleanData.api.imageModel || API_PROVIDERS[cleanData.api.provider]?.imageModel || 'gpt-image-2'
    cleanData.api.imageQuality = ['low', 'medium', 'high'].includes(cleanData.api.imageQuality) ? cleanData.api.imageQuality : 'high'
    cleanData.rateLimit.requests = Number(cleanData.rateLimit.requests || 0)
    cleanData.rateLimit.perSeconds = Number(cleanData.rateLimit.perSeconds || 1)
    cleanData.batch.maxBatchSize = Number(cleanData.batch.maxBatchSize || 20)

    const result = await window.electronAPI.saveConfig(cleanData)
    if (!result.success) {
      throw new Error(result.error || '保存失败')
    }

    Object.assign(store.config, result.config || cleanData)
    ElMessage.success('设置已保存')
    visible.value = false
  } catch (error) {
    ElMessage.error('保存失败: ' + error.message)
  }
}

function handleClose() {
  formData.value = cloneConfigForForm(store.config)
  visible.value = false
}
</script>

<style lang="scss" scoped>
.provider-cards {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 18px;
}

.provider-card {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-height: 70px;
  padding: 12px;
  border: 1px solid #dbe3ef;
  border-radius: 8px;
  background: #f8fafc;
  color: #1f2937;
  cursor: pointer;
  text-align: left;
  transition: all 0.18s ease;

  &:hover {
    border-color: #4f7fc7;
    background: #f2f7ff;
  }

  &.active {
    border-color: #2f65b4;
    background: #eaf2ff;
    box-shadow: inset 0 0 0 1px #2f65b4;
  }
}

.provider-name {
  font-size: 15px;
  font-weight: 700;
}

.provider-model {
  font-size: 12px;
  color: #64748b;
}

.settings-form {
  padding-top: 2px;
}

.settings-alert {
  margin-bottom: 16px;
}

.form-tip {
  margin-left: 12px;
  color: #64748b;
  font-size: 12px;
}
</style>
