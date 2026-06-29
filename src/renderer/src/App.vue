<template>
  <div class="app-container">
    <!-- 顶部标题栏 -->
    <header class="app-header">
      <div class="header-left">
        <h1 class="app-title">
          <el-icon><MagicStick /></el-icon>
          智绘AI
        </h1>
        <span class="version">v26.06.29</span>
        <el-button v-if="updateState.hasUpdate" type="warning" size="small" class="update-badge" @click="showUpdateDialog = true">
          <el-icon><Upload /></el-icon>
          有新版本
        </el-button>
      </div>

      <!-- 顶部功能导航 -->
      <nav class="header-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="tab-btn"
          :class="{ active: activeTab === tab.key }"
          @click="activeTab = tab.key"
        >
          <el-icon><component :is="tab.icon" /></el-icon>
          {{ tab.label }}
        </button>
      </nav>

      <div class="header-right">
        <el-button @click="showCreativeSuite = true">
          <el-icon><Collection /></el-icon>
          创作套件
        </el-button>
        <el-button @click="showUnifiedHistory = true">
          <el-icon><Clock /></el-icon>
          历史
        </el-button>
        <el-button @click="handleExport" :disabled="store.completedCount === 0">
          <el-icon><Download /></el-icon>
          导出
        </el-button>
        <el-button @click="toggleTheme">
          <el-icon>
            <Moon v-if="!isDarkTheme" />
            <Sunny v-else />
          </el-icon>
        </el-button>
        <el-button @click="showAiAssistant = !showAiAssistant">
          <el-icon><ChatDotRound /></el-icon>
          AI助手
        </el-button>
        <el-button @click="showPlatformCenter = true">
          平台中心
        </el-button>
      </div>
    </header>

    <!-- 主内容区 - 根据Tab切换 -->
    <main class="app-main">
      <!-- ==================== Tab: 创作 ==================== -->
      <div v-show="activeTab === 'create'" class="tab-content tab-create">
        <div class="create-status-strip">
          <div class="status-meta">
            <strong>{{ store.currentFolderName || '未导入素材' }}</strong>
            <span>{{ store.currentFolderPath || '选择图片、PDF 或 Word 后开始批量生成' }}</span>
          </div>
          <div class="status-chips">
            <button type="button" class="status-chip" :class="{ active: goodsStatusFilter === 'all' }" @click="goodsStatusFilter = 'all'">
              <strong>{{ goodsReviewStats.total }}</strong>
              <span>总素材</span>
            </button>
            <button type="button" class="status-chip" :class="{ active: goodsSelectedOnly }" @click="goodsSelectedOnly = !goodsSelectedOnly">
              <strong>{{ goodsReviewStats.selected }}</strong>
              <span>已勾选</span>
            </button>
            <button type="button" class="status-chip success" :class="{ active: goodsStatusFilter === 'completed' }" @click="goodsStatusFilter = 'completed'">
              <strong>{{ goodsReviewStats.completed }}</strong>
              <span>已完成</span>
            </button>
            <button type="button" class="status-chip danger" :class="{ active: goodsStatusFilter === 'failed' }" @click="goodsStatusFilter = 'failed'">
              <strong>{{ goodsReviewStats.failed }}</strong>
              <span>失败</span>
            </button>
          </div>
          <div class="status-mode">
            <el-tag effect="plain">{{ selectedRenderModeLabel }}</el-tag>
            <el-tag effect="plain">{{ selectedSizeLabel }}</el-tag>
            <el-tag effect="plain">{{ selectedResolutionLabel }}</el-tag>
          </div>
        </div>
        <!-- 左侧面板 -->
        <aside class="left-panel">
          <!-- 商品列表 -->
          <div class="goods-list-panel">
            <div class="panel-header">
              <span class="panel-title">商品列表</span>
              <div class="panel-actions">
                <el-button size="small" text @click="store.selectAll">全选</el-button>
                <el-button size="small" text @click="store.deselectAll">取消</el-button>
                <el-button size="small" text @click="store.invertSelection">反选</el-button>
                <el-button size="small" text type="warning" :disabled="goodsReviewStats.failed === 0" @click="jumpToNextReviewItem('failed')">
                  下个失败
                </el-button>
                <el-button size="small" text type="danger" @click="handleBatchDelete" :disabled="store.selectedItems.length === 0">
                  🗑️ 批量删除({{ store.selectedItems.length }})
                </el-button>
              </div>
            </div>
            <div class="goods-filter-bar">
              <el-segmented v-model="goodsStatusFilter" :options="goodsFilterOptions" />
              <div class="goods-filter-row">
                <el-input
                  v-model="goodsKeyword"
                  clearable
                  placeholder="搜索文件名、错误原因"
                />
                <el-checkbox v-model="goodsSelectedOnly">只看勾选</el-checkbox>
              </div>
              <div class="goods-filter-summary">
                当前显示 {{ visibleGoodsList.length }} / {{ goodsReviewStats.total }}
              </div>
            </div>
            <div class="goods-list">
              <div
                v-for="item in visibleGoodsList"
                :key="item.id"
                class="goods-item"
                :class="{ selected: item.selected, failed: isFailedStatus(item.status), active: previewItem?.id === item.id }"
                @click="handlePreviewItem(item)"
              >
                <el-checkbox v-model="item.selected" @click.stop />
                <span class="item-id">{{ item.id }}</span>
                <div class="item-preview">
                  <img :src="getItemPreviewSrc(item)" :alt="item.title" />
                </div>
                <div class="item-info">
                  <span class="item-title" :title="item.title">{{ item.title }}</span>
                  <el-tag :type="getStatusType(item.status)" size="small">
                    {{ item.status }}
                  </el-tag>
                </div>
                <el-button size="small" text @click.stop="handlePreviewItem(item)">
                  <el-icon><View /></el-icon>
                </el-button>
                <el-button size="small" text type="danger" @click.stop="removeItem(item)">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </div>
              <div v-if="store.goodsList.length === 0" class="empty-state">
                <el-icon :size="48"><FolderOpened /></el-icon>
                <p>可以选择单张/多张图片，也可以导入整个文件夹</p>
                <div class="empty-actions">
                  <el-button type="primary" size="small" @click.stop="handleImportFiles">
                    <el-icon><Picture /></el-icon>
                    选择图片
                  </el-button>
                  <el-button size="small" @click.stop="handleImportFolder">
                    <el-icon><FolderOpened /></el-icon>
                    导入文件夹
                  </el-button>
                </div>
              </div>
              <div v-else-if="visibleGoodsList.length === 0" class="empty-state compact">
                <el-icon :size="42"><Search /></el-icon>
                <p>没有符合当前筛选条件的素材</p>
                <el-button size="small" @click="resetGoodsFilters">清空筛选</el-button>
              </div>
            </div>
          </div>

          <!-- 提示词设置 -->
          <div class="prompt-panel">
            <div class="panel-header">
              <span class="panel-title">提示词设置</span>
              <el-button size="small" @click="showPromptManager = true">
                <el-icon><Setting /></el-icon>
                管理
              </el-button>
            </div>
            <div class="prompt-content">
              <el-select
                v-model="store.selectedTemplate"
                placeholder="选择模板"
                class="template-select"
                @change="handleTemplateChange"
              >
                <el-option
                  v-for="template in store.promptTemplates"
                  :key="template.name"
                  :label="template.name"
                  :value="template.name"
                />
              </el-select>
              <el-input
                v-model="importPageRanges"
                placeholder="PDF页码：如 1-3,5，留空导入全部"
                class="page-range-input"
              />
              <div class="prompt-textarea-row">
                <el-input
                  v-model="store.promptText"
                  type="textarea"
                  :rows="4"
                  placeholder="输入AI绘图提示词...或点击魔法棒自动优化"
                  style="flex: 1"
                />
                <el-button
                  type="warning"
                  class="magic-wand-btn"
                  @click="handleMagicWand"
                  :loading="magicWandLoading"
                  title="魔法棒：自动优化提示词"
                >
                  ✨
                </el-button>
              </div>
              <div class="size-settings">
                <el-select v-model="selectedRenderMode" placeholder="生成方式" class="mode-select">
                  <el-option label="OpenAI参考图重绘" value="openaiRedraw" />
                  <el-option label="OCR内容保真" value="faithful" />
                  <el-option label="OCR二段式" value="twoStage" />
                  <el-option label="OCR强风格包装" value="strongStyle" />
                </el-select>
                <el-select v-model="store.selectedSize" placeholder="尺寸" class="size-select">
                  <el-option
                    v-for="option in store.sizeOptions"
                    :key="option.value"
                    :label="option.label"
                    :value="option.value"
                  />
                </el-select>
                <el-select v-model="store.selectedResolution" placeholder="分辨率" class="resolution-select">
                  <el-option
                    v-for="option in store.resolutionOptions"
                    :key="option.value"
                    :label="option.label"
                    :value="option.value"
                  />
                </el-select>
              </div>
            </div>
          </div>
        </aside>

        <!-- 右侧预览区 -->
        <section class="right-panel">
          <div class="preview-panel" v-if="previewItem">
            <div class="preview-header">
              <el-button @click="prevPreview" :disabled="previewIndex === 0">
                <el-icon><ArrowLeft /></el-icon>
                上一张
              </el-button>
              <span class="preview-title">{{ previewItem.title }}</span>
              <span class="preview-index">{{ previewIndex + 1 }} / {{ store.goodsList.length }}</span>
              <el-button @click="nextPreview" :disabled="previewIndex >= store.goodsList.length - 1">
                下一张
                <el-icon><ArrowRight /></el-icon>
              </el-button>
            </div>
            <div class="preview-content">
              <div class="preview-images">
                <div class="preview-box">
                  <h4>原始图片</h4>
                  <img
                    :src="getPreviewSrc(previewItem.referenceImage)"
                    :alt="previewItem.title"
                    @click="openImagePreview(previewItem.referenceImage)"
                  />
                </div>
                <div class="preview-arrow">
                  <el-icon :size="32"><Right /></el-icon>
                </div>
                <div class="preview-box">
                  <h4>生成结果</h4>
                  <img
                    v-if="previewItem.generatedImage"
                    :src="getPreviewSrc(previewItem.generatedImage)"
                    :alt="previewItem.title"
                    @click="openImagePreview(previewItem.generatedImage)"
                  />
                  <div v-else class="no-image">
                    <el-icon :size="48"><Picture /></el-icon>
                    <p>暂无生成结果</p>
                  </div>
                </div>
              </div>
              <div v-if="previewItem.error" class="error-message">
                <el-alert :title="previewItem.error" type="error" show-icon :closable="false" />
                <div v-if="previewErrorDiagnosis" class="error-diagnosis-card">
                  <strong>{{ previewErrorDiagnosis.title }}</strong>
                  <p>{{ previewErrorDiagnosis.summary }}</p>
                  <ul>
                    <li v-for="action in previewErrorDiagnosis.actions" :key="action">{{ action }}</li>
                  </ul>
                </div>
              </div>
              <div v-if="previewItem.qualityStatus || previewItem.visualQualityStatus" class="quality-summary">
                <el-tag v-if="previewItem.qualityStatus" :type="previewItem.qualityNeedsReview ? 'warning' : 'success'">
                  OCR {{ previewItem.qualityScore ?? '-' }} 分
                </el-tag>
                <el-tag v-if="previewItem.visualQualityStatus" :type="previewItem.visualQualityNeedsReview ? 'warning' : 'success'">
                  视觉 {{ previewItem.visualQualityScore ?? '-' }} 分
                </el-tag>
                <span v-if="previewItem.visualQualityWarnings?.length">
                  {{ previewItem.visualQualityWarnings.join('、') }}
                </span>
              </div>
              <div class="review-toolbar">
                <el-button type="success" :disabled="!previewItem.generatedImage" @click="markPreviewHistory('satisfied')">
                  满意
                </el-button>
                <el-button type="warning" :disabled="!previewItem.generatedImage && !previewItem.error" @click="markPreviewHistory('review')">
                  需复查
                </el-button>
                <el-button :disabled="!previewItem.generatedImage" @click="qualityCheckPreview">
                  OCR质检
                </el-button>
                <el-button :disabled="!previewItem.generatedImage" @click="openPreviewResultFolder">
                  打开位置
                </el-button>
                <el-button type="primary" :disabled="store.isGenerating" @click="redoPreviewItem">
                  重做当前
                </el-button>
              </div>
              <div class="history-panel">
                <div class="history-header">
                  <div>
                    <h4>历史记录</h4>
                    <p>共 {{ historyStats.total }} 条 · 满意 {{ historyStats.satisfied }} · 需复查 {{ historyStats.review }} · 失败 {{ historyStats.failed }}</p>
                  </div>
                  <el-select v-model="historyFilter" size="small" class="history-filter">
                    <el-option label="全部" value="all" />
                    <el-option label="满意" value="satisfied" />
                    <el-option label="需复查" value="review" />
                    <el-option label="失败" value="failed" />
                  </el-select>
                </div>
                <div class="history-list" v-if="visibleTaskHistory.length">
                  <div v-for="record in visibleTaskHistory.slice(0, 8)" :key="record.id" class="history-item">
                    <button type="button" class="history-thumb" @click="selectHistoryRecord(record)">
                      <img v-if="record.generatedImage || record.sourceImage" :src="getPreviewSrc(record.generatedImage || record.sourceImage)" :alt="record.title" />
                    </button>
                    <div class="history-meta" @click="selectHistoryRecord(record)">
                      <strong :title="record.title">{{ record.title }}</strong>
                      <span>{{ record.folderName }} · {{ record.model }} · {{ record.status === 'failed' ? '失败' : '已生成' }}</span>
                    </div>
                    <div class="history-actions">
                      <el-button size="small" text @click="openRecordFolder(record)">位置</el-button>
                      <el-button size="small" text type="success" @click="markHistory(record, 'satisfied')">满意</el-button>
                      <el-button size="small" text type="warning" @click="markHistory(record, 'review')">复查</el-button>
                    </div>
                  </div>
                </div>
                <div v-else class="history-empty">暂无历史记录，生成后会自动保存到这里。</div>
              </div>
            </div>
          </div>
          <div v-else class="no-preview">
            <el-icon :size="64"><Picture /></el-icon>
            <p>选择商品查看预览</p>
          </div>
        </section>

        <!-- 创作Tab底部操作栏 -->
        <div class="create-bottom-bar">
          <div class="footer-left">
            <el-button type="success" size="large" @click="handleImportFiles">
              <el-icon><Picture /></el-icon>
              选择图片
            </el-button>
            <el-button type="primary" size="large" @click="handleImportMaterials">
              <el-icon><Document /></el-icon>
              导入图片/PDF/Word
            </el-button>
            <el-button type="primary" size="large" @click="handleImportFolder">
              <el-icon><FolderOpened /></el-icon>
              导入文件夹
            </el-button>
            <el-button type="primary" size="large" @click="handleBatchGenerate" :loading="store.isGenerating">
              <el-icon><VideoPlay /></el-icon>
              批量生图
            </el-button>
            <el-button type="danger" size="large" @click="stopGenerate" :disabled="!store.isGenerating">
              <el-icon><VideoPause /></el-icon>
              停止生成
            </el-button>
            <el-button size="large" @click="handleRecoverInterrupted" :disabled="resumeSummary.interrupted === 0 || store.isGenerating">
              <el-icon><Refresh /></el-icon>
              恢复中断({{ resumeSummary.interrupted }})
            </el-button>
            <el-button type="success" size="large" @click="handleExport" :disabled="store.completedCount === 0">
              <el-icon><Download /></el-icon>
              AI教辅图导出
            </el-button>
            <el-button type="success" size="large" @click="handleExportSatisfied" :disabled="satisfiedCompletedItems.length === 0">
              <el-icon><Download /></el-icon>
              导出满意
            </el-button>
            <el-button type="success" size="large" @click="handleExportPdf" :disabled="store.completedCount === 0">
              <el-icon><Document /></el-icon>
              合成PDF
            </el-button>
            <el-button type="warning" size="large" @click="handleDistribute" :disabled="store.completedCount === 0">
              <el-icon><Share /></el-icon>
              一键分发
            </el-button>
            <el-button type="danger" size="large" @click="handleClearDistribute">
              <el-icon><Delete /></el-icon>
              一键清空分发
            </el-button>
            <el-button @click="store.clearAll">
              <el-icon><Delete /></el-icon>
              一键清空
            </el-button>
            <el-button type="success" size="large" @click="saveCurrentProject" :disabled="!previewItem">
              <el-icon><FolderAdd /></el-icon>
              保存到作品集
            </el-button>
          </div>
          <div class="footer-center">
            <el-progress
              :percentage="store.progress"
              :status="store.progress === 100 ? 'success' : ''"
              :stroke-width="20"
              style="width: 300px"
            />
            <span class="progress-text">
              已完成 {{ store.completedCount }}/{{ store.totalCount }}
              <span v-if="store.failedCount > 0" class="failed-count">
                ({{ store.failedCount }} 失败)
              </span>
            </span>
          </div>
          <div class="footer-right">
            <span class="stats">
              待生成: {{ store.pendingCount }} |
              已完成: {{ store.completedCount }} |
              失败: {{ store.failedCount }}
            </span>
          </div>
        </div>
      </div>

      <!-- ==================== Tab: 小红书 ==================== -->
      <div v-show="activeTab === 'xiaohongshu'" class="tab-content tab-xiaohongshu">
        <XiaohongshuWorkshop @use-prompt="handleToolboxUsePrompt" />
      </div>

      <!-- ==================== Tab: 文生图 ==================== -->
      <div v-show="activeTab === 'textImage'" class="tab-content tab-text-image">
        <TextToImageWorkbench
          :has-api-token="hasConfiguredApiToken()"
          :redo-request="textImageRedoRequest"
          @history-record="handleGeneratedHistoryRecord"
          @open-settings="showSettings = true"
          @use-prompt="handleToolboxUsePrompt"
        />
      </div>

      <!-- ==================== Tab: 二创 ==================== -->
      <div v-show="activeTab === 'recreate'" class="tab-content tab-recreate">
        <RewritePage />
      </div>

      <!-- ==================== Tab: 图文分离 ==================== -->
      <div v-show="activeTab === 'separation'" class="tab-content tab-separation">
        <GraphicTextSeparationWorkbench />
      </div>

      <!-- ==================== Tab: 模板库 ==================== -->
      <div v-show="activeTab === 'templates'" class="tab-content tab-templates">
        <TemplateLibrary @use-prompt="handleToolboxUsePrompt" />
      </div>

      <!-- ==================== Tab: 作品集 ==================== -->
      <div v-show="activeTab === 'projects'" class="tab-content tab-projects">
        <ProjectsPage
          :projects="projects"
          @use="useProject"
          @delete="deleteProject"
          @refresh="loadProjects"
        />
      </div>

      <!-- ==================== Tab: 百宝箱 ==================== -->
      <div v-show="activeTab === 'toolbox'" class="tab-content tab-toolbox">
        <ToolboxPage
          @open-toolbox="showToolbox = true"
          @network-diagnosis="handleNetworkDiagnosis"
          @open-settings="showSettings = true"
        />
      </div>

      <!-- ==================== AI助手侧边栏 ==================== -->
      <transition name="slide-right">
        <div v-if="showAiAssistant" class="ai-assistant-panel">
          <div class="ai-assistant-header">
            <h3><el-icon><ChatDotRound /></el-icon> AI创作助手</h3>
            <el-button text @click="showAiAssistant = false">
              <el-icon><Close /></el-icon>
            </el-button>
          </div>
          <div class="ai-assistant-content">
            <div class="ai-message ai-message-bubble">
              <p>你好！我是AI创作助手，可以帮你：</p>
              <ul>
                <li>优化绘图提示词</li>
                <li>推荐合适的渲染模式</li>
                <li>解答使用问题</li>
                <li>提供创作灵感</li>
              </ul>
              <p class="ai-hint">请在左侧输入提示词后点击魔法棒，我将为你智能优化！</p>
            </div>
          </div>
          <div class="ai-assistant-input">
            <el-input
              v-model="aiAssistantInput"
              placeholder="输入你的问题..."
              @keyup.enter="handleAiAssistantSend"
            >
              <template #append>
                <el-button @click="handleAiAssistantSend">
                  <el-icon><Promotion /></el-icon>
                </el-button>
              </template>
            </el-input>
          </div>
        </div>
      </transition>
    </main>

    <!-- 日志面板 -->
    <div class="log-panel" :class="{ collapsed: logCollapsed }">
      <div class="log-header" @click="logCollapsed = !logCollapsed">
        <span>运行日志</span>
        <el-icon>
          <ArrowUp v-if="!logCollapsed" />
          <ArrowDown v-else />
        </el-icon>
      </div>
      <div class="log-content" v-show="!logCollapsed">
        <textarea
          ref="logTextarea"
          :value="logText"
          readonly
          class="log-area"
        />
      </div>
    </div>

    <!-- API设置对话框 -->
    <SettingsDialog v-model="showSettings" />

    <!-- 提示词管理对话框 -->
    <PromptManager v-model="showPromptManager" />

    <!-- 百宝箱工具箱对话框 -->
    <ToolboxDialog v-model="showToolbox" @use-prompt="handleToolboxUsePrompt" />

    <CreativeSuiteDialog
      v-model="showCreativeSuite"
      @use-prompt="handleToolboxUsePrompt"
      @open-text-image="activeTab = 'textImage'"
    />

    <PlatformCenterDialog v-model="showPlatformCenter" />

    <!-- 统一历史记录 -->
    <UnifiedHistoryDialog
      v-model:visible="showUnifiedHistory"
      :records="taskHistory"
      @preview="selectHistoryRecord"
      @open="openRecordFolder"
      @mark="markHistory"
      @reuse="reuseHistoryPrompt"
      @redo="redoHistoryRecord"
      @delete="deleteHistoryRecord"
      @clear="clearHistoryRecords"
    />

    <!-- 图片预览对话框 -->
    <el-dialog v-model="imagePreviewVisible" title="图片预览" width="80%" destroy-on-close>
      <img :src="previewImageUrl" style="width: 100%; object-fit: contain;" />
    </el-dialog>

    <!-- 更新提示对话框 -->
    <el-dialog v-model="showUpdateDialog" title="软件更新" width="480px" :close-on-click-modal="false">
      <div v-if="!updateState.downloading && !updateState.downloaded">
        <el-alert type="info" :closable="false" show-icon style="margin-bottom: 16px;">
          <template #title>
            发现新版本 v{{ updateState.latestVersion }}
          </template>
        </el-alert>
        <p style="color: #606266; margin-bottom: 16px;">
          当前版本：v26.06.29<br/>
          最新版本：v{{ updateState.latestVersion }}<br/>
          <span v-if="updateState.releaseDate">发布日期：{{ updateState.releaseDate }}</span>
        </p>
        <div v-if="updateState.releaseNotes" style="background: #f5f7fa; padding: 12px; border-radius: 8px; margin-bottom: 16px; max-height: 200px; overflow-y: auto;">
          <h4 style="margin: 0 0 8px;">更新内容：</h4>
          <div v-html="updateState.releaseNotes"></div>
        </div>
      </div>
      <div v-else-if="updateState.downloading" style="text-align: center; padding: 20px;">
        <el-progress :percentage="updateState.progress" :stroke-width="12" style="margin-bottom: 16px;" />
        <p style="color: #606266;">正在下载更新... {{ updateState.progress }}%</p>
        <p v-if="updateState.downloadSpeed" style="color: #909399; font-size: 12px;">
          下载速度：{{ updateState.downloadSpeed }}
        </p>
      </div>
      <div v-else-if="updateState.downloaded" style="text-align: center; padding: 20px;">
        <el-icon :size="48" color="#67c23a"><CircleCheck /></el-icon>
        <p style="color: #606266; margin-top: 12px;">更新已下载完成，点击"立即安装"重启应用。</p>
      </div>
      <template #footer>
        <el-button @click="showUpdateDialog = false" :disabled="updateState.downloading">
          {{ updateState.downloaded ? '稍后安装' : '取消' }}
        </el-button>
        <el-button v-if="!updateState.downloading && !updateState.downloaded" type="primary" @click="handleDownloadUpdate">
          下载更新
        </el-button>
        <el-button v-if="updateState.downloaded" type="primary" @click="handleInstallUpdate">
          立即安装
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useAppStore } from './store/index.js'
import { ElMessage, ElMessageBox } from 'element-plus'
import SettingsDialog from './components/SettingsDialog.vue'
import PromptManager from './components/PromptManager.vue'
import ToolboxDialog from './components/ToolboxDialog.vue'
import CreativeSuiteDialog from './components/CreativeSuiteDialog.vue'
import PlatformCenterDialog from './components/PlatformCenterDialog.vue'
import RewritePage from './components/RewritePage.vue'
import XiaohongshuWorkshop from './components/XiaohongshuWorkshop.vue'
import TextToImageWorkbench from './components/TextToImageWorkbench.vue'
import GraphicTextSeparationWorkbench from './components/GraphicTextSeparationWorkbench.vue'
import ToolboxPage from './components/ToolboxPage.vue'
import TemplateLibrary from './components/TemplateLibrary.vue'
import ProjectsPage from './components/ProjectsPage.vue'
import UnifiedHistoryDialog from './components/UnifiedHistoryDialog.vue'
import {
  createTaskRecord,
  upsertTaskRecord,
  markTaskRecord,
  deleteTaskRecord,
  clearTaskRecords,
  createHistoryRedoPayload,
  filterTaskRecords,
  getTaskHistoryStats,
  loadTaskHistory,
  saveTaskHistory
} from './utils/taskHistory.mjs'
import {
  applyQualityResultsToItems,
  createQualityQueue,
  summarizeQualityResults
} from './utils/qualityWorkflow.mjs'
import { summarizeVisualQuality } from './utils/visualQualityWorkflow.mjs'
import {
  createWorkspaceSnapshot,
  restoreWorkspaceSnapshot
} from './utils/workspaceSession.mjs'
import {
  recoverInterruptedItems,
  summarizeResumeCandidates
} from './utils/resumeWorkflow.mjs'
import { buildPublishPlan } from './utils/publishWorkflow.mjs'
import {
  diagnoseGenerationError,
  formatDiagnosisForLog
} from './utils/errorDiagnosis.mjs'
import {
  filterGoodsForReview,
  getGoodsReviewStats,
  getNextReviewItem
} from './utils/goodsReviewWorkflow.mjs'

const store = useAppStore()
const WORKSPACE_SNAPSHOT_KEY = 'aiTeachingWorkspaceSnapshot'

// Tab导航配置
const activeTab = ref('create')
const tabs = [
  { key: 'create', label: '创作', icon: 'MagicStick' },
  { key: 'xiaohongshu', label: '小红书', icon: 'ChatDotRound' },
  { key: 'textImage', label: '文生图', icon: 'Picture' },
  { key: 'recreate', label: '二创', icon: 'Edit' },
  { key: 'separation', label: '图文分离', icon: 'Crop' },
  { key: 'templates', label: '模板库', icon: 'Grid' },
  { key: 'projects', label: '作品集', icon: 'Folder' },
  { key: 'toolbox', label: '百宝箱', icon: 'Box' },
]

// 本地状态
const showSettings = ref(false)
const showPromptManager = ref(false)
const showToolbox = ref(false)
const showCreativeSuite = ref(false)
const showPlatformCenter = ref(false)
const showUnifiedHistory = ref(false)
const logCollapsed = ref(false)
const logTextarea = ref(null)
const previewIndex = ref(0)
const imagePreviewVisible = ref(false)
const previewImageUrl = ref('')
const magicWandLoading = ref(false)
const selectedRenderMode = ref('openaiRedraw')
const showAiAssistant = ref(false)
const aiAssistantInput = ref('')
const taskHistory = ref([])
const historyFilter = ref('all')

// 更新状态
const showUpdateDialog = ref(false)
const updateState = ref({
  hasUpdate: false,
  latestVersion: '',
  releaseDate: '',
  releaseNotes: '',
  downloading: false,
  progress: 0,
  downloadSpeed: '',
  downloaded: false
})
const importPageRanges = ref('')
const textImageRedoRequest = ref(null)
const goodsStatusFilter = ref('all')
const goodsKeyword = ref('')
const goodsSelectedOnly = ref(false)
let workspaceRestoreDone = false

function hasConfiguredApiToken() {
  return Boolean(store.config.api.hasToken || store.config.api.token)
}

// 主题切换
const isDarkTheme = ref(false)

const toggleTheme = () => {
  isDarkTheme.value = !isDarkTheme.value
  document.documentElement.setAttribute('data-theme', isDarkTheme.value ? 'dark' : 'light')
  localStorage.setItem('theme', isDarkTheme.value ? 'dark' : 'light')
}

// 作品集
const projects = ref([])
const loadProjects = async () => {
  try {
    const result = await window.electronAPI.getProjects()
    if (result.success) {
      recordHistoryForBatch()
      projects.value = result.projects
    }
  } catch (err) {
    console.error('加载作品集失败:', err)
  }
}

const saveCurrentProject = async () => {
  if (!previewItem.value) return
  try {
    const result = await window.electronAPI.saveProject({
      name: previewItem.value.title,
      sourceImage: previewItem.value.referenceImage,
      generatedImage: previewItem.value.generatedImage,
      prompt: store.promptText,
      style: store.selectedTemplate
    })
    if (result.success) {
      ElMessage.success('作品已保存到作品集')
      loadProjects()
    }
  } catch (err) {
    ElMessage.error('保存失败: ' + err.message)
  }
}

const deleteProject = async (projectId) => {
  try {
    await ElMessageBox.confirm('确定要删除这个作品吗？', '确认删除', { type: 'warning' })
    const result = await window.electronAPI.deleteProject({ projectId })
    if (result.success) {
      ElMessage.success('作品已删除')
      loadProjects()
    }
  } catch {
    // 用户取消
  }
}

const getProjectPreviewSrc = (project) => {
  const imgPath = project.generatedImage || project.sourceImage
  if (imgPath) {
    return `file:///${imgPath.replace(/\\/g, '/')}`
  }
  return ''
}

// 预览图片
const previewItem = computed(() => {
  if (store.goodsList.length === 0) return null
  return store.goodsList[previewIndex.value]
})

const selectedRenderModeLabel = computed(() => {
  const map = {
    openaiRedraw: '参考图重绘',
    faithful: 'OCR 内容保真',
    twoStage: 'OCR 二段式',
    strongStyle: '强风格包装'
  }
  return map[selectedRenderMode.value] || '生成模式'
})
const selectedSizeLabel = computed(() => (
  store.sizeOptions.find(option => option.value === store.selectedSize)?.label || store.selectedSize || '尺寸'
))
const selectedResolutionLabel = computed(() => (
  store.resolutionOptions.find(option => option.value === store.selectedResolution)?.label || store.selectedResolution || '分辨率'
))
const previewErrorDiagnosis = computed(() => (
  previewItem.value?.error ? diagnoseGenerationError(previewItem.value.error) : null
))
const goodsReviewStats = computed(() => getGoodsReviewStats(store.goodsList))
const visibleGoodsList = computed(() => filterGoodsForReview(store.goodsList, {
  status: goodsStatusFilter.value,
  keyword: goodsKeyword.value,
  selectedOnly: goodsSelectedOnly.value
}))
const goodsFilterOptions = computed(() => [
  { label: `全部 ${goodsReviewStats.value.total}`, value: 'all' },
  { label: `待生成 ${goodsReviewStats.value.pending}`, value: 'pending' },
  { label: `生成中 ${goodsReviewStats.value.running}`, value: 'running' },
  { label: `已完成 ${goodsReviewStats.value.completed}`, value: 'completed' },
  { label: `失败 ${goodsReviewStats.value.failed}`, value: 'failed' }
])

const visibleTaskHistory = computed(() => filterTaskRecords(taskHistory.value, historyFilter.value))
const historyStats = computed(() => getTaskHistoryStats(taskHistory.value))
const resumeSummary = computed(() => summarizeResumeCandidates(store.goodsList))
const satisfiedCompletedItems = computed(() => taskHistory.value
  .filter(record => record.reviewStatus === 'satisfied' && record.generatedImage)
  .map((record, index) => ({
    id: record.itemId || index + 1,
    title: record.title,
    generatedImage: record.generatedImage,
    folderName: record.folderName
  })))

function isPendingStatus(status) {
  return status === '待生成' || status === 'pending'
}

function isRunningStatus(status) {
  return status === '生成中' || status === 'running'
}

function isCompletedStatus(status) {
  return status === '已完成' || status === 'completed'
}

function isFailedStatus(status) {
  return status === '失败' || status === 'failed'
}

// 日志文本
const logText = computed(() => store.logs.join('\n'))

// 监听日志变化，自动滚动到底部
watch(() => store.logs.length, () => {
  nextTick(() => {
    if (logTextarea.value) {
      logTextarea.value.scrollTop = logTextarea.value.scrollHeight
    }
  })
})

// 监听进度更新
onMounted(() => {
  // 监听来自主进程的日志消息
  window.electronAPI.onLogMessage((message) => {
    store.addLog(message)
  })

  // 监听进度更新
  window.electronAPI.onProgressUpdate((data) => {
    store.progress = data.progress
  })

  // 监听商品状态更新
  window.electronAPI.onItemStatusUpdate((item) => {
    store.updateItemStatus(item)
  })

  // 加载配置
  loadConfig()

  // 加载主题
  const savedTheme = localStorage.getItem('theme')
  if (savedTheme === 'dark') {
    isDarkTheme.value = true
    document.documentElement.setAttribute('data-theme', 'dark')
  }

  // 加载作品集
  loadProjects()
})

onMounted(() => {
  loadProjects()
  taskHistory.value = loadTaskHistory(localStorage)
  restoreWorkspaceSession()

  // 监听更新事件
  if (window.electronAPI.onUpdateAvailable) {
    window.electronAPI.onUpdateAvailable((data) => {
      updateState.value.hasUpdate = true
      updateState.value.latestVersion = data?.version || ''
      updateState.value.releaseDate = data?.releaseDate || ''
      updateState.value.releaseNotes = data?.releaseNotes || ''
      store.addLog(`[更新] 发现新版本: ${data?.version}`, 'INFO', 'Updater')
    })

    window.electronAPI.onUpdateDownloadProgress((data) => {
      updateState.value.downloading = true
      updateState.value.progress = data?.percent || 0
      if (data?.bytesPerSecond) {
        const speed = data.bytesPerSecond
        if (speed > 1024 * 1024) {
          updateState.value.downloadSpeed = `${(speed / 1024 / 1024).toFixed(1)} MB/s`
        } else if (speed > 1024) {
          updateState.value.downloadSpeed = `${(speed / 1024).toFixed(0)} KB/s`
        } else {
          updateState.value.downloadSpeed = `${speed} B/s`
        }
      }
    })

    window.electronAPI.onUpdateDownloaded((data) => {
      updateState.value.downloading = false
      updateState.value.downloaded = true
      updateState.value.latestVersion = data?.version || updateState.value.latestVersion
      store.addLog(`[更新] 新版本 ${data?.version} 下载完成`, 'INFO', 'Updater')
      showUpdateDialog.value = true
    })

    window.electronAPI.onUpdateError((data) => {
      updateState.value.downloading = false
      store.addLog(`[更新] 更新失败: ${data?.message}`, 'WARN', 'Updater')
    })
  }
})

onUnmounted(() => {
  // 移除监听器
  window.electronAPI.removeAllListeners('log-message')
  window.electronAPI.removeAllListeners('update-progress')
  window.electronAPI.removeAllListeners('update-item-status')
})

// 加载配置
async function loadConfig() {
  try {
    const savedConfig = await window.electronAPI.getConfig()
    if (savedConfig) {
      Object.assign(store.config, savedConfig)
    }
  } catch (error) {
    console.error('加载配置失败:', error)
  }
}

function saveWorkspaceSession() {
  if (!workspaceRestoreDone) return
  try {
    const snapshot = createWorkspaceSnapshot({
      goodsList: store.goodsList,
      promptText: store.promptText,
      selectedTemplate: store.selectedTemplate,
      selectedSize: store.selectedSize,
      selectedResolution: store.selectedResolution,
      selectedRenderMode: selectedRenderMode.value,
      currentFolderName: store.currentFolderName,
      activeTab: activeTab.value
    })
    localStorage.setItem(WORKSPACE_SNAPSHOT_KEY, JSON.stringify(snapshot))
  } catch (error) {
    console.warn('workspace snapshot save failed', error)
  }
}

function restoreWorkspaceSession() {
  if (workspaceRestoreDone) return
  try {
    const snapshot = restoreWorkspaceSnapshot(localStorage.getItem(WORKSPACE_SNAPSHOT_KEY))
    if (!snapshot) return

    if (snapshot.goodsList.length && store.goodsList.length === 0) {
      store.goodsList = snapshot.goodsList
      store.currentFolderName = snapshot.currentFolderName || store.currentFolderName
      previewIndex.value = 0
      ElMessage.info('已恢复上次工作现场')
    }
    store.promptText = snapshot.promptText || store.promptText
    store.selectedTemplate = snapshot.selectedTemplate || store.selectedTemplate
    store.selectedSize = snapshot.selectedSize || store.selectedSize
    store.selectedResolution = snapshot.selectedResolution || store.selectedResolution
    selectedRenderMode.value = snapshot.selectedRenderMode || selectedRenderMode.value
    activeTab.value = snapshot.activeTab || activeTab.value
  } catch (error) {
    localStorage.removeItem(WORKSPACE_SNAPSHOT_KEY)
    console.warn('workspace snapshot restore failed', error)
  } finally {
    workspaceRestoreDone = true
  }
}

watch(
  () => ({
    goodsList: store.goodsList,
    promptText: store.promptText,
    selectedTemplate: store.selectedTemplate,
    selectedSize: store.selectedSize,
    selectedResolution: store.selectedResolution,
    selectedRenderMode: selectedRenderMode.value,
    currentFolderName: store.currentFolderName,
    activeTab: activeTab.value
  }),
  saveWorkspaceSession,
  { deep: true }
)

function saveHistory(records) {
  taskHistory.value = records
  saveTaskHistory(localStorage, records)
}

function buildHistoryRecord(item) {
  return createTaskRecord({
    item,
    folderName: store.currentFolderName,
    provider: store.config.api.provider || 'openai',
    model: store.config.api.imageModel || 'gpt-image-2',
    mode: selectedRenderMode.value,
    prompt: store.promptText
  })
}

function recordHistoryForItem(item) {
  if (!item) return
  const record = buildHistoryRecord(item)
  saveHistory(upsertTaskRecord(taskHistory.value, record))
}

function recordHistoryForBatch() {
  const finishedItems = store.goodsList.filter(item => item.generatedImage || item.error)
  finishedItems.forEach(recordHistoryForItem)
}

function handleGeneratedHistoryRecord(record) {
  saveHistory(upsertTaskRecord(taskHistory.value, record))
}

function markPreviewHistory(reviewStatus) {
  if (!previewItem.value) return
  recordHistoryForItem(previewItem.value)
  const record = buildHistoryRecord(previewItem.value)
  saveHistory(markTaskRecord(taskHistory.value, record.id, reviewStatus))
  ElMessage.success(reviewStatus === 'satisfied' ? '已标记为满意' : '已标记为需复查')
}

async function qualityCheckPreview() {
  if (!previewItem.value?.generatedImage) {
    ElMessage.warning('当前图片还没有生成结果')
    return
  }

  try {
    ElMessage.info('正在进行OCR质检...')
    const result = await window.electronAPI.qualityCheckImage({
      sourceImage: previewItem.value.referenceImage,
      generatedImage: previewItem.value.generatedImage
    })

    if (!result.success) {
      ElMessage.warning(result.error || 'OCR质检未完成')
      return
    }

    previewItem.value.qualityScore = result.score
    previewItem.value.qualityNeedsReview = result.needsReview
    const visualResult = await window.electronAPI.visualQualityCheckImage({
      imagePath: previewItem.value.generatedImage,
      targetRatio: store.selectedSize
    })
    if (visualResult.success) {
      previewItem.value.visualQualityScore = visualResult.score
      previewItem.value.visualQualityNeedsReview = visualResult.needsReview
      previewItem.value.visualQualityWarnings = visualResult.warnings || []
      previewItem.value.qualityNeedsReview = Boolean(previewItem.value.qualityNeedsReview || visualResult.needsReview)
    }
    recordHistoryForItem(previewItem.value)

    if (previewItem.value.qualityNeedsReview) {
      const record = buildHistoryRecord(previewItem.value)
      saveHistory(markTaskRecord(taskHistory.value, record.id, 'review'))
      ElMessage.warning(`质检需复查：OCR ${result.score} 分，视觉 ${visualResult.success ? visualResult.score : '未完成'} 分`)
    } else {
      ElMessage.success(`质检通过：OCR ${result.score} 分，视觉 ${visualResult.success ? visualResult.score : '未完成'} 分`)
    }
  } catch (error) {
    ElMessage.error('OCR质检失败: ' + error.message)
  }
}

async function runQualityCheckForCompleted() {
  const queue = createQualityQueue(store.goodsList).slice(0, 20)
  if (!queue.length) return

  const results = []
  const visualResults = []
  for (const item of queue) {
    try {
      const result = await window.electronAPI.qualityCheckImage({
        sourceImage: item.referenceImage,
        generatedImage: item.generatedImage
      })
      results.push({
        id: item.id,
        title: item.title,
        score: result.score,
        needsReview: Boolean(result.needsReview),
        error: result.success ? '' : (result.error || 'quality check failed')
      })
    } catch (error) {
      results.push({
        id: item.id,
        title: item.title,
        error: error.message
      })
      store.addLog(`[WARN] [Quality] ${item.title} OCR质检失败: ${error.message}`)
    }

    try {
      const visualResult = await window.electronAPI.visualQualityCheckImage({
        imagePath: item.generatedImage,
        targetRatio: store.selectedSize
      })
      visualResults.push({
        id: item.id,
        title: item.title,
        score: visualResult.score,
        needsReview: Boolean(visualResult.needsReview),
        warnings: visualResult.warnings || [],
        error: visualResult.success ? '' : (visualResult.error || 'visual quality check failed')
      })
    } catch (error) {
      visualResults.push({
        id: item.id,
        title: item.title,
        error: error.message
      })
      store.addLog(`[WARN] [Quality] ${item.title} 视觉质检失败: ${error.message}`)
    }
  }

  store.goodsList = applyQualityResultsToItems(store.goodsList, results)
  const visualMap = new Map(visualResults.map(result => [result.id, result]))
  store.goodsList = store.goodsList.map(item => {
    const visualResult = visualMap.get(item.id)
    if (!visualResult) return item
    return {
      ...item,
      visualQualityScore: visualResult.score ?? item.visualQualityScore,
      visualQualityNeedsReview: Boolean(visualResult.needsReview || visualResult.error),
      visualQualityWarnings: visualResult.warnings || [],
      visualQualityStatus: visualResult.error ? 'failed' : (visualResult.needsReview ? 'review' : 'passed'),
      visualQualityError: visualResult.error || '',
      qualityNeedsReview: Boolean(item.qualityNeedsReview || visualResult.needsReview || visualResult.error)
    }
  })
  store.goodsList.forEach(item => {
    if (!item.qualityStatus && !item.visualQualityStatus) return
    recordHistoryForItem(item)
    if (item.qualityNeedsReview) {
      const record = buildHistoryRecord(item)
      saveHistory(markTaskRecord(taskHistory.value, record.id, 'review'))
    }
  })

  const summary = summarizeQualityResults(results)
  const visualSummary = summarizeVisualQuality(visualResults)
  store.addLog(`[Quality] OCR质检完成: ${summary.passed} 通过, ${summary.review} 需复查, ${summary.failed} 失败`)
  store.addLog(`[Quality] 视觉质检完成: ${visualSummary.passed} 通过, ${visualSummary.review} 需复查, ${visualSummary.failed} 失败`)
}

function markHistory(record, reviewStatus) {
  saveHistory(markTaskRecord(taskHistory.value, record.id, reviewStatus))
}

function deleteHistoryRecord(record) {
  saveHistory(deleteTaskRecord(taskHistory.value, record.id))
  ElMessage.success('历史记录已删除')
}

async function clearHistoryRecords() {
  try {
    await ElMessageBox.confirm(
      '确定要清空所有统一历史记录吗？这个操作不会删除本地图片文件。',
      '清空历史记录',
      {
        type: 'warning',
        confirmButtonText: '清空',
        cancelButtonText: '取消'
      }
    )
    saveHistory(clearTaskRecords())
    ElMessage.success('历史记录已清空')
  } catch {
    // 用户取消，无需提示。
  }
}

function reuseHistoryPrompt(record) {
  if (!record?.prompt) {
    ElMessage.warning('这条历史没有可复用提示词')
    return
  }
  store.promptText = record.prompt
  activeTab.value = 'create'
  showUnifiedHistory.value = false
  ElMessage.success('提示词已回填到创作页')
}

function redoHistoryRecord(record) {
  const payload = createHistoryRedoPayload(record)
  if (!payload?.prompt) {
    ElMessage.warning('这条历史缺少可重做的提示词')
    return
  }

  showUnifiedHistory.value = false
  if (payload.type === 'textToImage') {
    textImageRedoRequest.value = {
      ...payload,
      requestedAt: Date.now()
    }
    activeTab.value = 'textImage'
    ElMessage.info('已回到文生图页，正在重做')
    return
  }

  store.promptText = payload.prompt
  activeTab.value = 'create'
  ElMessage.success('已回填到创作页，可重新生成')
}

function selectHistoryRecord(record) {
  const index = store.goodsList.findIndex(item =>
    item.id === record.itemId ||
    item.title === record.title ||
    item.generatedImage === record.generatedImage ||
    item.referenceImage === record.sourceImage
  )
  if (index >= 0) {
    previewIndex.value = index
    activeTab.value = 'create'
  } else if (record.generatedImage || record.sourceImage) {
    openImagePreview(record.generatedImage || record.sourceImage)
  }
}

function openRecordFolder(record) {
  const imgPath = record.generatedImage || record.sourceImage
  if (!imgPath) return ElMessage.warning('暂无可打开的位置')
  const folderPath = imgPath.replace(/[\\/][^\\/]+$/, '')
  window.electronAPI.openFolder(folderPath)
}

function openPreviewResultFolder() {
  if (!previewItem.value?.generatedImage) return ElMessage.warning('当前图片还没有生成结果')
  const folderPath = previewItem.value.generatedImage.replace(/[\\/][^\\/]+$/, '')
  window.electronAPI.openFolder(folderPath)
}

async function redoPreviewItem() {
  if (!previewItem.value) return
  if (!hasConfiguredApiToken()) {
    ElMessage.warning('请先配置 API Key')
    showSettings.value = true
    return
  }

  const item = previewItem.value
  item.status = 'running'
  item.error = null
  item.generatedImage = null
  store.isGenerating = true

  try {
    const result = selectedRenderMode.value === 'openaiRedraw'
      ? await window.electronAPI.batchGenerate({
          goodsList: [{
            id: item.id,
            title: item.title,
            folderName: item.folderName,
            referenceImage: item.referenceImage,
            status: 'pending',
            generatedImage: null,
            error: null,
            sizeMB: item.sizeMB
          }],
          promptText: store.promptText || '',
          concurrency: 1,
          size: store.selectedSize,
          quality: store.config.api.imageQuality || store.config.api.finalQuality || 'high'
        })
      : await window.electronAPI.batchOcrRender({
          goodsList: [{
            id: item.id,
            title: item.title,
            folderName: item.folderName,
            referenceImage: item.referenceImage,
            status: 'pending',
            generatedImage: null,
            error: null,
            sizeMB: item.sizeMB
          }],
          title: store.promptText || '',
          mode: selectedRenderMode.value
        })

    recordHistoryForItem(item)
    if (result.success) {
      ElMessage.success('当前图片已重做')
    } else {
      ElMessage.error(result.error || '重做失败')
    }
  } catch (error) {
    ElMessage.error('重做失败: ' + error.message)
  } finally {
    store.isGenerating = false
  }
}

// 导入文件夹
async function handleImportFolder() {
  try {
    const result = await window.electronAPI.importFolder()
    if (result.canceled) return
    if (result.error) {
      ElMessage.error(result.error)
      return
    }

    // 导入后默认选中所有图片
    store.goodsList = result.goods.map(item => ({ ...item, selected: true }))
    store.currentFolderName = result.folderName
    store.currentFolderPath = result.folderPath
    previewIndex.value = 0
    store.addLog(`成功导入 ${result.goods.length} 张图片`)

    // 大文件警告
    if (result.largeFiles > 0) {
      ElMessage.warning(`发现 ${result.largeFiles} 个大于20MB的文件，可能导致API传输超时`)
    } else {
      ElMessage.success(`成功导入 ${result.goods.length} 张图片（已全选，可取消不需要的图片）`)
    }
  } catch (error) {
    ElMessage.error('导入失败: ' + error.message)
  }
}

// 导入图片文件
async function handleImportFiles() {
  try {
    const result = await window.electronAPI.importFiles()
    if (result.canceled) return
    if (result.error) {
      ElMessage.error(result.error)
      return
    }

    // 导入后默认选中所有图片
    store.goodsList = result.goods.map(item => ({ ...item, selected: true }))
    store.currentFolderName = result.folderName
    store.currentFolderPath = result.folderPath
    previewIndex.value = 0
    store.addLog(`成功导入 ${result.goods.length} 张图片`)

    // 大文件警告
    if (result.largeFiles > 0) {
      ElMessage.warning(`发现 ${result.largeFiles} 个大于20MB的文件，可能导致API传输超时`)
    } else {
      ElMessage.success(`成功导入 ${result.goods.length} 张图片（已全选，可取消不需要的图片）`)
    }
  } catch (error) {
    ElMessage.error('导入失败: ' + error.message)
  }
}

async function handleImportMaterials() {
  try {
    const result = await window.electronAPI.importMaterialFiles({
      pageRanges: importPageRanges.value
    })
    if (result.canceled) return
    if (result.error) {
      ElMessage.error(result.error)
      return
    }

    store.goodsList = result.goods.map(item => ({ ...item, selected: true }))
    store.currentFolderName = result.folderName
    store.currentFolderPath = result.folderPath
    previewIndex.value = 0
    store.addLog(`成功导入素材 ${result.goods.length} 页`)
    ElMessage.success(`成功导入 ${result.goods.length} 页素材`)
  } catch (error) {
    ElMessage.error('素材导入失败: ' + error.message)
  }
}

// 详细的错误提示函数
function showErrorWithDetails(error, context = '') {
  const message = error.message || error.error || String(error)
  const diagnosis = diagnoseGenerationError(error)
  const actionText = diagnosis.actions.length ? `建议：${diagnosis.actions.join('；')}` : ''

  ElMessage({
    message: `${diagnosis.title}${context ? ' (' + context + ')' : ''}: ${diagnosis.summary}${actionText ? '。' + actionText : ''}`,
    type: 'error',
    duration: 8000,
    showClose: true
  })

  store.addLog(`[错误诊断] ${formatDiagnosisForLog(diagnosis, context || '生成任务')}`, 'ERROR')
  return

  // 解析常见错误类型
  let errorType = '未知错误'
  let errorSolution = ''

  if (message.includes('429') || message.includes('rate') || message.includes('quota')) {
    errorType = '请求频率限制'
    errorSolution = '请等待一段时间后重试，或切换到其他API提供商'
  } else if (message.includes('401') || message.includes('Unauthorized')) {
    errorType = 'API密钥无效'
    errorSolution = '请检查API密钥是否正确，或重新获取密钥'
  } else if (message.includes('400') || message.includes('Bad Request')) {
    errorType = '请求参数错误'
    errorSolution = '请检查API配置是否正确'
  } else if (message.includes('403') || message.includes('Forbidden')) {
    errorType = 'API访问被拒绝'
    errorSolution = '请检查API密钥权限或账户状态'
  } else if (message.includes('500') || message.includes('502') || message.includes('503')) {
    errorType = '服务器错误'
    errorSolution = '服务器暂时不可用，请稍后重试'
  } else if (message.includes('timeout') || message.includes('ETIMEDOUT')) {
    errorType = '请求超时'
    errorSolution = '网络连接超时，请检查网络或代理设置'
  } else if (message.includes('ECONNREFUSED') || message.includes('ECONNRESET')) {
    errorType = '连接失败'
    errorSolution = '无法连接到服务器，请检查网络或代理设置'
  } else if (message.includes('404')) {
    errorType = '接口不存在'
    errorSolution = 'API端点不存在，请检查API地址'
  } else if (message.includes('不支持')) {
    errorType = '功能不支持'
    errorSolution = message
  }

  // 显示错误提示
  ElMessage({
    message: `${errorType}${context ? ' (' + context + ')' : ''}: ${errorSolution || message}`,
    type: 'error',
    duration: 5000,
    showClose: true
  })

  // 同时记录到日志
  store.addLog(`[错误] ${errorType}: ${message}`, 'ERROR')
}

// 批量删除
async function handleBatchDelete() {
  const selectedItems = store.selectedItems
  if (selectedItems.length === 0) {
    ElMessage.warning('请先选择要删除的图片')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedItems.length} 张图片吗？此操作不可恢复。`,
      '确认批量删除',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }
    )

    // 从goodsList中移除选中的项目
    const selectedIds = selectedItems.map(item => item.id)
    store.goodsList = store.goodsList.filter(item => !selectedIds.includes(item.id))

    // 调整预览索引
    if (previewIndex.value >= store.goodsList.length) {
      previewIndex.value = Math.max(0, store.goodsList.length - 1)
    }

    ElMessage.success(`已删除 ${selectedItems.length} 张图片`)
  } catch {
    // 用户取消
  }
}

// 批量生成
async function handleBatchGenerate() {
  if (store.goodsList.length === 0) {
    ElMessage.warning('请先导入商品图片')
    return
  }

  if (!hasConfiguredApiToken()) {
    ElMessage.warning('请先配置API密钥')
    showSettings.value = true
    return
  }

  if (selectedRenderMode.value === 'openaiRedraw' && !['openai', 'lupoapi'].includes(store.config.api.provider)) {
    ElMessage.warning('OpenAI参考图重绘需要在 API 设置中选择 OpenAI 提供商')
    showSettings.value = true
    return
  }

  const pendingItems = store.goodsList.filter(item => isPendingStatus(item.status))
  if (pendingItems.length === 0) {
    ElMessage.info('没有待生成的图片')
    return
  }

  try {
    await ElMessageBox.confirm(
      selectedRenderMode.value === 'openaiRedraw'
        ? `将使用 OpenAI 参考图重绘 ${pendingItems.length} 张图片，确认继续？`
        : `将开始OCR提取+本地渲染 ${pendingItems.length} 张图片（每张约5-10秒），确认继续？`,
      '确认批量生成',
      { type: 'info' }
    )

    store.isGenerating = true
    store.progress = 0

    // 标记所有待生成项
    pendingItems.forEach(item => {
      item.status = 'pending'
      item.selected = false
    })

    // 清理数据为纯对象
    const cleanList = JSON.parse(JSON.stringify(pendingItems.map(item => ({
      id: item.id,
      title: item.title,
      folderName: item.folderName,
      referenceImage: item.referenceImage,
      status: 'pending',
      generatedImage: null,
      error: null,
      sizeMB: item.sizeMB
    }))))

    const result = selectedRenderMode.value === 'openaiRedraw'
      ? await window.electronAPI.batchGenerate({
          goodsList: cleanList,
          promptText: store.promptText || '',
          concurrency: store.config.batch.maxConcurrency,
          size: store.selectedSize,
          quality: store.config.api.imageQuality || store.config.api.finalQuality || 'high'
        })
      : await window.electronAPI.batchOcrRender({
          goodsList: cleanList,
          title: store.promptText || '',
          mode: selectedRenderMode.value
        })

    if (result.canceled) {
      ElMessage.info('已取消')
      return
    }

    if (result.success) {
      ElMessage.success(`生成完成：成功 ${result.successCount} 张，失败 ${result.failCount} 张`)
      recordHistoryForBatch()
      runQualityCheckForCompleted()
      // 询问是否打开输出文件夹
      try {
        await ElMessageBox.confirm(
          `成功生成 ${result.successCount} 张图片，是否打开文件夹查看？`,
          '生成完成',
          { type: 'success', confirmButtonText: '打开文件夹', cancelButtonText: '关闭' }
        )
        window.electronAPI.openFolder(result.outputDir)
      } catch {}
    } else {
      showErrorWithDetails({ message: result.error || '生成失败' }, '批量生成')
    }
  } catch (error) {
    if (error !== 'cancel') {
      showErrorWithDetails(error, '批量生成')
    }
  } finally {
    store.isGenerating = false
  }
}

// 停止生成
async function stopGenerate() {
  try {
    await window.electronAPI.stopGeneration()
  } catch (error) {
    console.warn('stop generation failed', error)
  }
  store.isGenerating = false
  ElMessage.info('已请求停止生成，队列会尽快中断')
}

function handleRecoverInterrupted() {
  const interrupted = resumeSummary.value.interrupted
  if (interrupted === 0) {
    ElMessage.info('没有需要恢复的中断任务')
    return
  }
  store.goodsList = recoverInterruptedItems(store.goodsList)
  store.progress = store.totalCount > 0
    ? Math.round((store.completedCount / store.totalCount) * 100)
    : 0
  ElMessage.success(`已恢复 ${interrupted} 个中断任务为待生成，失败项不会自动重试`)
}

// 一键分发准备
async function handleDistribute() {
  const completed = store.goodsList.filter(item => isCompletedStatus(item.status) && item.generatedImage)
  if (completed.length === 0) {
    ElMessage.warning('没有可分发的已完成图片')
    return
  }

  try {
    const result = await window.electronAPI.exportImages({
      completed,
      folderName: `${store.currentFolderName || '小红书分发'}_分发包`,
      failedCount: store.failedCount
    })
    if (result.canceled) return
    if (result.success) {
      completed.forEach(item => {
        item.distributed = true
      })
      ElMessage.success(`分发包已准备：${result.successCount} 张图片`)
      await window.electronAPI.openFolder(result.exportFolder)
      const publishText = buildXiaohongshuPublishText(completed)
      await window.electronAPI.writeClipboardText(publishText)
      await window.electronAPI.openExternal('https://creator.xiaohongshu.com/publish/publish')
      ElMessage.success('发布文案已复制，并已打开小红书创作者发布页')
    } else {
      ElMessage.error(result.error || '分发包准备失败')
    }
  } catch (error) {
    ElMessage.error('分发包准备失败: ' + error.message)
  }
}

function buildXiaohongshuPublishText(items) {
  const folderName = store.currentFolderName || 'AI教辅资料'
  const count = items.length
  const plan = buildPublishPlan({
    title: folderName,
    count,
    grade: inferPublishGrade(folderName),
    subject: inferPublishSubject(folderName)
  })

  return [
    '【标题备选】',
    ...plan.titles.map((title, index) => `${index + 1}. ${title}`),
    '',
    '【正文模板】',
    plan.texts[0],
    '',
    '【标签】',
    plan.tags.join(' '),
    '',
    '【发布时间】',
    plan.suggestedTime
  ].join('\n')
}

function inferPublishGrade(text) {
  const value = String(text || '')
  const match = value.match(/([一二三四五六七八九]|[1-9])年级/)
  return match ? `${match[1]}年级` : '小学'
}

function inferPublishSubject(text) {
  const value = String(text || '')
  const subjects = ['语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '道法']
  return subjects.find(subject => value.includes(subject)) || '学习'
}

// 一键清空分发
function handleClearDistribute() {
  store.goodsList.forEach(item => {
    item.distributed = false
  })
  ElMessage.success('已清空分发状态')
}

// 导出图片
async function handleExport() {
  const completed = store.goodsList.filter(item => isCompletedStatus(item.status) && item.generatedImage)
  const failedCount = store.failedCount

  if (completed.length === 0) {
    ElMessage.warning('没有可导出的图片')
    return
  }

  try {
    const result = await window.electronAPI.exportImages({
      completed,
      folderName: store.currentFolderName,
      failedCount
    })

    if (result.canceled) return

    if (result.success) {
      ElMessage.success(`导出完成：成功 ${result.successCount} 个`)
      await window.electronAPI.openFolder(result.exportFolder)
    }
  } catch (error) {
    ElMessage.error('导出失败: ' + error.message)
  }
}

// 修改商品主图
async function handleExportSatisfied() {
  const completed = satisfiedCompletedItems.value
  if (completed.length === 0) {
    ElMessage.warning('还没有标记为满意的生成图')
    return
  }

  try {
    const result = await window.electronAPI.exportImages({
      completed,
      folderName: `${store.currentFolderName || '满意图片'}_满意`,
      failedCount: 0
    })
    if (result.canceled) return
    if (result.success) {
      ElMessage.success(`满意图片导出完成：${result.successCount} 张`)
      await window.electronAPI.openFolder(result.exportFolder)
    }
  } catch (error) {
    ElMessage.error('导出满意失败: ' + error.message)
  }
}

async function handleExportPdf() {
  const completed = satisfiedCompletedItems.value.length > 0
    ? satisfiedCompletedItems.value
    : store.goodsList.filter(item => isCompletedStatus(item.status) && item.generatedImage)

  if (completed.length === 0) {
    ElMessage.warning('没有可合成 PDF 的图片')
    return
  }

  try {
    const result = await window.electronAPI.exportImagesToPdf({
      completed,
      folderName: satisfiedCompletedItems.value.length > 0
        ? `${store.currentFolderName || 'AI教辅'}_满意`
        : store.currentFolderName || 'AI教辅'
    })
    if (result.canceled) return
    if (result.success) {
      ElMessage.success(`PDF合成完成：${result.successCount} 页`)
      await window.electronAPI.openFolder(result.outputDir)
    } else {
      ElMessage.error(result.error || 'PDF合成失败')
    }
  } catch (error) {
    ElMessage.error('PDF合成失败: ' + error.message)
  }
}

async function handleModifyCover() {
  if (!previewItem.value) {
    ElMessage.warning('请先选择一个商品')
    return
  }

  const result = await window.electronAPI.openFileDialog({
    properties: ['openFile'],
    title: '选择新的商品主图',
    filters: [
      { name: '图片文件', extensions: ['jpg', 'jpeg', 'png', 'webp'] }
    ]
  })
  if (result.canceled || !result.filePaths?.length) return

  const item = previewItem.value
  item.referenceImage = result.filePaths[0]
  item.title = result.filePaths[0].split(/[\\/]/).pop() || item.title
  item.generatedImage = null
  item.status = '待生成'
  item.error = null
  ElMessage.success('商品主图已更新')
}

// 使用作品集中的作品
async function useProject(project) {
  store.promptText = project.prompt || ''
  if (project.sourceImage) {
    const lastSlash = Math.max(project.sourceImage.lastIndexOf('/'), project.sourceImage.lastIndexOf('\\'))
    const folderPath = lastSlash >= 0 ? project.sourceImage.substring(0, lastSlash) : ''
    if (folderPath) {
      const result = await window.electronAPI.importFolderPath(folderPath)
      if (result?.goods) {
        store.goodsList = result.goods.map(item => ({ ...item, selected: true }))
        store.currentFolderName = result.folderName
        store.currentFolderPath = result.folderPath
      }
    }
  }
  activeTab.value = 'create'
  ElMessage.success('作品已加载')
}

// 删除单个图片
async function removeItem(item) {
  try {
    await ElMessageBox.confirm(
      `确定要删除"${item.title}"吗？`,
      '确认删除',
      { type: 'warning' }
    )
    const index = store.goodsList.findIndex(i => i.id === item.id)
    if (index !== -1) {
      store.goodsList.splice(index, 1)
      if (previewIndex.value >= store.goodsList.length) {
        previewIndex.value = Math.max(0, store.goodsList.length - 1)
      }
      ElMessage.success('已删除')
    }
  } catch {
    // 用户取消
  }
}

// 刷新
function handleRefresh() {
  if (store.goodsList.length === 0) {
    ElMessage.info('没有商品数据')
    return
  }
  if (store.currentFolderPath) {
    store.addLog('刷新商品列表...')
    ElMessage.success('刷新成功')
  }
}

// Word/PDF/PPT转图片
async function handleWordPdfConvert() {
  try {
    const loResult = await window.electronAPI.checkLibreOffice()
    if (!loResult.installed) {
      ElMessage.warning('未检测到LibreOffice，请先安装：https://www.libreoffice.org')
      return
    }

    const fileResult = await window.electronAPI.openFileDialog({
      properties: ['openFile'],
      title: '选择要转换的文档',
      filters: [
        { name: '文档文件', extensions: ['pdf', 'doc', 'docx', 'ppt', 'pptx'] }
      ]
    })
    if (fileResult.canceled || !fileResult.filePaths?.length) return

    const inputPath = fileResult.filePaths[0]
    const ext = inputPath.split('.').pop().toLowerCase()
    ElMessage.info('正在转换文档，请稍候...')

    let pdfPath = inputPath
    if (['doc', 'docx', 'ppt', 'pptx'].includes(ext)) {
      const pdfResult = await window.electronAPI.docWordToPdf({ inputPath })
      if (!pdfResult.success) throw new Error(pdfResult.error || '文档转PDF失败')
      pdfPath = pdfResult.outputPath
    }

    const imageResult = await window.electronAPI.docPdfToImages({ inputPath: pdfPath })
    if (!imageResult.success) throw new Error(imageResult.error || 'PDF转图片失败')

    ElMessage.success(`转换完成，共 ${imageResult.pageCount || 0} 页`)
    await window.electronAPI.openFolder(imageResult.outputDir)
  } catch (error) {
    ElMessage.error('文档转图片失败: ' + error.message)
  }
}

// 魔法棒：智能提示词优化
async function handleMagicWand() {
  if (!hasConfiguredApiToken()) {
    ElMessage.warning('请先在API设置中配置API密钥')
    showSettings.value = true
    return
  }

  if (!store.promptText.trim()) {
    ElMessage.warning('请先输入简单的提示词关键词')
    return
  }

  magicWandLoading.value = true
  try {
    const result = await window.electronAPI.optimizePrompt({
      prompt: store.promptText
    })
    if (result.success) {
      store.promptText = result.optimized
      ElMessage.success('提示词已优化！')
    } else {
      ElMessage.error(result.error)
    }
  } catch (err) {
    ElMessage.error('优化失败: ' + err.message)
  }
  magicWandLoading.value = false
}

// 百宝箱应用提示词回调
function handleToolboxUsePrompt(prompt) {
  store.promptText = prompt
  activeTab.value = 'create'
  ElMessage.success('提示词已填入创作页')
}

// 网络诊断
async function handleNetworkDiagnosis() {
  if (!hasConfiguredApiToken()) {
    ElMessage.warning('请先配置API密钥')
    showSettings.value = true
    return
  }

  const loading = ElMessage({ message: '正在诊断网络...', type: 'info', duration: 0 })

  try {
    const result = await window.electronAPI.networkDiagnosis()
    loading.close()

    if (result.success) {
      ElMessage.success('网络诊断通过，API连接正常')
    } else {
      showErrorWithDetails({ message: result.message }, '网络诊断')
    }
  } catch (error) {
    loading.close()
    showErrorWithDetails(error, '网络诊断')
  }
}

// 更新相关
async function handleDownloadUpdate() {
  updateState.value.downloading = true
  updateState.value.progress = 0
  try {
    const result = await window.electronAPI.downloadUpdate()
    if (!result?.success) {
      ElMessage.error(result?.error || '下载更新失败')
      updateState.value.downloading = false
    }
  } catch (error) {
    ElMessage.error('下载更新失败: ' + error.message)
    updateState.value.downloading = false
  }
}

async function handleInstallUpdate() {
  try {
    await window.electronAPI.installUpdate()
  } catch (error) {
    ElMessage.error('安装更新失败: ' + error.message)
  }
}

// AI助手发送消息
async function handleAiAssistantSend() {
  const text = aiAssistantInput.value.trim()
  if (!text) return

  try {
    if (text.includes('优化') || text.includes('改写') || text.includes('提示词')) {
      const result = await window.electronAPI.optimizePrompt({
        prompt: store.promptText ? `${store.promptText}\n\n补充要求：${text}` : text
      })
      if (result.success) {
        store.promptText = result.optimized
        ElMessage.success('已优化并填入提示词')
      } else {
        ElMessage.error(result.error || '优化失败')
      }
    } else {
      store.promptText = store.promptText
        ? `${store.promptText}\n${text}`
        : text
      ElMessage.success('已添加到提示词')
    }
  } catch (error) {
    ElMessage.error('AI助手处理失败: ' + error.message)
  } finally {
    aiAssistantInput.value = ''
  }
}

// 预览相关
function handlePreviewItem(item) {
  previewIndex.value = store.goodsList.indexOf(item)
}

function resetGoodsFilters() {
  goodsStatusFilter.value = 'all'
  goodsKeyword.value = ''
  goodsSelectedOnly.value = false
}

function jumpToNextReviewItem(status = goodsStatusFilter.value) {
  const currentId = previewItem.value?.id
  const nextItem = getNextReviewItem(store.goodsList, currentId, {
    status,
    keyword: goodsKeyword.value,
    selectedOnly: goodsSelectedOnly.value
  })
  if (!nextItem) {
    ElMessage.info('没有符合条件的素材')
    return
  }
  handlePreviewItem(nextItem)
  goodsStatusFilter.value = status || 'all'
}

function prevPreview() {
  if (previewIndex.value > 0) {
    previewIndex.value--
  }
}

function nextPreview() {
  if (previewIndex.value < store.goodsList.length - 1) {
    previewIndex.value++
  }
}

function getItemPreviewSrc(item) {
  if (item.referenceImage) {
    return `file:///${item.referenceImage.replace(/\\/g, '/')}`
  }
  return ''
}

function getPreviewSrc(imagePath) {
  if (imagePath) {
    return `file:///${imagePath.replace(/\\/g, '/')}`
  }
  return ''
}

function openImagePreview(imagePath) {
  previewImageUrl.value = getPreviewSrc(imagePath)
  imagePreviewVisible.value = true
}

function getStatusType(status) {
  if (isPendingStatus(status)) return 'info'
  if (isRunningStatus(status)) return 'warning'
  if (isCompletedStatus(status)) return 'success'
  if (isFailedStatus(status)) return 'danger'
  const map = {
    '待生成': 'info',
    '生成中': 'warning',
    '已完成': 'success',
    '失败': 'danger'
  }
  return map[status] || 'info'
}

// 提示词模板切换
function handleTemplateChange(templateName) {
  const template = store.promptTemplates.find(t => t.name === templateName)
  if (template) {
    store.promptText = template.prompt
  }
}
</script>

<style lang="scss" scoped>
@use "sass:color";
// ============================================
// 学术蓝主题色: #1D4ED8
// ============================================
$primary: #1D4ED8;
$primary-light: #3B82F6;
$primary-dark: #1E40AF;
$primary-bg: #EFF6FF;

.app-container {
  --log-panel-height: 200px;
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f7fa;

  &:has(.log-panel.collapsed) {
    --log-panel-height: 36px;
  }
}

// ============================================
// 顶部标题栏
// ============================================
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  height: 56px;
  background: linear-gradient(135deg, $primary-dark 0%, $primary 50%, $primary-light 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  flex-shrink: 0;
  z-index: 10;

  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;

    .app-title {
      font-size: 18px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
      white-space: nowrap;
    }

    .version {
      font-size: 11px;
      opacity: 0.8;
      background: rgba(255, 255, 255, 0.2);
      padding: 2px 8px;
      border-radius: 10px;
    }
  }

  // Tab导航
  .header-tabs {
    display: flex;
    gap: 2px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 4px;

    .tab-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 16px;
      border: none;
      border-radius: 6px;
      background: transparent;
      color: rgba(255, 255, 255, 0.75);
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;

      &:hover {
        background: rgba(255, 255, 255, 0.15);
        color: white;
      }

      &.active {
        background: rgba(255, 255, 255, 0.25);
        color: white;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
      }
    }
  }

  .header-right {
    display: flex;
    gap: 8px;
    flex-shrink: 0;

    .el-button {
      color: white;
      border-color: rgba(255, 255, 255, 0.35);
      background: rgba(255, 255, 255, 0.1);

      &:hover {
        background: rgba(255, 255, 255, 0.25);
        border-color: white;
        color: white;
      }
    }
  }
}

// ============================================
// 主内容区
// ============================================
.app-main {
  flex: 1;
  overflow: hidden;
  position: relative;
  min-height: 0;
  padding-bottom: var(--log-panel-height);
}

.tab-content {
  height: 100%;
  overflow: hidden;
  min-height: 0;
}

// ============================================
// 创作Tab - 左右分栏 + 底部操作栏
// ============================================
.tab-create {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.tab-create .left-panel,
.tab-create .right-panel {
  display: flex;
  min-height: 0;
}

.left-panel {
  width: 400px;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #e4e7ed;
  background: white;
  flex-shrink: 0;
  min-height: 0;
  overflow-y: auto; /* 让左侧面板可以整体滚动 */
}

.goods-list-panel {
  flex: 1 1 auto; /* 让它可以根据内容自动伸缩,但至少占用最小空间 */
  min-height: 300px; /* 保证商品列表有足够的高度 */
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-bottom: 1px solid #e4e7ed;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #fafafa;
  border-bottom: 1px solid #e4e7ed;

  .panel-title {
    font-weight: 600;
    color: #303133;
  }

  .panel-actions {
    display: flex;
    gap: 4px;
  }
}

.goods-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  min-height: 0; /* 修复滚动问题 */

  // 自定义滚动条
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 3px;
  }
  &::-webkit-scrollbar-thumb {
    background: #c0c4cc;
    border-radius: 3px;
    &:hover {
      background: #909399;
    }
  }
}

.goods-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background-color: #f5f7fa;
  }

  &.selected {
    background-color: $primary-bg;
    border: 1px solid color.adjust($primary, $lightness: 30%);
  }

  &.failed {
    background-color: #fef0f0;
  }

  .item-id {
    font-size: 12px;
    color: #909399;
    min-width: 24px;
  }

  .item-preview {
    width: 60px;
    height: 60px;
    border-radius: 4px;
    overflow: hidden;
    flex-shrink: 0;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  .item-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
    overflow: hidden;

    .item-title {
      font-size: 14px;
      color: #303133;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #909399;

  &.compact {
    height: 170px;
    padding: 18px;
  }

  p {
    margin-top: 12px;
  }

  .empty-actions {
    display: flex;
    gap: 8px;
    margin-top: 12px;
  }
}

.prompt-panel {
  height: 320px; /* 增加高度让提示词设置更舒适 */
  flex-shrink: 0; /* 不允许被压缩 */
  display: flex;
  flex-direction: column;
  background: #fafafa;
}

.prompt-content {
  flex: 1;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto; /* 让提示词内容可以滚动 */
  min-height: 0; /* 修复滚动问题 */

  .template-select {
    width: 100%;
  }

  .prompt-textarea-row {
    display: flex;
    gap: 8px;
    flex: 1;

    .el-textarea {
      flex: 1;
    }

    .magic-wand-btn {
      width: 48px;
      height: 48px;
      font-size: 24px;
      padding: 0;
      flex-shrink: 0;
    }
  }

  .el-textarea {
    flex: 1;
  }

  .size-settings {
    display: flex;
    gap: 12px;

    .mode-select {
      width: 140px;
    }

    .size-select {
      width: 150px;
    }

    .resolution-select {
      width: 120px;
    }
  }
}

.right-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  min-height: 0;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: #eef2f7;
  }

  &::-webkit-scrollbar-thumb {
    background: #c7d2e0;
    border-radius: 4px;

    &:hover {
      background: #94a3b8;
    }
  }
}

.preview-panel {
  flex: 1 0 auto;
  display: flex;
  flex-direction: column;
  background: white;
  min-height: 0;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: #fafafa;
  border-bottom: 1px solid #e4e7ed;

  .preview-title {
    font-weight: 600;
    color: #303133;
    max-width: 300px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .preview-index {
    color: #909399;
    font-size: 14px;
  }
}

.preview-content {
  flex: 1 0 auto;
  padding: 20px;
  overflow: visible;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.preview-images {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  justify-content: center;

  .preview-box {
    flex: 1;
    max-width: 45%;
    background: #f5f7fa;
    border-radius: 8px;
    padding: 16px;
    text-align: center;

    h4 {
      margin-bottom: 12px;
      color: #303133;
    }

    img {
      width: 100%;
      border-radius: 4px;
      cursor: pointer;
      transition: transform 0.2s;

      &:hover {
        transform: scale(1.02);
      }
    }

    .no-image {
      height: 200px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #909399;
      background: white;
      border-radius: 4px;
      border: 2px dashed #dcdfe6;
    }
  }

  .preview-arrow {
    display: flex;
    align-items: center;
    justify-content: center;
    padding-top: 60px;
    color: #909399;
  }
}

.error-message {
  margin-top: 16px;
}

.error-diagnosis-card {
  margin-top: 10px;
  padding: 12px 14px;
  border: 1px solid #fecaca;
  border-radius: 8px;
  background: #fff7f7;
  color: #7f1d1d;

  strong {
    display: block;
    margin-bottom: 4px;
    font-size: 14px;
  }

  p {
    margin: 0 0 8px;
    color: #991b1b;
    font-size: 13px;
    line-height: 1.5;
  }

  ul {
    margin: 0;
    padding-left: 18px;
  }

  li {
    margin: 3px 0;
    color: #7f1d1d;
    font-size: 13px;
  }
}

.no-preview {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: white;
  color: #909399;

  p {
    margin-top: 16px;
    font-size: 16px;
  }
}

// ============================================
// 创作Tab底部操作栏
// ============================================
.create-bottom-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 20px;
  background: white;
  border-top: 1px solid #e4e7ed;
  flex-shrink: 0;
  position: sticky;
  bottom: 0;
  z-index: 5;

  .footer-left {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .footer-center {
    display: flex;
    align-items: center;
    gap: 16px;

    .progress-text {
      font-size: 14px;
      color: #606266;
      white-space: nowrap;

      .failed-count {
        color: #f56c6c;
      }
    }
  }

  .footer-right {
    .stats {
      font-size: 14px;
      color: #909399;
      white-space: nowrap;
    }
  }
}

// ============================================
// 占位页面（小红书、二创、模板库、百宝箱）
// ============================================
.placeholder-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  overflow-y: auto;

  h2 {
    margin: 16px 0 8px;
    color: #303133;
    font-size: 24px;
  }

  > p {
    color: #909399;
    margin-bottom: 32px;
    font-size: 15px;
  }
}

.placeholder-features {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
  justify-content: center;
  max-width: 800px;

  .el-card {
    width: 220px;
    text-align: center;
    cursor: default;

    h3 {
      margin: 12px 0 4px;
      color: #303133;
    }

    p {
      color: #909399;
      font-size: 13px;
    }
  }

  .toolbox-card {
    cursor: pointer;

    &:hover {
      transform: translateY(-2px);
      transition: transform 0.2s;
    }
  }
}

// ============================================
// 作品集Tab页面
// ============================================
.projects-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 24px;
  overflow-y: auto;
}

.projects-page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;

  h2 {
    margin: 0;
    color: #303133;
    font-size: 20px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .projects-count {
    color: #909399;
    font-size: 14px;
  }
}

// ============================================
// AI助手侧边栏
// ============================================
.ai-assistant-panel {
  position: absolute;
  top: 0;
  right: 0;
  width: 320px;
  height: 100%;
  background: white;
  box-shadow: -2px 0 12px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  z-index: 20;
}

.ai-assistant-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #e4e7ed;
  background: $primary-bg;

  h3 {
    margin: 0;
    font-size: 15px;
    color: $primary;
    display: flex;
    align-items: center;
    gap: 6px;
  }
}

.ai-assistant-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;

  .ai-message-bubble {
    background: $primary-bg;
    border-radius: 12px;
    padding: 16px;

    p {
      margin: 0 0 8px;
      color: #303133;
      font-size: 14px;
      line-height: 1.6;
    }

    ul {
      margin: 0 0 12px;
      padding-left: 20px;

      li {
        margin-bottom: 4px;
        color: #606266;
        font-size: 13px;
      }
    }

    .ai-hint {
      font-size: 12px;
      color: #909399;
      font-style: italic;
    }
  }
}

.ai-assistant-input {
  padding: 12px;
  border-top: 1px solid #e4e7ed;
}

// Slide-right transition for AI assistant
.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 0.25s ease;
}

.slide-right-enter-from,
.slide-right-leave-to {
  transform: translateX(100%);
}

// ============================================
// 日志面板
// ============================================
.log-panel {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  border-top: 1px solid #e4e7ed;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
  transition: height 0.3s;
  height: 200px;
  z-index: 100;

  &.collapsed {
    height: 36px;
  }

  .log-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 16px;
    background: #fafafa;
    cursor: pointer;
    user-select: none;

    &:hover {
      background: #f0f2f5;
    }

    span {
      font-weight: 600;
      color: #303133;
    }
  }

  .log-content {
    height: calc(100% - 36px);
    overflow: hidden;

    .log-area {
      width: 100%;
      height: 100%;
      border: none;
      resize: none;
      padding: 8px 16px;
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 12px;
      line-height: 1.5;
      color: #303133;
      background: #fafafa;
    }
  }
}

// ============================================
// 作品集卡片样式（复用）
// ============================================
.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
  max-height: calc(100vh - 200px);
  overflow-y: auto;
}

.project-card {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.3s;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }

  .project-preview {
    height: 150px;
    background: #f5f7fa;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;

    img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
  }

  .project-info {
    padding: 12px;

    h4 {
      margin: 0 0 4px 0;
      font-size: 14px;
      color: #303133;
    }

    .project-date {
      font-size: 12px;
      color: #909399;
      margin: 0 0 4px 0;
    }

    .project-prompt {
      font-size: 12px;
      color: #606266;
      margin: 0;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  }

  .project-actions {
    padding: 8px 12px;
    border-top: 1px solid #ebeef5;
    display: flex;
    gap: 8px;
  }
}

.empty-projects {
  text-align: center;
  padding: 60px 20px;
  color: #909399;

  p {
    margin-top: 12px;
  }
}

// ============================================
// 深色主题
// ============================================
:root[data-theme="dark"] {
  .app-container {
    background-color: #1a1a2e;
  }

  .app-header {
    background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1D4ED8 100%);

    .header-tabs .tab-btn {
      color: rgba(255, 255, 255, 0.6);

      &:hover {
        background: rgba(255, 255, 255, 0.12);
        color: white;
      }

      &.active {
        background: rgba(255, 255, 255, 0.2);
        color: white;
      }
    }
  }

  .left-panel,
  .right-panel,
  .goods-list-panel,
  .prompt-panel {
    background-color: #16213e;
    border-color: #2a2a4a;
  }

  .panel-header,
  .prompt-content {
    background-color: #1a1a2e;
  }

  .goods-item {
    &:hover {
      background-color: #2a2a4a;
    }

    &.selected {
      background-color: #1e3a5f;
      border-color: #409eff;
    }
  }

  .create-bottom-bar {
    background-color: #16213e;
    border-color: #2a2a4a;
  }

  .placeholder-page h2 {
    color: #e0e0e0;
  }

  .placeholder-features .el-card {
    background: #1a1a2e;
    border-color: #2a2a4a;

    h3 {
      color: #e0e0e0;
    }
  }

  .projects-page-header h2 {
    color: #e0e0e0;
  }

  .ai-assistant-panel {
    background: #16213e;
    box-shadow: -2px 0 12px rgba(0, 0, 0, 0.3);
  }

  .ai-assistant-header {
    background: #1e3a5f;

    h3 {
      color: #60a5fa;
    }
  }

  .ai-assistant-content .ai-message-bubble {
    background: #1e3a5f;

    p, li {
      color: #e0e0e0;
    }
  }

  .log-panel {
    background-color: #1a1a2e;
    border-color: #2a2a4a;

    .log-header {
      background-color: #16213e;
    }

    .log-content .log-area {
      background-color: #1a1a2e;
      color: #e0e0e0;
    }
  }

  .item-title {
    color: #e0e0e0;
  }

  .panel-title {
    color: #e0e0e0;
  }

  .preview-panel {
    background: #16213e;
  }

  .preview-header {
    background: #1a1a2e;
    border-color: #2a2a4a;
  }

  .preview-box {
    background: #1a1a2e;
  }

  .no-preview {
    background: #16213e;
  }

  .no-image {
    background: #1a1a2e;
    border-color: #3a3a5a;
  }
}
// ============================================
// v0.0.9 工作台视觉升级
// ============================================
.app-container {
  background: #edf3f8;
  color: #0f172a;
}

.app-header {
  height: 66px;
  padding: 0 18px;
  background: #f8fbff;
  color: #0f172a;
  border-bottom: 1px solid #d8e2ee;
  box-shadow: 0 1px 0 rgba(15, 23, 42, 0.04);

  .header-left .app-title {
    color: #10213b;
    font-size: 19px;
    letter-spacing: 0;
  }

  .header-left .version {
    color: #2f65b4;
    background: #e8f1ff;
    border: 1px solid #c9ddfb;
    border-radius: 999px;
    font-weight: 700;
  }

  .header-tabs {
    gap: 8px;
    padding: 0;
    background: transparent;

    .tab-btn {
      min-height: 38px;
      padding: 8px 16px;
      color: #43546c;
      background: #edf2f7;
      border: 1px solid #d8e2ee;
      border-radius: 8px;
      font-size: 14px;

      &:hover {
        color: #173a6a;
        background: #e6effa;
        border-color: #b9cff0;
      }

      &.active {
        color: #fff;
        background: #2f65b4;
        border-color: #2f65b4;
        box-shadow: 0 8px 18px rgba(47, 101, 180, 0.18);
      }
    }
  }

  .header-right .el-button {
    color: #26364c;
    background: #ffffff;
    border-color: #cfdae8;
    border-radius: 8px;

    &:hover {
      color: #174c91;
      background: #eef6ff;
      border-color: #9ebfe8;
    }
  }
}

.tab-create {
  display: grid;
  grid-template-columns: minmax(430px, 32vw) minmax(0, 1fr);
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: 14px;
  padding: 14px;
}

.create-status-strip {
  grid-column: 1 / -1;
  grid-row: 1;
  display: grid;
  grid-template-columns: minmax(260px, 1fr) auto auto;
  align-items: center;
  gap: 18px;
  min-height: 68px;
  padding: 12px 16px;
  border: 1px solid #d9e3ef;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 8px 24px rgba(16, 33, 59, 0.05);
}

.status-meta {
  min-width: 0;

  strong,
  span {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  strong {
    color: #10213b;
    font-size: 17px;
    font-weight: 800;
  }

  span {
    margin-top: 4px;
    color: #64748b;
    font-size: 13px;
  }
}

.status-chips {
  display: grid;
  grid-template-columns: repeat(4, minmax(70px, auto));
  gap: 8px;
}

.status-chip {
  min-width: 72px;
  padding: 8px 10px;
  border: 1px solid #d9e3ef;
  border-radius: 8px;
  background: #f8fafc;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.16s ease, box-shadow 0.16s ease, transform 0.16s ease;

  &:hover,
  &.active {
    border-color: #2f65b4;
    box-shadow: 0 6px 16px rgba(47, 101, 180, 0.13);
    transform: translateY(-1px);
  }

  strong,
  span {
    display: block;
  }

  strong {
    color: #173a6a;
    font-size: 18px;
    line-height: 1;
  }

  span {
    margin-top: 5px;
    color: #64748b;
    font-size: 12px;
  }

  &.success strong {
    color: #15803d;
  }

  &.danger strong {
    color: #dc2626;
  }
}

.status-mode {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
  max-width: 360px;
}

.left-panel,
.right-panel,
.create-bottom-bar {
  border: 1px solid #d9e3ef;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 8px 24px rgba(16, 33, 59, 0.06);
}

.left-panel {
  width: auto;
  grid-column: 1;
  grid-row: 2;
  overflow-y: auto; /* 保持滚动功能 */
  overflow-x: hidden;
}

.right-panel {
  grid-column: 2;
  grid-row: 2;
  overflow-y: auto;
}

.create-bottom-bar {
  grid-column: 1 / -1;
  grid-row: 3;
  position: sticky;
  bottom: 0;
  padding: 12px 14px;
  border-radius: 10px;
}

.panel-header,
.preview-header {
  background: #f8fafc;
  border-bottom: 1px solid #dfe7f1;
}

.panel-header .panel-title,
.preview-title {
  color: #10213b;
  font-size: 16px;
  font-weight: 800;
}

.goods-list {
  padding: 0;
}

.goods-filter-bar {
  display: grid;
  gap: 10px;
  padding: 12px 14px;
  border-bottom: 1px solid #edf1f6;
  background: #ffffff;

  .el-segmented {
    width: 100%;
  }
}

.goods-filter-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
}

.goods-filter-summary {
  color: #64748b;
  font-size: 12px;
}

.goods-item {
  min-height: 88px;
  padding: 14px 16px;
  border-bottom: 1px solid #edf1f6;
  border-radius: 0;

  &:hover {
    background: #f6f9fd;
  }

  &.selected {
    background: #eaf2ff;
    border: 0;
    border-bottom: 1px solid #cfe0f7;
    box-shadow: inset 4px 0 0 #2f65b4;
  }

  &.active {
    outline: 2px solid rgba(47, 101, 180, 0.35);
    outline-offset: -2px;
  }

  &.failed {
    background: #fff3f2;
    box-shadow: inset 4px 0 0 #ef4444;
  }

  .item-preview {
    width: 64px;
    height: 64px;
    border: 1px solid #dfe7f1;
    border-radius: 8px;
    background: #f8fafc;
  }

  .item-info .item-title {
    font-size: 15px;
    font-weight: 700;
    color: #172033;
  }
}

.prompt-panel {
  height: 330px;
  background: #fbfdff;
}

.prompt-content {
  padding: 14px 16px;
  background: #ffffff;
}

.prompt-content .prompt-textarea-row .magic-wand-btn {
  width: 58px;
  height: 72px;
  border-radius: 8px;
  font-size: 26px;
}

.preview-panel {
  min-height: 100%;
  background: #ffffff;
}

.preview-header {
  min-height: 74px;
  gap: 14px;
  padding: 14px 18px;
}

.preview-content {
  padding: 22px;
}

.preview-images {
  align-items: stretch;
  gap: 18px;
}

.preview-box {
  border: 1px solid #dce5f0;
  border-radius: 10px;
  background: #f8fafc;
  overflow: hidden;

  h4 {
    margin: 0;
    padding: 12px 16px;
    background: #ffffff;
    border-bottom: 1px solid #dce5f0;
    color: #10213b;
    font-size: 15px;
    font-weight: 800;
  }

  img {
    max-height: calc(100vh - 360px);
    padding: 14px;
    object-fit: contain;
  }
}

.preview-arrow {
  color: #8da0b8;
}

.no-preview {
  margin: 0;
  border-radius: 10px;
  background: #ffffff;
}

.review-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 16px;
  padding: 12px;
  border: 1px solid #dce5f0;
  border-radius: 10px;
  background: #ffffff;
}

.quality-summary {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
  padding: 10px 12px;
  border: 1px solid #dce5f0;
  border-radius: 8px;
  background: #f8fafc;
  color: #53647c;
  font-size: 13px;
}

.history-panel {
  margin-top: 16px;
  border: 1px solid #dce5f0;
  border-radius: 10px;
  background: #ffffff;
  overflow: hidden;
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 14px 16px;
  background: #f8fafc;
  border-bottom: 1px solid #dce5f0;

  h4 {
    margin: 0;
    color: #10213b;
    font-size: 16px;
    font-weight: 800;
  }

  p {
    margin: 4px 0 0;
    color: #64748b;
    font-size: 12px;
  }
}

.history-filter {
  width: 120px;
  flex-shrink: 0;
}

.history-list {
  max-height: 360px;
  overflow-y: auto;
}

.history-item {
  display: grid;
  grid-template-columns: 58px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid #edf1f6;

  &:last-child {
    border-bottom: 0;
  }
}

.history-thumb {
  width: 58px;
  height: 58px;
  padding: 0;
  border: 1px solid #dce5f0;
  border-radius: 8px;
  background: #f8fafc;
  overflow: hidden;
  cursor: pointer;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.history-meta {
  min-width: 0;
  cursor: pointer;

  strong,
  span {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  strong {
    color: #172033;
    font-size: 14px;
  }

  span {
    margin-top: 4px;
    color: #64748b;
    font-size: 12px;
  }
}

.history-actions {
  display: flex;
  gap: 4px;
}

.history-empty {
  padding: 22px;
  color: #8da0b8;
  text-align: center;
}

.footer-left {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.create-bottom-bar .el-button {
  height: 42px;
  border-radius: 8px;
  font-weight: 700;
}

.footer-center {
  min-width: 360px;
}

.log-panel {
  border-top: 1px solid #d8e2ee;
  background: #101827;

  .log-header {
    height: 36px;
    background: #ffffff;
    color: #10213b;
    border-bottom: 1px solid #d8e2ee;
    font-weight: 800;
  }

  .log-content .log-area {
    background: #101827;
    color: #d9e6f7;
    font-family: Consolas, "Courier New", monospace;
  }
}

@media (max-width: 1200px) {
  .tab-create {
    grid-template-columns: 380px minmax(0, 1fr);
  }

  .create-status-strip {
    grid-template-columns: 1fr;
    align-items: stretch;
  }

  .status-chips {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .status-mode {
    justify-content: flex-start;
    max-width: none;
  }

  .header-tabs .tab-btn {
    padding: 8px 10px;
  }
}
</style>
