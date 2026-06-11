/**
 * OCR文字提取 + Nano Banana图片生成模块
 * 两步流程：1. Gemini提取文字 2. Nano Banana生成精美图片
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const sharp = require('sharp');

// 3种渲染模式配置
const RENDER_MODES = {
  faithful: {
    name: '内容保真',
    style: '保持原内容不变，适合试卷、英语词汇、公式。使用干净的米白色背景，学术蓝标题，清晰的文字排版，类似iPad GoodNotes笔记风格'
  },
  twoStage: {
    name: '二段式',
    style: '温馨教育风格，浅色背景，圆角设计，卡通元素点缀，适合教辅资料'
  },
  strongStyle: {
    name: '强风格包装',
    style: '活泼可爱的小红书风格，明亮色彩，动态元素，吸引学生注意力，适合社交媒体展示'
  }
};

/**
 * 使用Gemini提取图片中的文字
 */
async function extractTextFromImage(imagePath, config) {
  const imageBuffer = fs.readFileSync(imagePath);
  const imageBase64 = imageBuffer.toString('base64');
  const ext = path.extname(imagePath).toLowerCase();
  const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';

  const axiosConfig = {
    headers: { 'Content-Type': 'application/json' },
    timeout: 60000
  };
  axiosConfig.params = { key: config.api.token };

  if (config.api.proxyHost && config.api.proxyPort) {
    const { HttpsProxyAgent } = require('https-proxy-agent');
    axiosConfig.httpsAgent = new HttpsProxyAgent(`http://${config.api.proxyHost}:${config.api.proxyPort}`);
  }

  const requestBody = {
    contents: [{
      parts: [
        {
          text: `请精准提取图片中的所有英文短语和中文解释，以 JSON 数组格式返回。

要求：
1. 每个条目包含 "english"（英文短语）和 "chinese"（中文解释）两个字段
2. 保持原文的顺序
3. 只返回JSON数组

示例：
[{"english":"take care of","chinese":"照顾"}, {"english":"look like","chinese":"看起来像"}]`
        },
        { inlineData: { mimeType: mimeType, data: imageBase64 } }
      ]
    }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 4096 }
  };

  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`,
    requestBody, axiosConfig
  );

  const candidates = response.data.candidates || [];
  if (candidates.length > 0 && candidates[0].content && candidates[0].content.parts) {
    const textPart = candidates[0].content.parts.find(p => p.text);
    if (textPart) {
      const jsonMatch = textPart.text.match(/\[[\s\S]*\]/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
    }
  }
  throw new Error('无法提取文字数据');
}

/**
 * 使用Nano Banana生成精美图片
 */
async function generateImageWithNanoBanana(textData, title, mode, config) {
  const styleConfig = RENDER_MODES[mode] || RENDER_MODES.faithful;

  // 构建文字内容描述
  let contentDescription = '';
  textData.forEach((item, i) => {
    contentDescription += `${i + 1}. ${item.english} - ${item.chinese}\n`;
  });

  // 构建提示词
  const prompt = `请生成一张精美的英语学习笔记图片，要求如下：

【内容】
标题：${title || '英语重点词汇'}
内容列表：
${contentDescription}

【风格要求】
${styleConfig.style}

【具体要求】
1. 16:9竖版构图，适合手机查看
2. 背景使用渐变色或纸张质感
3. 标题使用醒目的艺术字体
4. 每个英文短语用蓝色或橙色高亮显示
5. 中文解释使用黑色或深灰色
6. 添加可爱的卡通装饰元素（书本、铅笔、星星、花朵等）
7. 序号使用圆形背景
8. 整体风格要像真实的教辅笔记
9. 适合小红书等社交媒体展示

【禁止事项】
- 不要生成模糊或变形的文字
- 不要添加与学习无关的元素
- 不要使用过于花哨的背景`;

  const axiosConfig = {
    headers: { 'Content-Type': 'application/json' },
    timeout: 120000 // 图片生成需要更长时间
  };
  axiosConfig.params = { key: config.api.token };

  if (config.api.proxyHost && config.api.proxyPort) {
    const { HttpsProxyAgent } = require('https-proxy-agent');
    axiosConfig.httpsAgent = new HttpsProxyAgent(`http://${config.api.proxyHost}:${config.api.proxyPort}`);
  }

  const requestBody = {
    contents: [{
      parts: [{ text: prompt }]
    }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE']
    }
  };

  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent`,
    requestBody, axiosConfig
  );

  // 解析响应，提取图片
  const candidates = response.data.candidates || [];
  if (candidates.length > 0 && candidates[0].content && candidates[0].content.parts) {
    const imagePart = candidates[0].content.parts.find(p => p.inlineData);
    if (imagePart) {
      return imagePart.inlineData.data; // base64图片数据
    }
  }

  throw new Error('Nano Banana未能生成图片');
}

/**
 * 完整的OCR+生成流程
 */
async function ocrAndRender(imagePath, outputPath, config, title = '', mode = 'faithful') {
  // 第一步：使用Gemini提取文字
  addLog('第一步：Gemini OCR提取文字...', 'INFO', 'OCR');
  const textData = await extractTextFromImage(imagePath, config);

  if (!textData || textData.length === 0) {
    throw new Error('未能提取到文字');
  }
  addLog(`提取到 ${textData.length} 条文字`, 'INFO', 'OCR');

  // 第二步：使用Nano Banana生成精美图片
  addLog('第二步：Nano Banana生成图片...', 'INFO', 'OCR');
  const imageBase64 = await generateImageWithNanoBanana(textData, title, mode, config);

  // 保存图片
  fs.writeFileSync(outputPath, Buffer.from(imageBase64, 'base64'));
  addLog('图片生成完成', 'INFO', 'OCR');

  return {
    success: true,
    textCount: textData.length,
    textData,
    outputPath
  };
}

function addLog(message, level, module) {
  // 简单的日志输出
  console.log(`[${level}] [${module}] ${message}`);
}

module.exports = { extractTextFromImage, generateImageWithNanoBanana, ocrAndRender, RENDER_MODES };
