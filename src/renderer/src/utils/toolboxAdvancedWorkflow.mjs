import { parsePageRanges } from '../../../shared/pageRange.mjs'

function cleanText(value, fallback = '') {
  return String(value ?? fallback).trim() || fallback
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(max, Math.max(min, number))
}

function normalizeColor(value, fallback = '#ffffff') {
  const text = cleanText(value, fallback)
  return /^#[0-9a-f]{6}$/i.test(text) ? text.toLowerCase() : fallback
}

const collageLayouts = new Set(['1x2', '2x1', '2x2', '3x1', '1x3', '3x3'])
const watermarkModes = new Set(['text', 'logo'])
const videoModes = new Set(['single-scroll', 'multi-scroll', 'long-scroll', 'horizontal-switch'])
const transitions = new Set(['none', 'fade', 'slide'])
const sceneBlends = new Set(['over', 'multiply', 'screen', 'overlay', 'soft-light'])
const sceneFits = new Set(['contain', 'cover', 'fill'])
const scenePresets = {
  'paper-center': [
    { x: 22, y: 10 },
    { x: 78, y: 10 },
    { x: 78, y: 92 },
    { x: 22, y: 92 }
  ],
  'phone-screen': [
    { x: 31, y: 9 },
    { x: 69, y: 9 },
    { x: 69, y: 91 },
    { x: 31, y: 91 }
  ],
  'desktop-card': [
    { x: 15, y: 16 },
    { x: 85, y: 16 },
    { x: 85, y: 84 },
    { x: 15, y: 84 }
  ],
  custom: [
    { x: 18, y: 12 },
    { x: 82, y: 12 },
    { x: 82, y: 88 },
    { x: 18, y: 88 }
  ]
}

export function normalizeAdvancedCollageRequest(input = {}) {
  const imagePaths = (Array.isArray(input.imagePaths) ? input.imagePaths : [])
    .map(item => cleanText(item))
    .filter(Boolean)

  return {
    imagePaths,
    layout: collageLayouts.has(input.layout) ? input.layout : '2x2',
    options: {
      scale: clampNumber(input.scale, 1, 2, 1),
      gap: Math.round(clampNumber(input.gap, 0, 120, 16)),
      borderWidth: Math.round(clampNumber(input.borderWidth, 0, 40, 0)),
      borderColor: normalizeColor(input.borderColor, '#e2e8f0'),
      background: normalizeColor(input.background, '#ffffff'),
      text: cleanText(input.text),
      exportZip: Boolean(input.exportZip),
      templateName: cleanText(input.templateName)
    }
  }
}

export function normalizeWatermarkRequest(input = {}) {
  const mode = watermarkModes.has(input.mode) ? input.mode : 'text'
  return {
    mode,
    text: cleanText(input.text),
    logoPath: cleanText(input.logoPath),
    fontFamily: cleanText(input.fontFamily, 'Microsoft YaHei'),
    position: cleanText(input.position, 'bottom-right'),
    opacity: Math.round(clampNumber(input.opacity, 1, 100, 30))
  }
}

export function buildAdvancedWatermarkPayload(input = {}) {
  const normalized = normalizeWatermarkRequest(input)
  return {
    inputPath: cleanText(input.inputPath),
    mode: normalized.mode,
    text: normalized.text,
    logoPath: normalized.logoPath,
    fontFamily: normalized.fontFamily,
    position: normalized.position,
    opacity: normalized.opacity
  }
}

function normalizeScenePoint(point = {}) {
  return {
    x: Math.round(clampNumber(point.x, 0, 100, 0)),
    y: Math.round(clampNumber(point.y, 0, 100, 0))
  }
}

export function normalizeSceneComposeRequest(input = {}) {
  const preset = Object.prototype.hasOwnProperty.call(scenePresets, input.preset)
    ? input.preset
    : 'paper-center'
  const rawPoints = Array.isArray(input.points) && input.points.length >= 4
    ? input.points.slice(0, 4)
    : scenePresets[preset]

  return {
    backgroundPath: cleanText(input.backgroundPath),
    overlayPath: cleanText(input.overlayPath),
    preset,
    points: rawPoints.map(normalizeScenePoint),
    opacity: Math.round(clampNumber(input.opacity, 1, 100, 100)),
    blend: sceneBlends.has(input.blend) ? input.blend : 'over',
    fit: sceneFits.has(input.fit) ? input.fit : 'contain',
    outputName: cleanText(input.outputName, 'scene-compose')
  }
}

export function buildSceneComposeRequest(input = {}) {
  const normalized = normalizeSceneComposeRequest(input)
  return {
    backgroundPath: normalized.backgroundPath,
    overlayPath: normalized.overlayPath,
    options: {
      preset: normalized.preset,
      points: normalized.points,
      opacity: normalized.opacity,
      blend: normalized.blend,
      fit: normalized.fit,
      outputName: normalized.outputName
    }
  }
}

export function buildVideoCreatePlan(input = {}) {
  const imagePaths = (Array.isArray(input.imagePaths) ? input.imagePaths : []).filter(Boolean)
  const mode = videoModes.has(input.mode) ? input.mode : 'single-scroll'
  return {
    mode,
    imagePaths,
    durationPerImage: clampNumber(input.durationPerImage, 0.5, 30, 2),
    transition: transitions.has(input.transition) ? input.transition : 'none',
    resolution: cleanText(input.resolution, '1080p'),
    description: {
      'single-scroll': '单张长图从上到下滚动',
      'multi-scroll': '多张图依次滚动拼接',
      'long-scroll': '长图滚动展示',
      'horizontal-switch': '多图横向切换动画'
    }[mode]
  }
}

export function buildVideoCreateRequest(input = {}) {
  const plan = buildVideoCreatePlan(input)
  return {
    imagePaths: plan.imagePaths,
    durationPerImage: plan.durationPerImage,
    duration: plan.durationPerImage,
    mode: plan.mode,
    transition: plan.transition,
    resolution: plan.resolution
  }
}

export function buildPdfExportPlan(input = {}, context = {}) {
  const totalPages = Math.max(0, Number(context.totalPages) || 0)
  return {
    pages: parsePageRanges(input.pageRange, totalPages),
    resolution: cleanText(input.resolution, '1x') === '2x' ? '2x' : '1x',
    downloadMode: cleanText(input.downloadMode, 'images') === 'zip' ? 'zip' : 'images',
    durationPerPage: clampNumber(input.durationPerPage, 0.5, 20, 2),
    videoResolution: cleanText(input.videoResolution, '1080p')
  }
}

export function buildPdfImagesRequest(input = {}, context = {}) {
  const plan = buildPdfExportPlan(input, context)
  return {
    inputPath: cleanText(input.inputPath),
    pages: plan.pages,
    options: {
      scale: plan.resolution === '2x' ? 2 : 1,
      exportZip: plan.downloadMode === 'zip'
    }
  }
}
