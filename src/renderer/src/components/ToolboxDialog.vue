<template>
  <el-dialog
    v-model="visible"
    title="🧰 百宝箱 - 创意工具箱"
    width="1000px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-tabs v-model="activeTab" type="border-card">
      <!-- 图片处理 -->
      <el-tab-pane label="🖼️ 图片处理" name="image">
        <!-- 预览区域 -->
        <div class="preview-section" v-if="previewBefore || previewAfter">
          <div class="preview-compare">
            <div class="preview-box" v-if="previewBefore">
              <h4>处理前</h4>
              <img :src="previewBefore" alt="处理前" @click="openPreview(previewBefore)" />
            </div>
            <div class="preview-arrow" v-if="previewBefore && previewAfter">→</div>
            <div class="preview-box" v-if="previewAfter">
              <h4>处理后</h4>
              <img :src="previewAfter" alt="处理后" @click="openPreview(previewAfter)" />
            </div>
          </div>
          <el-button size="small" @click="clearPreview" text>清除预览</el-button>
        </div>

        <div class="tool-section">
          <h3>1. 图片加水印</h3>
          <div class="tool-row">
            <el-segmented v-model="watermarkMode" :options="watermarkModeOptions" />
            <el-input v-if="watermarkMode === 'text'" v-model="watermarkText" placeholder="输入水印文字" style="width: 240px" />
            <el-button v-else @click="selectWatermarkLogo">选择Logo</el-button>
            <span v-if="watermarkLogoPath" class="file-selected">已选择Logo</span>
            <el-select v-model="watermarkFontFamily" placeholder="字体" style="width: 140px">
              <el-option label="微软雅黑" value="Microsoft YaHei" />
              <el-option label="宋体" value="SimSun" />
              <el-option label="黑体" value="SimHei" />
              <el-option label="楷体" value="KaiTi" />
            </el-select>
            <el-select v-model="watermarkPosition" placeholder="位置" style="width: 120px">
              <el-option label="右下角" value="bottom-right" />
              <el-option label="左下角" value="bottom-left" />
              <el-option label="居中" value="center" />
              <el-option label="右上角" value="top-right" />
              <el-option label="左上角" value="top-left" />
            </el-select>
            <el-slider v-model="watermarkOpacity" :min="1" :max="100" :format-tooltip="v => `${v}%`" style="width: 150px" />
            <el-button type="primary" @click="handleWatermark" :loading="processing">添加水印</el-button>
          </div>
        </div>

        <div class="tool-section">
          <h3>2. 图片压缩</h3>
          <div class="tool-row">
            <span>压缩质量：</span>
            <el-slider v-model="compressQuality" :min="10" :max="100" :format-tooltip="v => `${v}%`" style="width: 200px" />
            <el-button type="primary" @click="handleCompress" :loading="processing">压缩图片</el-button>
          </div>
        </div>

        <div class="tool-section">
          <h3>3. 百变拼图</h3>
          <div class="tool-row">
            <el-select v-model="collageLayout" placeholder="布局" style="width: 150px">
              <el-option label="2列横排" value="2x1" />
              <el-option label="2列竖排" value="1x2" />
              <el-option label="3列横排" value="3x1" />
              <el-option label="2x2网格" value="2x2" />
              <el-option label="3x3网格" value="3x3" />
            </el-select>
            <el-select v-model="collageScale" placeholder="清晰度" style="width: 120px">
              <el-option label="标准" :value="1" />
              <el-option label="2倍超清" :value="2" />
            </el-select>
            <span>间距</span>
            <el-input-number v-model="collageGap" :min="0" :max="120" :step="4" size="small" style="width: 110px" />
            <span>边框</span>
            <el-input-number v-model="collageBorderWidth" :min="0" :max="40" :step="1" size="small" style="width: 100px" />
            <el-color-picker v-model="collageBorderColor" />
            <el-color-picker v-model="collageBackground" />
            <el-checkbox v-model="collageExportZip">ZIP</el-checkbox>
            <el-button type="primary" @click="handleCollage" :loading="processing">生成高级拼图</el-button>
          </div>
        </div>

        <div class="tool-section">
          <h3>4. 背景换图</h3>
          <div class="tool-row">
            <el-button @click="selectBgImage">选择背景图</el-button>
            <span v-if="bgImagePath" class="file-selected">✅ 已选择背景图</span>
            <el-button type="primary" @click="handleBgReplace" :loading="processing">换背景</el-button>
          </div>
          <div v-if="bgImagePath" class="bg-preview">
            <img :src="getFilePathSrc(bgImagePath)" alt="背景图" />
          </div>
          <div v-if="bgHistory.length" class="bg-history">
            <span>最近背景</span>
            <el-button
              v-for="bg in bgHistory.slice(0, 6)"
              :key="bg.path"
              size="small"
              @click="bgImagePath = bg.path"
            >
              {{ bg.name }}
            </el-button>
          </div>
        </div>

        <div class="tool-section">
          <h3>5. 场景化图片排版</h3>
          <div class="scene-compose-panel">
            <div class="tool-row">
              <el-button @click="selectSceneBackground">选择场景背景</el-button>
              <span v-if="sceneBackgroundPath" class="file-selected">已选择背景</span>
              <el-button @click="selectSceneOverlay">选择嵌入图片</el-button>
              <span v-if="sceneOverlayPath" class="file-selected">已选择嵌入图</span>
            </div>
            <div class="tool-row">
              <el-select v-model="scenePreset" placeholder="场景区域" style="width: 160px">
                <el-option label="纸张居中" value="paper-center" />
                <el-option label="手机屏幕" value="phone-screen" />
                <el-option label="桌面卡片" value="desktop-card" />
              </el-select>
              <el-select v-model="sceneFit" placeholder="适配" style="width: 120px">
                <el-option label="完整显示" value="contain" />
                <el-option label="铺满裁切" value="cover" />
                <el-option label="拉伸填满" value="fill" />
              </el-select>
              <el-select v-model="sceneBlend" placeholder="混合" style="width: 120px">
                <el-option label="正常" value="over" />
                <el-option label="正片叠底" value="multiply" />
                <el-option label="滤色" value="screen" />
                <el-option label="叠加" value="overlay" />
                <el-option label="柔光" value="soft-light" />
              </el-select>
              <span>透明度</span>
              <el-slider v-model="sceneOpacity" :min="10" :max="100" :format-tooltip="v => `${v}%`" style="width: 150px" />
              <el-button type="primary" @click="handleSceneCompose" :loading="processing">生成场景图</el-button>
            </div>
            <div class="scene-preview" v-if="sceneBackgroundPath || sceneOverlayPath">
              <div v-if="sceneBackgroundPath">
                <span>背景</span>
                <img :src="getFilePathSrc(sceneBackgroundPath)" alt="场景背景" />
              </div>
              <div v-if="sceneOverlayPath">
                <span>嵌入图</span>
                <img :src="getFilePathSrc(sceneOverlayPath)" alt="嵌入图片" />
              </div>
            </div>
          </div>
        </div>

        <div class="tool-section">
          <h3>6. 长图切片 / 图片分割</h3>
          <p class="tip">把长图或宽图切成多张小红书友好的图片，适合资料页、错题页、长笔记分卡导出。</p>
          <div class="tool-row">
            <el-select v-model="splitDirection" placeholder="切片方向" style="width: 140px">
              <el-option label="纵向切长图" value="vertical" />
              <el-option label="横向切宽图" value="horizontal" />
            </el-select>
            <span>单张长度</span>
            <el-input-number v-model="splitTargetSize" :min="200" :max="4096" :step="50" size="small" style="width: 130px" />
            <span>重叠</span>
            <el-input-number v-model="splitOverlap" :min="0" :max="1000" :step="10" size="small" style="width: 110px" />
            <el-select v-model="splitFormat" placeholder="格式" style="width: 110px">
              <el-option label="PNG" value="png" />
              <el-option label="JPEG" value="jpeg" />
              <el-option label="WebP" value="webp" />
            </el-select>
            <el-input v-model="splitOutputName" placeholder="输出名前缀，可留空" style="width: 180px" />
            <el-button type="primary" @click="handleImageSplit" :loading="processing">选择图片并切片</el-button>
          </div>
          <div class="split-presets">
            <el-button size="small" @click="splitTargetSize = 1365; splitDirection = 'vertical'">小红书 3:4</el-button>
            <el-button size="small" @click="splitTargetSize = 1024; splitDirection = 'vertical'">方卡 1:1</el-button>
            <el-button size="small" @click="splitTargetSize = 1920; splitDirection = 'vertical'">高清长页</el-button>
          </div>
        </div>
      </el-tab-pane>

      <!-- 视频处理 -->
      <el-tab-pane label="🎬 视频处理" name="video">
        <el-alert
          v-if="!ffmpegInstalled"
          :title="ffmpegStatusText"
          type="warning"
          :closable="false"
          show-icon
          style="margin-bottom: 12px"
        />
        <div class="tool-section">
          <h3>5. 图片转视频</h3>
          <div class="tool-row">
            <el-select v-model="videoMode" placeholder="模式" style="width: 160px">
              <el-option label="单图滚动" value="single-scroll" />
              <el-option label="多图滚动" value="multi-scroll" />
              <el-option label="长图滚动" value="long-scroll" />
              <el-option label="横向切换" value="horizontal-switch" />
            </el-select>
            <span>每张停留：</span>
            <el-input-number v-model="videoDuration" :min="1" :max="10" :step="0.5" />
            <span>秒</span>
            <el-select v-model="videoTransition" placeholder="转场" style="width: 120px">
              <el-option label="无" value="none" />
              <el-option label="淡入淡出" value="fade" />
              <el-option label="滑动" value="slide" />
            </el-select>
            <el-select v-model="videoResolution" placeholder="分辨率" style="width: 120px">
              <el-option label="720p" value="720p" />
              <el-option label="1080p" value="1080p" />
            </el-select>
            <el-button type="primary" @click="handleImagesToVideo" :loading="processing" :disabled="!ffmpegInstalled">生成视频</el-button>
          </div>
        </div>

        <div class="tool-section">
          <h3>6. 视频截取</h3>
          <div class="tool-row">
            <span>开始：</span>
            <el-input v-model="trimStart" placeholder="00:00:00" style="width: 120px" />
            <span>结束：</span>
            <el-input v-model="trimEnd" placeholder="00:00:05" style="width: 120px" />
            <el-button type="primary" @click="handleVideoTrim" :loading="processing" :disabled="!ffmpegInstalled">截取视频</el-button>
          </div>
        </div>

        <div class="tool-section">
          <h3>7. 视频添加移动水印</h3>
          <div class="tool-row">
            <el-input v-model="videoWatermarkText" placeholder="水印文字" style="width: 300px" />
            <el-select v-model="videoWatermarkPath" placeholder="移动轨迹" style="width: 150px">
              <el-option label="对角线" value="diagonal" />
              <el-option label="水平来回" value="horizontal" />
              <el-option label="垂直来回" value="vertical" />
            </el-select>
            <el-button type="primary" @click="handleVideoWatermark" :loading="processing" :disabled="!ffmpegInstalled">添加水印</el-button>
          </div>
        </div>

        <div class="tool-section">
          <h3>8. 视频换背景</h3>
          <div class="tool-row">
            <el-button @click="selectVideoBgImage">选择背景图</el-button>
            <span v-if="videoBgImagePath" class="file-selected">✅ 已选择背景图</span>
            <el-button type="primary" @click="handleVideoBgReplace" :loading="processing" :disabled="!ffmpegInstalled">换背景</el-button>
          </div>
        </div>

        <div class="tool-section">
          <h3>9. 视频转GIF</h3>
          <div class="tool-row">
            <span>宽度：</span>
            <el-input-number v-model="gifWidth" :min="200" :max="1920" :step="100" />
            <span>帧率：</span>
            <el-input-number v-model="gifFps" :min="5" :max="30" :step="1" />
            <el-button type="primary" @click="handleVideoToGif" :loading="processing" :disabled="!ffmpegInstalled">转GIF</el-button>
          </div>
        </div>
      </el-tab-pane>

      <!-- 文档处理 -->
      <el-tab-pane label="📄 文档处理" name="doc">
        <div class="tool-section">
          <h3>10. Word转PDF</h3>
          <div class="tool-row">
            <el-alert v-if="!libreOfficeInstalled" title="需要安装LibreOffice" type="warning" :closable="false" show-icon style="margin-right: 12px" />
            <el-button type="primary" @click="handleWordToPdf" :loading="processing" :disabled="!libreOfficeInstalled">Word转PDF</el-button>
          </div>
        </div>

        <div class="tool-section">
          <h3>11. PDF转图片</h3>
          <div class="tool-row">
            <el-input v-model="pdfPageRange" placeholder="页码：如 1-3,5；留空全部" style="width: 220px" />
            <el-select v-model="pdfImageResolution" placeholder="清晰度" style="width: 120px">
              <el-option label="标准" value="1x" />
              <el-option label="2倍超清" value="2x" />
            </el-select>
            <el-checkbox v-model="pdfExportZip">导出ZIP</el-checkbox>
            <el-button type="primary" @click="handlePdfToImages" :loading="processing">PDF转图片</el-button>
          </div>
        </div>

        <div class="tool-section">
          <h3>12. PDF转视频</h3>
          <el-alert
            v-if="!ffmpegInstalled"
            :title="ffmpegStatusText"
            type="warning"
            :closable="false"
            show-icon
            style="margin-bottom: 12px"
          />
          <div class="tool-row">
            <span>每页停留：</span>
            <el-input-number v-model="pdfPageDuration" :min="1" :max="10" :step="0.5" />
            <span>秒</span>
            <el-button type="primary" @click="handlePdfToVideo" :loading="processing" :disabled="!ffmpegInstalled">PDF转视频</el-button>
          </div>
        </div>
      </el-tab-pane>

      <!-- 魔法棒 -->
      <el-tab-pane label="✨ 魔法棒" name="magic">
        <div class="tool-section">
          <h3>智能提示词优化</h3>
          <p class="tip">输入简单的关键词或想法，AI自动优化为专业的绘图提示词</p>
          <el-input
            v-model="simplePrompt"
            type="textarea"
            :rows="3"
            placeholder="例如：端午节班会PPT，可爱风格"
          />
          <el-button type="primary" @click="handleOptimizePrompt" :loading="processing" style="margin-top: 12px">
            ✨ 魔法棒优化
          </el-button>
          <div v-if="optimizedPrompt" class="optimized-result">
            <h4>优化结果：</h4>
            <el-input
              v-model="optimizedPrompt"
              type="textarea"
              :rows="5"
              readonly
            />
            <el-button type="success" @click="copyOptimizedPrompt" style="margin-top: 8px">复制到提示词</el-button>
          </div>
        </div>
      </el-tab-pane>

      <!-- OCR导出 -->
      <el-tab-pane label="📝 OCR导出" name="ocr">
        <div class="tool-section">
          <h3>智能OCR导出</h3>
          <p class="tip">识别图片中的文字，导出为可编辑的PPT或Word文档</p>

          <div class="tool-row">
            <el-button type="primary" @click="handleOcrToPptx" :loading="processing">
              📊 导出为PPT（图文分离）
            </el-button>
            <el-button type="success" @click="handleOcrToDocx" :loading="processing">
              📄 导出为Word（图文分离）
            </el-button>
          </div>

          <div class="ocr-info" style="margin-top: 16px;">
            <el-alert title="功能说明" type="info" :closable="false" show-icon>
              <template #default>
                <ul style="margin: 0; padding-left: 20px;">
                  <li>支持中英文OCR识别</li>
                  <li>导出的PPT/Word中文字可直接编辑</li>
                  <li>图片作为背景保留，文字覆盖在上方</li>
                  <li>可选择多张图片批量导出</li>
                </ul>
              </template>
            </el-alert>
          </div>
        </div>

        <div class="tool-section">
          <h3>智能去字 / 提取底图</h3>
          <p class="tip">使用AI去除图片中的文字，保留纯净的背景图</p>

          <div class="tool-row">
            <el-button type="warning" @click="handleRemoveText" :loading="processing">
              🧹 智能去字（移除文字）
            </el-button>
            <el-button type="info" @click="handleExtractBackground" :loading="processing">
              🖼️ 提取底图（保留背景）
            </el-button>
          </div>

          <div class="ocr-info" style="margin-top: 16px;">
            <el-alert title="功能说明" type="warning" :closable="false" show-icon>
              <template #default>
                <ul style="margin: 0; padding-left: 20px;">
                  <li><b>智能去字</b>：移除所有文字，保留背景和装饰元素</li>
                  <li><b>提取底图</b>：只保留纯净背景，移除所有前景元素</li>
                  <li>需要配置API密钥（使用GPT Image 1.5）</li>
                  <li>适合制作模板、去水印等场景</li>
                </ul>
              </template>
            </el-alert>
          </div>
        </div>
      </el-tab-pane>

      <!-- AI橡皮擦 -->
      <el-tab-pane label="🧹 AI橡皮擦" name="eraser">
        <div class="tool-section">
          <h3>AI橡皮擦 - 擦除文字，保留底图</h3>
          <p class="tip">使用AI智能识别并擦除图片中的所有文字，保留纯净的背景底图，适合制作课件模板</p>

          <div class="tool-row">
            <el-button type="danger" @click="handleAiEraserSingle" :loading="processing" size="large">
              🧹 单张橡皮擦（擦除文字）
            </el-button>
            <el-button type="warning" @click="handleAiEraserBatch" :loading="processing" size="large">
              📊 批量橡皮擦 → 导出PPT
            </el-button>
          </div>

          <div class="eraser-info" style="margin-top: 16px;">
            <el-alert title="功能说明" type="warning" :closable="false" show-icon>
              <template #default>
                <ul style="margin: 0; padding-left: 20px;">
                  <li><b>单张橡皮擦</b>：选择一张图片，擦除所有文字，保留底图</li>
                  <li><b>批量橡皮擦</b>：选择多张图片，逐张擦除文字，最后导出为PPT</li>
                  <li>支持JPG/PNG等常见图片格式</li>
                  <li>字和图分离：文字被擦除，图形和背景保留</li>
                  <li>擦除后的文字区域用周围背景自然填充</li>
                  <li>需要配置API密钥（推荐使用OpenAI或智谱AI）</li>
                </ul>
              </template>
            </el-alert>
          </div>

          <div class="eraser-use-case" style="margin-top: 16px;">
            <el-alert title="典型使用场景" type="info" :closable="false" show-icon>
              <template #default>
                <ul style="margin: 0; padding-left: 20px;">
                  <li>课件制作：擦除模板中的示例文字，替换为自己的内容</li>
                  <li>PPT美化：去除背景图中的水印或多余文字</li>
                  <li>素材处理：获取纯净背景图用于二次创作</li>
                  <li>模板制作：批量处理图片，生成可编辑的PPT模板</li>
                </ul>
              </template>
            </el-alert>
          </div>
        </div>
      </el-tab-pane>

      <!-- 飞书上传 -->
      <el-tab-pane label="飞书上传" name="feishu">
        <div class="tool-section feishu-section">
          <h3>飞书附件上传任务规划</h3>
          <p class="tip">把多个素材文件夹按行分配到飞书多维表格附件字段。当前先生成本地预览，真实上传接口保留为下一阶段。</p>
          <el-alert
            title="安全提示：这里不会把 Token 发到网络，只用于校验是否已填写。请先核对预览，再接入真实上传。"
            type="info"
            :closable="false"
            show-icon
            style="margin-bottom: 12px"
          />

          <div class="feishu-grid">
            <el-input v-model="feishuToken" type="password" show-password placeholder="飞书 tenant_access_token / user_access_token（可先留空预览）" />
            <el-input v-model="feishuBitableUrl" placeholder="飞书多维表格链接，如 https://xxx.feishu.cn/base/app...?table=tbl..." />
            <el-input v-model="feishuAttachmentField" placeholder="附件字段名称，如 图片附件" />
            <div class="feishu-row-range">
              <span>行范围</span>
              <el-input-number v-model="feishuStartRow" :min="1" :max="999999" size="small" />
              <span>至</span>
              <el-input-number v-model="feishuEndRow" :min="1" :max="999999" size="small" />
            </div>
          </div>

          <div class="feishu-folder-list">
            <div
              v-for="(folder, index) in feishuFolders"
              :key="folder.id"
              class="feishu-folder-row"
            >
              <el-input v-model="folder.folderPath" placeholder="选择或粘贴素材文件夹路径" />
              <el-button @click="selectFeishuFolder(index)">选择文件夹</el-button>
              <el-select v-model="folder.mode" style="width: 110px">
                <el-option label="顺序" value="sequential" />
                <el-option label="随机" value="random" />
              </el-select>
              <span>每行</span>
              <el-input-number v-model="folder.countPerRow" :min="1" :max="20" size="small" style="width: 95px" />
              <span>起点</span>
              <el-input-number v-model="folder.cursor" :min="0" :max="999999" size="small" style="width: 95px" />
              <el-button text type="danger" @click="removeFeishuFolder(index)" :disabled="feishuFolders.length === 1">删除</el-button>
            </div>
          </div>

          <div class="tool-row">
            <el-button @click="addFeishuFolder">添加素材文件夹</el-button>
            <el-button type="primary" @click="handleFeishuPreview" :loading="feishuPlanning">生成上传预览（暂不上传）</el-button>
          </div>

          <div v-if="feishuPreview" class="feishu-preview-panel">
            <div class="feishu-summary">
              <el-tag type="success">行数 {{ feishuPreview.plan.rowCount }}</el-tag>
              <el-tag>每行 {{ feishuPreview.plan.totalImagesPerRow }} 张</el-tag>
              <el-tag type="warning">预计 {{ feishuPreview.plan.estimatedUploadCount }} 张</el-tag>
              <el-tag :type="feishuPreview.plan.tokenProvided ? 'success' : 'info'">
                {{ feishuPreview.plan.tokenProvided ? '已填写 Token' : '未填写 Token' }}
              </el-tag>
              <el-button size="small" @click="copyFeishuManifest">复制上传清单</el-button>
            </div>
            <el-alert
              v-if="feishuPreview.missingFolders.length"
              :title="`这些文件夹没有可用图片：${feishuPreview.missingFolders.join('、')}`"
              type="warning"
              :closable="false"
              show-icon
              style="margin: 10px 0"
            />
            <div class="feishu-preview-list">
              <div v-for="row in feishuPreviewRows" :key="row.rowNumber" class="feishu-preview-row">
                <strong>第 {{ row.rowNumber }} 行</strong>
                <span v-if="!row.imagePaths.length" class="empty-tip-inline">暂无图片</span>
                <el-tag
                  v-for="imagePath in row.imagePaths"
                  :key="`${row.rowNumber}-${imagePath}`"
                  size="small"
                  effect="plain"
                >
                  {{ getFileName(imagePath) }}
                </el-tag>
              </div>
            </div>
            <p v-if="feishuPreview.rows.length > feishuPreviewRows.length" class="tip">
              只展示前 {{ feishuPreviewRows.length }} 行，完整上传数量以汇总为准。
            </p>
          </div>
        </div>
      </el-tab-pane>

      <!-- 采集下载 -->
      <el-tab-pane label="采集下载" name="collect">
        <div class="tool-section collect-section">
          <h3>小红书商品图采集队列</h3>
          <p class="tip">粘贴小红书分享文案、短链、笔记链接或图片直链。工具会先生成本地采集队列；只有图片直链会自动下载，笔记页和短链需要手动打开后保存或复制图片直链。</p>
          <el-alert
            title="说明：小红书页面常需要登录和浏览器环境，当前不做绕过登录/反爬的抓取；直连图片 URL 可直接下载。"
            type="warning"
            :closable="false"
            show-icon
            style="margin-bottom: 12px"
          />

          <el-input
            v-model="xhsShareText"
            type="textarea"
            :rows="6"
            placeholder="粘贴小红书分享文案、短链、笔记链接，或 https://...jpg / .png / .webp 图片直链"
          />

          <div class="collect-grid">
            <el-input v-model="xhsFilePrefix" placeholder="文件名前缀，如 七下英语资料图" />
            <el-input v-model="xhsOutputDir" placeholder="输出文件夹，可留空使用默认目录" />
            <el-button @click="selectXhsOutputDir">选择输出目录</el-button>
            <el-button type="primary" @click="handleBuildXhsDownloadPlan">生成采集队列</el-button>
            <el-button type="success" @click="handleDownloadXhsAssets" :loading="xhsDownloading" :disabled="!xhsDownloadPlan?.downloadableCount">下载直连图片</el-button>
          </div>

          <div v-if="xhsDownloadPlan" class="collect-preview-panel">
            <div class="collect-summary">
              <el-tag>链接 {{ xhsDownloadPlan.totalCount }}</el-tag>
              <el-tag type="success">可下载 {{ xhsDownloadPlan.downloadableCount }}</el-tag>
              <el-tag type="warning">需手动 {{ xhsDownloadPlan.manualCount }}</el-tag>
            </div>

            <div class="collect-task-list">
              <div v-for="task in xhsDownloadPlan.tasks" :key="task.id" class="collect-task-row">
                <div class="collect-task-main">
                  <strong>{{ task.fileName }}</strong>
                  <span>{{ task.reason }}</span>
                  <small>{{ task.url }}</small>
                </div>
                <el-tag :type="task.downloadable ? 'success' : 'warning'" effect="plain">
                  {{ task.downloadable ? '可下载' : '手动处理' }}
                </el-tag>
                <el-button v-if="!task.downloadable" size="small" @click="openXhsManualTask(task)">打开链接</el-button>
              </div>
            </div>

            <p v-if="xhsManualTasks.length" class="tip">
              手动处理链接打开后，可把图片直链复制回来重新生成队列，再使用“下载直连图片”。
            </p>
          </div>
        </div>
      </el-tab-pane>

      <!-- 模板库 -->
      <el-tab-pane label="📚 模板库" name="templates">
        <div class="tool-section">
          <h3>风格克隆模板</h3>
          <p class="tip">保存常用的风格模板，下次直接调用</p>
          <div class="template-form">
            <el-input v-model="newTemplateName" placeholder="模板名称" style="width: 200px" />
            <el-input v-model="newTemplatePrompt" placeholder="提示词内容" style="flex: 1" />
            <el-button type="primary" @click="handleSaveTemplate" :disabled="!newTemplateName || !newTemplatePrompt">保存模板</el-button>
          </div>
          <div class="template-list">
            <div v-for="(tpl, index) in templates" :key="index" class="template-item">
              <div class="template-info">
                <span class="template-name">{{ tpl.name }}</span>
                <span class="template-prompt">{{ tpl.prompt }}</span>
              </div>
              <div class="template-actions">
                <el-button size="small" text @click="useTemplate(tpl)">使用</el-button>
                <el-button size="small" text type="danger" @click="handleDeleteTemplate(index)">删除</el-button>
              </div>
            </div>
            <div v-if="templates.length === 0" class="empty-tip">暂无模板</div>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <template #footer>
      <el-button @click="handleClose">关闭</el-button>
    </template>
  </el-dialog>

  <!-- 图片预览对话框 -->
  <el-dialog v-model="previewDialogVisible" title="图片预览" width="80%" destroy-on-close>
    <img :src="previewDialogSrc" style="width: 100%; object-fit: contain;" />
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useAppStore } from '../store/index.js'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  buildAdvancedWatermarkPayload,
  buildPdfImagesRequest,
  buildSceneComposeRequest,
  buildVideoCreateRequest,
  normalizeAdvancedCollageRequest
} from '../utils/toolboxAdvancedWorkflow.mjs'
import {
  buildFeishuLocalUploadPreview,
  buildFeishuUploadManifest,
  buildFeishuUploadPlan
} from '../utils/feishuUploadWorkflow.mjs'
import {
  buildXhsGoodsDownloadPlan
} from '../utils/xhsGoodsDownloadWorkflow.mjs'

const props = defineProps({
  modelValue: Boolean
})

const emit = defineEmits(['update:modelValue', 'use-prompt'])

const store = useAppStore()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const activeTab = ref('image')
const processing = ref(false)
const libreOfficeInstalled = ref(false)
const ffmpegStatus = ref({ installed: true, error: '' })
const ffmpegInstalled = computed(() => ffmpegStatus.value.installed !== false)
const ffmpegStatusText = computed(() => ffmpegStatus.value.error || 'FFmpeg 不可用，视频相关功能暂不可用')

// 预览相关
const previewBefore = ref('')
const previewAfter = ref('')
const previewDialogVisible = ref(false)
const previewDialogSrc = ref('')

// 图片处理参数
const watermarkMode = ref('text')
const watermarkModeOptions = [
  { label: '文字水印', value: 'text' },
  { label: 'Logo水印', value: 'logo' }
]
const watermarkText = ref('智绘AI')
const watermarkLogoPath = ref('')
const watermarkFontFamily = ref('Microsoft YaHei')
const watermarkPosition = ref('bottom-right')
const watermarkOpacity = ref(30)
const compressQuality = ref(80)
const collageLayout = ref('2x1')
const collageScale = ref(1)
const collageGap = ref(16)
const collageBorderWidth = ref(0)
const collageBorderColor = ref('#e2e8f0')
const collageBackground = ref('#ffffff')
const collageExportZip = ref(false)
const bgImagePath = ref('')
const bgHistory = ref([])
const sceneBackgroundPath = ref('')
const sceneOverlayPath = ref('')
const scenePreset = ref('paper-center')
const sceneFit = ref('contain')
const sceneBlend = ref('over')
const sceneOpacity = ref(100)
const splitDirection = ref('vertical')
const splitTargetSize = ref(1365)
const splitOverlap = ref(0)
const splitFormat = ref('png')
const splitOutputName = ref('')

// 视频处理参数
const videoMode = ref('single-scroll')
const videoDuration = ref(2)
const videoTransition = ref('none')
const videoResolution = ref('1080p')
const trimStart = ref('00:00:00')
const trimEnd = ref('00:00:05')
const videoWatermarkText = ref('AI教辅')
const videoWatermarkPath = ref('diagonal')
const videoBgImagePath = ref('')
const gifWidth = ref(480)
const gifFps = ref(15)

// 文档处理参数
const pdfPageDuration = ref(3)
const pdfPageRange = ref('')
const pdfImageResolution = ref('1x')
const pdfExportZip = ref(false)

// 魔法棒参数
const simplePrompt = ref('')
const optimizedPrompt = ref('')

// 模板库参数
const templates = ref([])
const newTemplateName = ref('')
const newTemplatePrompt = ref('')

function createFeishuFolderConfig(index = 0) {
  return {
    id: `feishu-folder-${Date.now()}-${index}`,
    folderPath: '',
    mode: 'sequential',
    countPerRow: 1,
    cursor: 0
  }
}

// 飞书上传规划参数
const feishuToken = ref('')
const feishuBitableUrl = ref('')
const feishuAttachmentField = ref('图片附件')
const feishuStartRow = ref(1)
const feishuEndRow = ref(10)
const feishuFolders = ref([createFeishuFolderConfig(0)])
const feishuPreview = ref(null)
const feishuPlanning = ref(false)
const feishuPreviewRows = computed(() => feishuPreview.value?.rows?.slice(0, 12) || [])

// 小红书商品图采集参数
const xhsShareText = ref('')
const xhsOutputDir = ref('')
const xhsFilePrefix = ref('商品图')
const xhsDownloadPlan = ref(null)
const xhsDownloading = ref(false)
const xhsDownloadableTasks = computed(() => xhsDownloadPlan.value?.tasks?.filter(task => task.downloadable) || [])
const xhsManualTasks = computed(() => xhsDownloadPlan.value?.tasks?.filter(task => !task.downloadable) || [])

// 检查LibreOffice
const checkLibreOffice = async () => {
  try {
    const result = await window.electronAPI.checkLibreOffice()
    libreOfficeInstalled.value = result.installed
  } catch (err) {
    libreOfficeInstalled.value = false
  }
}

const checkFfmpeg = async () => {
  try {
    const result = await window.electronAPI.checkFfmpeg()
    ffmpegStatus.value = result || { installed: false, error: 'FFmpeg 状态检测失败' }
  } catch (err) {
    ffmpegStatus.value = { installed: false, error: err.message || 'FFmpeg 状态检测失败' }
  }
}

// 加载模板
const loadTemplates = async () => {
  try {
    const result = await window.electronAPI.getTemplates()
    if (result && result.templates) {
      templates.value = result.templates
    }
  } catch (err) {
    templates.value = []
  }
}

const loadBgHistory = async () => {
  try {
    const result = await window.electronAPI.getBgHistory()
    bgHistory.value = result?.history || []
  } catch {
    bgHistory.value = []
  }
}

watch(visible, (val) => {
  if (val) {
    checkLibreOffice()
    checkFfmpeg()
    loadTemplates()
    loadBgHistory()
    clearPreview()
  }
})

// 获取文件路径
const getFilePath = async (filters) => {
  const result = await window.electronAPI.openFileDialog({
    properties: ['openFile'],
    filters: filters || [
      { name: '图片文件', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'] }
    ]
  })
  if (result.canceled || !result.filePaths.length) return null
  return result.filePaths[0]
}

const getMultiFilePath = async (filters) => {
  const result = await window.electronAPI.openFileDialog({
    properties: ['openFile', 'multiSelections'],
    filters: filters || [
      { name: '图片文件', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'] }
    ]
  })
  if (result.canceled || !result.filePaths.length) return null
  return result.filePaths
}

const getSaveFolder = async () => {
  const result = await window.electronAPI.openFolderDialog()
  if (result.canceled || !result.filePaths.length) return null
  return result.filePaths[0]
}

// 预览相关函数
const getFilePathSrc = (filePath) => {
  if (filePath) {
    return `file:///${filePath.replace(/\\/g, '/')}`
  }
  return ''
}

const getFileName = (filePath) => {
  return String(filePath || '').split(/[\\/]/).pop() || filePath
}

const addFeishuFolder = () => {
  feishuFolders.value.push(createFeishuFolderConfig(feishuFolders.value.length))
}

const removeFeishuFolder = (index) => {
  if (feishuFolders.value.length <= 1) {
    ElMessage.warning('至少保留一个素材文件夹')
    return
  }
  feishuFolders.value.splice(index, 1)
  feishuPreview.value = null
}

const selectFeishuFolder = async (index) => {
  const folderPath = await getSaveFolder()
  if (!folderPath) return
  feishuFolders.value[index].folderPath = folderPath
  feishuPreview.value = null
}

const readFeishuFolderImages = async (folderPath) => {
  const result = await window.electronAPI.importFolderPath(folderPath)
  if (result?.error) throw new Error(result.error)
  return (result?.goods || []).map(item => item.referenceImage).filter(Boolean)
}

const handleFeishuPreview = async () => {
  feishuPlanning.value = true
  try {
    const plan = buildFeishuUploadPlan({
      token: feishuToken.value,
      bitableUrl: feishuBitableUrl.value,
      attachmentField: feishuAttachmentField.value,
      startRow: feishuStartRow.value,
      endRow: feishuEndRow.value,
      folders: feishuFolders.value
    })

    const folderFilesByPath = {}
    for (const folder of plan.folders) {
      folderFilesByPath[folder.folderPath] = await readFeishuFolderImages(folder.folderPath)
    }

    feishuPreview.value = buildFeishuLocalUploadPreview(plan, folderFilesByPath)
    if (feishuPreview.value.missingFolders.length) {
      ElMessage.warning('部分素材文件夹没有可用图片，请检查预览')
    } else {
      ElMessage.success('飞书上传预览已生成')
    }
  } catch (err) {
    feishuPreview.value = null
    ElMessage.error('飞书上传规划失败: ' + err.message)
  } finally {
    feishuPlanning.value = false
  }
}

const copyFeishuManifest = async () => {
  if (!feishuPreview.value) {
    ElMessage.warning('请先生成飞书上传预览')
    return
  }
  const manifest = buildFeishuUploadManifest(feishuPreview.value, {
    title: '智绘AI飞书上传清单',
    includeTokenHint: true
  })
  await window.electronAPI.writeClipboardText(JSON.stringify(manifest, null, 2))
  ElMessage.success('飞书上传清单已复制到剪贴板')
}

const selectXhsOutputDir = async () => {
  const folderPath = await getSaveFolder()
  if (!folderPath) return
  xhsOutputDir.value = folderPath
}

const handleBuildXhsDownloadPlan = () => {
  const plan = buildXhsGoodsDownloadPlan({
    shareText: xhsShareText.value,
    outputDir: xhsOutputDir.value,
    filePrefix: xhsFilePrefix.value
  })
  xhsDownloadPlan.value = plan
  if (!plan.totalCount) {
    ElMessage.warning('没有识别到链接，请粘贴小红书分享文案或图片直链')
  } else if (!plan.downloadableCount) {
    ElMessage.warning('已生成队列，但暂未发现可直接下载的图片直链')
  } else {
    ElMessage.success(`已识别 ${plan.totalCount} 条链接，可直接下载 ${plan.downloadableCount} 张`)
  }
}

const handleDownloadXhsAssets = async () => {
  if (!xhsDownloadPlan.value) {
    handleBuildXhsDownloadPlan()
  }
  if (!xhsDownloadPlan.value?.downloadableCount) {
    ElMessage.warning('没有可直接下载的图片直链')
    return
  }
  xhsDownloading.value = true
  try {
    const result = await window.electronAPI.xhsGoodsDownload({
      tasks: xhsDownloadableTasks.value,
      outputDir: xhsOutputDir.value
    })
    if (result.success) {
      ElMessage.success(`下载完成：成功 ${result.successCount} 张，失败 ${result.failCount} 张`)
      if (result.outputDir) window.electronAPI.openFolder(result.outputDir)
    } else {
      ElMessage.error(result.error || '下载失败')
    }
  } catch (err) {
    ElMessage.error('下载失败: ' + err.message)
  } finally {
    xhsDownloading.value = false
  }
}

const openXhsManualTask = (task) => {
  if (!task?.url) return
  window.electronAPI.openExternal(task.url)
}

const setPreviewBefore = (filePath) => {
  previewBefore.value = getFilePathSrc(filePath)
}

const setPreviewAfter = (filePath) => {
  previewAfter.value = getFilePathSrc(filePath)
}

const clearPreview = () => {
  previewBefore.value = ''
  previewAfter.value = ''
}

const openPreview = (src) => {
  previewDialogSrc.value = src
  previewDialogVisible.value = true
}

// ========== 图片处理 ==========
const selectWatermarkLogo = async () => {
  const filePath = await getFilePath([
    { name: 'Logo图片', extensions: ['png', 'jpg', 'jpeg', 'webp'] }
  ])
  if (filePath) {
    watermarkLogoPath.value = filePath
    ElMessage.success('Logo已选择')
  }
}

const handleWatermark = async () => {
  if (watermarkMode.value === 'text' && !watermarkText.value) return ElMessage.warning('请输入水印文字')
  if (watermarkMode.value === 'logo' && !watermarkLogoPath.value) return ElMessage.warning('请先选择Logo图片')
  const filePath = await getFilePath()
  if (!filePath) return
  setPreviewBefore(filePath)
  processing.value = true
  try {
    const result = await window.electronAPI.imageWatermark(buildAdvancedWatermarkPayload({
      inputPath: filePath,
      mode: watermarkMode.value,
      text: watermarkText.value,
      logoPath: watermarkLogoPath.value,
      fontFamily: watermarkFontFamily.value,
      position: watermarkPosition.value,
      opacity: watermarkOpacity.value
    }))
    if (result.success) {
      setPreviewAfter(result.outputPath)
      // 确认对话框
      try {
        await ElMessageBox.confirm(
          '水印已添加，是否打开文件夹查看？',
          '处理完成',
          { type: 'success', confirmButtonText: '打开文件夹', cancelButtonText: '关闭' }
        )
        window.electronAPI.openFolder(result.outputDir)
      } catch {
        // 用户点击关闭
      }
    } else {
      ElMessage.error(result.error)
    }
  } catch (err) {
    ElMessage.error('操作失败: ' + err.message)
  }
  processing.value = false
}

const handleCompress = async () => {
  const filePath = await getFilePath()
  if (!filePath) return
  setPreviewBefore(filePath)
  processing.value = true
  try {
    const result = await window.electronAPI.imageCompress({
      inputPath: filePath,
      quality: compressQuality.value
    })
    if (result.success) {
      setPreviewAfter(result.outputPath)
      try {
        await ElMessageBox.confirm(
          `压缩完成！原始: ${result.originalSize} → 压缩后: ${result.newSize}，是否打开文件夹查看？`,
          '处理完成',
          { type: 'success', confirmButtonText: '打开文件夹', cancelButtonText: '关闭' }
        )
        window.electronAPI.openFolder(result.outputDir)
      } catch {}
    } else {
      ElMessage.error(result.error)
    }
  } catch (err) {
    ElMessage.error('操作失败: ' + err.message)
  }
  processing.value = false
}

const handleCollage = async () => {
  const filePaths = await getMultiFilePath()
  if (!filePaths || filePaths.length < 2) return ElMessage.warning('请选择至少2张图片')
  processing.value = true
  try {
    const request = normalizeAdvancedCollageRequest({
      imagePaths: filePaths,
      layout: collageLayout.value,
      scale: collageScale.value,
      gap: collageGap.value,
      borderWidth: collageBorderWidth.value,
      borderColor: collageBorderColor.value,
      background: collageBackground.value,
      exportZip: collageExportZip.value
    })
    const result = await window.electronAPI.imageCollageAdvanced(request)
    if (result.success) {
      setPreviewAfter(result.outputPath)
      try {
        await ElMessageBox.confirm('拼图生成成功，是否打开文件夹查看？', '处理完成', { type: 'success' })
        window.electronAPI.openFolder(result.outputDir)
      } catch {}
    } else {
      ElMessage.error(result.error)
    }
  } catch (err) {
    ElMessage.error('操作失败: ' + err.message)
  }
  processing.value = false
}

const selectBgImage = async () => {
  const filePath = await getFilePath()
  if (filePath) {
    bgImagePath.value = filePath
    try {
      const result = await window.electronAPI.addBgHistory({ imagePath: filePath })
      bgHistory.value = result?.history || bgHistory.value
    } catch {
      // 背景历史只是便捷功能，失败不影响换图主流程。
    }
    ElMessage.success('背景图已选择')
  }
}

const handleBgReplace = async () => {
  if (!bgImagePath.value) return ElMessage.warning('请先选择背景图')
  const filePath = await getFilePath()
  if (!filePath) return
  setPreviewBefore(filePath)
  processing.value = true
  try {
    const result = await window.electronAPI.imageBgReplace({
      foregroundPath: filePath,
      backgroundPath: bgImagePath.value
    })
    if (result.success) {
      setPreviewAfter(result.outputPath)
      ElMessage.success('背景替换成功！')
      window.electronAPI.openFolder(result.outputDir)
    } else {
      ElMessage.error(result.error)
    }
  } catch (err) {
    ElMessage.error('操作失败: ' + err.message)
  }
  processing.value = false
}

const selectSceneBackground = async () => {
  const filePath = await getFilePath()
  if (filePath) {
    sceneBackgroundPath.value = filePath
    ElMessage.success('场景背景已选择')
  }
}

const selectSceneOverlay = async () => {
  const filePath = await getFilePath()
  if (filePath) {
    sceneOverlayPath.value = filePath
    ElMessage.success('嵌入图片已选择')
  }
}

const handleSceneCompose = async () => {
  if (!sceneBackgroundPath.value) return ElMessage.warning('请先选择场景背景')
  if (!sceneOverlayPath.value) return ElMessage.warning('请先选择嵌入图片')
  setPreviewBefore(sceneBackgroundPath.value)
  processing.value = true
  try {
    const result = await window.electronAPI.imageSceneCompose(buildSceneComposeRequest({
      backgroundPath: sceneBackgroundPath.value,
      overlayPath: sceneOverlayPath.value,
      preset: scenePreset.value,
      opacity: sceneOpacity.value,
      blend: sceneBlend.value,
      fit: sceneFit.value,
      outputName: '场景化排版'
    }))
    if (result.success) {
      setPreviewAfter(result.outputPath)
      ElMessage.success('场景图生成成功')
      window.electronAPI.openFolder(result.outputDir)
    } else {
      ElMessage.error(result.error)
    }
  } catch (err) {
    ElMessage.error('场景排版失败: ' + err.message)
  }
  processing.value = false
}

const handleImageSplit = async () => {
  const filePaths = await getMultiFilePath()
  if (!filePaths || filePaths.length < 1) return ElMessage.warning('请选择至少1张图片')
  processing.value = true
  try {
    const result = await window.electronAPI.imageSplit({
      imagePaths: filePaths,
      direction: splitDirection.value,
      targetSize: splitTargetSize.value,
      overlap: splitOverlap.value,
      format: splitFormat.value,
      outputName: splitOutputName.value
    })
    if (result.success) {
      ElMessage.success(`图片切片完成，共导出 ${result.sliceCount} 张`)
      window.electronAPI.openFolder(result.outputDir)
    } else {
      ElMessage.error(result.error || '图片切片失败')
    }
  } catch (err) {
    ElMessage.error('图片切片失败: ' + err.message)
  }
  processing.value = false
}

// ========== 视频处理 ==========
const handleImagesToVideo = async () => {
  const filePaths = await getMultiFilePath()
  if (!filePaths || filePaths.length < 1) return ElMessage.warning('请选择至少1张图片')
  processing.value = true
  try {
    const result = await window.electronAPI.videoCreate(buildVideoCreateRequest({
      imagePaths: filePaths,
      mode: videoMode.value,
      durationPerImage: videoDuration.value,
      transition: videoTransition.value,
      resolution: videoResolution.value
    }))
    if (result.success) {
      ElMessage.success('视频生成成功！')
      window.electronAPI.openFolder(result.outputDir)
    } else {
      ElMessage.error(result.error)
    }
  } catch (err) {
    ElMessage.error('操作失败: ' + err.message)
  }
  processing.value = false
}

const handleVideoTrim = async () => {
  const filePath = await getFilePath([{ name: '视频文件', extensions: ['mp4', 'avi', 'mov', 'mkv', 'webm'] }])
  if (!filePath) return
  processing.value = true
  try {
    const result = await window.electronAPI.videoTrim({
      inputPath: filePath,
      startTime: trimStart.value,
      endTime: trimEnd.value
    })
    if (result.success) {
      ElMessage.success('视频截取成功！')
      window.electronAPI.openFolder(result.outputDir)
    } else {
      ElMessage.error(result.error)
    }
  } catch (err) {
    ElMessage.error('操作失败: ' + err.message)
  }
  processing.value = false
}

const handleVideoWatermark = async () => {
  if (!videoWatermarkText.value) return ElMessage.warning('请输入水印文字')
  const filePath = await getFilePath([{ name: '视频文件', extensions: ['mp4', 'avi', 'mov', 'mkv', 'webm'] }])
  if (!filePath) return
  processing.value = true
  try {
    const result = await window.electronAPI.videoWatermark({
      inputPath: filePath,
      text: videoWatermarkText.value,
      path: videoWatermarkPath.value
    })
    if (result.success) {
      ElMessage.success('视频水印添加成功！')
      window.electronAPI.openFolder(result.outputDir)
    } else {
      ElMessage.error(result.error)
    }
  } catch (err) {
    ElMessage.error('操作失败: ' + err.message)
  }
  processing.value = false
}

const selectVideoBgImage = async () => {
  const filePath = await getFilePath()
  if (filePath) {
    videoBgImagePath.value = filePath
    ElMessage.success('背景图已选择')
  }
}

const handleVideoBgReplace = async () => {
  if (!videoBgImagePath.value) return ElMessage.warning('请先选择背景图')
  const filePath = await getFilePath([{ name: '视频文件', extensions: ['mp4', 'avi', 'mov', 'mkv', 'webm'] }])
  if (!filePath) return
  processing.value = true
  try {
    const result = await window.electronAPI.videoBgReplace({
      videoPath: filePath,
      backgroundPath: videoBgImagePath.value
    })
    if (result.success) {
      ElMessage.success('视频背景替换成功！')
      window.electronAPI.openFolder(result.outputDir)
    } else {
      ElMessage.error(result.error)
    }
  } catch (err) {
    ElMessage.error('操作失败: ' + err.message)
  }
  processing.value = false
}

const handleVideoToGif = async () => {
  const filePath = await getFilePath([{ name: '视频文件', extensions: ['mp4', 'avi', 'mov', 'mkv', 'webm'] }])
  if (!filePath) return
  processing.value = true
  try {
    const result = await window.electronAPI.videoToGif({
      inputPath: filePath,
      width: gifWidth.value,
      fps: gifFps.value
    })
    if (result.success) {
      ElMessage.success('GIF转换成功！')
      window.electronAPI.openFolder(result.outputDir)
    } else {
      ElMessage.error(result.error)
    }
  } catch (err) {
    ElMessage.error('操作失败: ' + err.message)
  }
  processing.value = false
}

// ========== 文档处理 ==========
const handleWordToPdf = async () => {
  const filePath = await getFilePath([{ name: 'Word文档', extensions: ['docx', 'doc'] }])
  if (!filePath) return
  processing.value = true
  try {
    const result = await window.electronAPI.docWordToPdf({ inputPath: filePath })
    if (result.success) {
      ElMessage.success('Word转PDF成功！')
      window.electronAPI.openFolder(result.outputDir)
    } else {
      ElMessage.error(result.error)
    }
  } catch (err) {
    ElMessage.error('操作失败: ' + err.message)
  }
  processing.value = false
}

const handlePdfToImages = async () => {
  const filePath = await getFilePath([{ name: 'PDF文件', extensions: ['pdf'] }])
  if (!filePath) return
  processing.value = true
  try {
    const result = await window.electronAPI.docPdfToImages(buildPdfImagesRequest({
      inputPath: filePath,
      pageRange: pdfPageRange.value,
      resolution: pdfImageResolution.value,
      downloadMode: pdfExportZip.value ? 'zip' : 'images'
    }, { totalPages: 9999 }))
    if (result.success) {
      ElMessage.success(`PDF转图片成功！共 ${result.pageCount} 页`)
      window.electronAPI.openFolder(result.outputDir)
    } else {
      ElMessage.error(result.error)
    }
  } catch (err) {
    ElMessage.error('操作失败: ' + err.message)
  }
  processing.value = false
}

const handlePdfToVideo = async () => {
  const filePath = await getFilePath([{ name: 'PDF文件', extensions: ['pdf'] }])
  if (!filePath) return
  processing.value = true
  try {
    const result = await window.electronAPI.docPdfToVideo({
      inputPath: filePath,
      durationPerPage: pdfPageDuration.value
    })
    if (result.success) {
      ElMessage.success('PDF转视频成功！')
      window.electronAPI.openFolder(result.outputDir)
    } else {
      ElMessage.error(result.error)
    }
  } catch (err) {
    ElMessage.error('操作失败: ' + err.message)
  }
  processing.value = false
}

// ========== 魔法棒 ==========
const handleOptimizePrompt = async () => {
  if (!simplePrompt.value) return ElMessage.warning('请输入简单的提示词')
  processing.value = true
  try {
    const result = await window.electronAPI.optimizePrompt({
      prompt: simplePrompt.value
    })
    if (result.success) {
      optimizedPrompt.value = result.optimized
      ElMessage.success('提示词优化完成！')
    } else {
      ElMessage.error(result.error)
    }
  } catch (err) {
    ElMessage.error('优化失败: ' + err.message)
  }
  processing.value = false
}

const copyOptimizedPrompt = () => {
  emit('use-prompt', optimizedPrompt.value)
  visible.value = false
  ElMessage.success('已复制到提示词输入框')
}

// ========== OCR导出 ==========
const handleOcrToPptx = async () => {
  const filePaths = await getMultiFilePath()
  if (!filePaths || filePaths.length === 0) return ElMessage.warning('请选择至少1张图片')
  processing.value = true
  try {
    ElMessage.info('正在OCR识别中，请稍候...')
    const result = await window.electronAPI.ocrToPptx({ imagePaths: filePaths })
    if (result.success) {
      ElMessage.success('OCR导出PPT成功！文字可直接编辑')
      window.electronAPI.openFolder(result.outputDir)
    } else {
      ElMessage.error(result.error)
    }
  } catch (err) {
    ElMessage.error('OCR导出失败: ' + err.message)
  }
  processing.value = false
}

const handleOcrToDocx = async () => {
  const filePaths = await getMultiFilePath()
  if (!filePaths || filePaths.length === 0) return ElMessage.warning('请选择至少1张图片')
  processing.value = true
  try {
    ElMessage.info('正在OCR识别中，请稍候...')
    const result = await window.electronAPI.ocrToDocx({ imagePaths: filePaths })
    if (result.success) {
      ElMessage.success('OCR导出Word成功！文字可直接编辑')
      window.electronAPI.openFolder(result.outputDir)
    } else {
      ElMessage.error(result.error)
    }
  } catch (err) {
    ElMessage.error('OCR导出失败: ' + err.message)
  }
  processing.value = false
}

// ========== 智能去字/提取底图 ==========
const handleRemoveText = async () => {
  const filePath = await getFilePath()
  if (!filePath) return
  setPreviewBefore(filePath)
  processing.value = true
  try {
    ElMessage.info('正在AI去字中，请稍候...')
    const result = await window.electronAPI.removeText({ imagePath: filePath })
    if (result.success) {
      setPreviewAfter(result.outputPath)
      ElMessage.success('智能去字成功！')
      window.electronAPI.openFolder(result.outputDir)
    } else {
      ElMessage.error(result.error)
    }
  } catch (err) {
    ElMessage.error('去字失败: ' + err.message)
  }
  processing.value = false
}

const handleExtractBackground = async () => {
  const filePath = await getFilePath()
  if (!filePath) return
  setPreviewBefore(filePath)
  processing.value = true
  try {
    ElMessage.info('正在AI提取底图，请稍候...')
    const result = await window.electronAPI.extractBackground({ imagePath: filePath })
    if (result.success) {
      setPreviewAfter(result.outputPath)
      ElMessage.success('底图提取成功！')
      window.electronAPI.openFolder(result.outputDir)
    } else {
      ElMessage.error(result.error)
    }
  } catch (err) {
    ElMessage.error('提取失败: ' + err.message)
  }
  processing.value = false
}

// ========== AI橡皮擦 ==========
const handleAiEraserSingle = async () => {
  const filePath = await getFilePath()
  if (!filePath) return
  setPreviewBefore(filePath)
  processing.value = true
  try {
    ElMessage.info('正在AI橡皮擦处理中，请稍候（可能需要1-2分钟）...')
    const result = await window.electronAPI.aiEraser({ imagePath: filePath })
    if (result.success) {
      setPreviewAfter(result.outputPath)
      ElMessage.success('AI橡皮擦完成！文字已擦除，底图已保留')
      window.electronAPI.openFolder(result.outputDir)
    } else {
      ElMessage.error(result.error)
    }
  } catch (err) {
    ElMessage.error('橡皮擦失败: ' + err.message)
  }
  processing.value = false
}

const handleAiEraserBatch = async () => {
  const filePaths = await getMultiFilePath()
  if (!filePaths || filePaths.length === 0) return ElMessage.warning('请选择至少1张图片')
  processing.value = true
  try {
    ElMessage.info(`正在批量处理 ${filePaths.length} 张图片，每张约1-2分钟，请耐心等待...`)
    const result = await window.electronAPI.aiEraserBatch({ imagePaths: filePaths })
    if (result.success) {
      ElMessage.success(`批量橡皮擦完成！成功${result.successCount}张，失败${result.failCount}张，已导出为PPT`)
      window.electronAPI.openFolder(result.outputDir)
    } else {
      ElMessage.error(result.error)
    }
  } catch (err) {
    ElMessage.error('批量橡皮擦失败: ' + err.message)
  }
  processing.value = false
}

// ========== 模板库 ==========
const handleSaveTemplate = async () => {
  if (!newTemplateName.value || !newTemplatePrompt.value) return
  try {
    const result = await window.electronAPI.saveTemplate({
      name: newTemplateName.value,
      prompt: newTemplatePrompt.value
    })
    if (result.success) {
      ElMessage.success('模板保存成功！')
      newTemplateName.value = ''
      newTemplatePrompt.value = ''
      loadTemplates()
    }
  } catch (err) {
    ElMessage.error('保存失败: ' + err.message)
  }
}

const handleDeleteTemplate = async (index) => {
  try {
    await ElMessageBox.confirm('确定要删除这个模板吗？', '确认删除', { type: 'warning' })
    const result = await window.electronAPI.deleteTemplate({ index })
    if (result.success) {
      ElMessage.success('模板已删除')
      loadTemplates()
    }
  } catch {
    // 用户取消
  }
}

const useTemplate = (tpl) => {
  emit('use-prompt', tpl.prompt)
  visible.value = false
  ElMessage.success('模板已应用到提示词')
}

const handleClose = () => {
  visible.value = false
}
</script>

<style lang="scss" scoped>
.preview-section {
  padding: 16px;
  margin-bottom: 16px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e7ed 100%);
  border-radius: 12px;
  border: 2px dashed #dcdfe6;

  .preview-compare {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 20px;
    margin-bottom: 12px;

    .preview-box {
      flex: 1;
      max-width: 45%;
      background: white;
      border-radius: 8px;
      padding: 12px;
      text-align: center;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

      h4 {
        margin: 0 0 8px 0;
        color: #303133;
        font-size: 14px;
      }

      img {
        max-width: 100%;
        max-height: 200px;
        border-radius: 4px;
        cursor: pointer;
        transition: transform 0.3s;

        &:hover {
          transform: scale(1.02);
        }
      }
    }

    .preview-arrow {
      font-size: 32px;
      color: #409eff;
      font-weight: bold;
    }
  }
}

.bg-preview {
  margin-top: 12px;
  text-align: center;

  img {
    max-width: 200px;
    max-height: 100px;
    border-radius: 4px;
    border: 1px solid #dcdfe6;
  }
}

.bg-history {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 10px;

  span {
    color: #606266;
    font-size: 13px;
  }
}

.scene-compose-panel {
  display: grid;
  gap: 12px;
}

.scene-preview {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 180px));
  gap: 12px;

  div {
    display: grid;
    gap: 6px;
    padding: 8px;
    background: #ffffff;
    border: 1px solid #dfe7f2;
    border-radius: 8px;
  }

  span {
    color: #64748b;
    font-size: 12px;
  }

  img {
    width: 100%;
    height: 96px;
    object-fit: contain;
    background: #f8fafc;
    border-radius: 6px;
  }
}

.split-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.feishu-section {
  display: grid;
  gap: 12px;
}

.feishu-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.feishu-row-range,
.feishu-folder-row,
.feishu-summary,
.feishu-preview-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.feishu-row-range {
  padding: 0 10px;
  min-height: 40px;
  background: #ffffff;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  color: #606266;
}

.feishu-folder-list {
  display: grid;
  gap: 10px;
}

.feishu-folder-row {
  padding: 10px;
  background: #ffffff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
}

.feishu-folder-row .el-input {
  flex: 1;
  min-width: 260px;
}

.feishu-preview-panel {
  display: grid;
  gap: 10px;
  padding: 12px;
  background: #ffffff;
  border: 1px solid #dfe7f2;
  border-radius: 8px;
}

.feishu-preview-list {
  display: grid;
  gap: 8px;
  max-height: 260px;
  overflow-y: auto;
}

.feishu-preview-row {
  padding: 8px 10px;
  background: #f8fafc;
  border-radius: 6px;
}

.empty-tip-inline {
  color: #909399;
  font-size: 13px;
}

.collect-section {
  display: grid;
  gap: 12px;
}

.collect-grid {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) minmax(260px, 2fr) auto auto auto;
  gap: 10px;
  align-items: center;
}

.collect-preview-panel {
  display: grid;
  gap: 10px;
  padding: 12px;
  background: #ffffff;
  border: 1px solid #dfe7f2;
  border-radius: 8px;
}

.collect-summary,
.collect-task-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.collect-task-list {
  display: grid;
  gap: 8px;
  max-height: 320px;
  overflow-y: auto;
}

.collect-task-row {
  padding: 10px;
  background: #f8fafc;
  border-radius: 6px;
}

.collect-task-main {
  display: grid;
  gap: 4px;
  flex: 1;
  min-width: 280px;
}

.collect-task-main span {
  color: #606266;
  font-size: 13px;
}

.collect-task-main small {
  color: #909399;
  word-break: break-all;
}

.tool-section {
  padding: 16px;
  margin-bottom: 12px;
  background: #f5f7fa;
  border-radius: 8px;

  h3 {
    margin: 0 0 12px 0;
    color: #303133;
    font-size: 15px;
  }

  .tip {
    color: #909399;
    font-size: 13px;
    margin-bottom: 12px;
  }
}

.tool-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.file-selected {
  color: #67c23a;
  font-size: 13px;
}

.optimized-result {
  margin-top: 16px;
  padding: 12px;
  background: #f0f9eb;
  border-radius: 8px;
  border: 1px solid #e1f3d8;

  h4 {
    margin: 0 0 8px 0;
    color: #67c23a;
  }
}

.template-form {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.template-list {
  max-height: 300px;
  overflow-y: auto;
}

.template-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: white;
  border-radius: 6px;
  margin-bottom: 8px;
  border: 1px solid #ebeef5;

  &:hover {
    border-color: #409eff;
  }

  .template-info {
    flex: 1;
    overflow: hidden;

    .template-name {
      font-weight: 600;
      color: #303133;
      display: block;
      margin-bottom: 4px;
    }

    .template-prompt {
      font-size: 13px;
      color: #909399;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  }
}

.empty-tip {
  text-align: center;
  color: #909399;
  padding: 40px;
}
</style>
