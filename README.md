# AI教辅小红书自动作图工具

一款 Windows 桌面端批量 AI 作图工具，专为小红书教辅内容创作者设计。

## ✨ 功能特点

- 🎨 **GPT Image 2 API** - 支持图生图编辑模式，中文文字准确率高
- 🛡️ **四层原创性增强** - 叠加、形变、色彩、EXIF 四层防查重
- ⚡ **全并行批量处理** - 默认 4 张图同时生成，效率提升 4 倍
- 🔒 **安全架构** - Electron 安全最佳实践，API Key 加密存储

## 🚀 快速开始

### 1. 安装依赖

```bash
cd AI教辅作图工具
npm install
```

### 2. 启动开发模式

```bash
npm run dev
```

### 3. 构建生产版本

```bash
npm run build
```

## 📦 技术栈

- **Electron 31** - 桌面应用框架
- **Vue 3** - 前端框架
- **Vite 5** - 构建工具
- **Element Plus** - UI 组件库
- **Pinia** - 状态管理
- **Sharp** - 图片处理

## ⚙️ 配置说明

### API 配置

1. 打开应用后点击"API设置"
2. 输入你的 OpenAI API Key
3. 如需代理，配置代理主机和端口

### 输出目录

- 原始输出：`Documents/AI教辅绘制/生成图片`
- 最终输出：`Documents/AI教辅绘制/AI教辅绘制输出`

## 📁 项目结构

```
AI教辅作图工具/
├── src/
│   ├── main/              # 主进程
│   │   └── main.js        # 主进程入口
│   ├── preload/           # Preload脚本
│   │   └── preload.js     # 安全桥接
│   └── renderer/          # 渲染进程
│       ├── index.html     # HTML入口
│       └── src/
│           ├── main.js    # Vue入口
│           ├── App.vue    # 主组件
│           ├── store/     # 状态管理
│           └── components/# 组件
├── package.json
└── vite.config.js
```

## 🛠️ 开发说明

### 主要模块

1. **文件导入模块** - 支持导入整个文件夹，自动扫描图片
2. **API调用模块** - GPT Image 2 图生图
3. **批量生成模块** - 并发控制 + 超时重试
4. **原创性增强引擎** - Sharp 实现四层防护
5. **导出模块** - 自动创建子文件夹导出

### 安全架构

- `contextIsolation: true` - 上下文隔离
- `nodeIntegration: false` - 禁用Node集成
- Preload脚本通过contextBridge暴露安全API

## 📝 注意事项

1. 首次使用需要配置 API Key
2. 大文件(>20MB)会提示压缩
3. 网络诊断可用于测试API连接
4. 原创性增强需要准备叠加图片

## 📄 License

MIT
