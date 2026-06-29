function toFiniteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeRecognitionRegion(region = {}) {
  const x = clamp(toFiniteNumber(region.x), 0, 100);
  const y = clamp(toFiniteNumber(region.y), 0, 100);
  const width = clamp(toFiniteNumber(region.width, 20), 1, 100 - x || 1);
  const height = clamp(toFiniteNumber(region.height, 10), 1, 100 - y || 1);
  const angle = ((toFiniteNumber(region.angle) % 360) + 360) % 360;

  return {
    id: String(region.id || '').trim(),
    x,
    y,
    width,
    height,
    angle,
    text: String(region.text || '').trim(),
    excluded: Boolean(region.excluded)
  };
}

function normalizeRecognitionRegions(regions) {
  if (!Array.isArray(regions)) return [];
  return regions
    .map(normalizeRecognitionRegion)
    .filter(region => region.width > 0 && region.height > 0);
}

function isPointInRegion(point, region) {
  return (
    point.x >= region.x &&
    point.x <= region.x + region.width &&
    point.y >= region.y &&
    point.y <= region.y + region.height
  );
}

function getWordCenterPercent(word, metadata = {}) {
  const bbox = word?.bbox;
  const imageWidth = toFiniteNumber(metadata.width);
  const imageHeight = toFiniteNumber(metadata.height);
  if (!bbox || imageWidth <= 0 || imageHeight <= 0) return null;

  const x0 = toFiniteNumber(bbox.x0, NaN);
  const x1 = toFiniteNumber(bbox.x1, NaN);
  const y0 = toFiniteNumber(bbox.y0, NaN);
  const y1 = toFiniteNumber(bbox.y1, NaN);
  if (![x0, x1, y0, y1].every(Number.isFinite)) return null;

  return {
    x: clamp(((x0 + x1) / 2 / imageWidth) * 100, 0, 100),
    y: clamp(((y0 + y1) / 2 / imageHeight) * 100, 0, 100)
  };
}

function filterOcrWordsByRegions(words, regions, metadata = {}) {
  if (!Array.isArray(words)) return [];
  const normalizedRegions = normalizeRecognitionRegions(regions);
  if (!normalizedRegions.length) return words;

  const includeRegions = normalizedRegions.filter(region => !region.excluded);
  const excludeRegions = normalizedRegions.filter(region => region.excluded);

  return words.filter(word => {
    const point = getWordCenterPercent(word, metadata);
    if (!point) return includeRegions.length === 0;
    const insideIncluded = includeRegions.length === 0 || includeRegions.some(region => isPointInRegion(point, region));
    const insideExcluded = excludeRegions.some(region => isPointInRegion(point, region));
    return insideIncluded && !insideExcluded;
  });
}

function textFromOcrWords(words) {
  return (Array.isArray(words) ? words : [])
    .map(word => String(word?.text || '').trim())
    .filter(Boolean)
    .join(' ');
}

function describeRecognitionRegions(regions, options = {}) {
  const normalizedRegions = normalizeRecognitionRegions(regions);
  if (!normalizedRegions.length) return '';

  const action = options.action || 'ocr';
  const lines = normalizedRegions.map((region, index) => {
    const kind = region.excluded ? '排除区' : '保留区';
    const label = region.text ? `，备注：${region.text}` : '';
    return `${index + 1}. ${kind}: x=${region.x.toFixed(1)}%, y=${region.y.toFixed(1)}%, w=${region.width.toFixed(1)}%, h=${region.height.toFixed(1)}%${label}`;
  });

  if (action === 'removeText') {
    return [
      '区域约束（坐标为百分比）：',
      '存在保留区时，只去除保留区内的文字；不存在保留区时处理全图文字。',
      '排除区必须保持原样，不要删除、重绘或改动其中的内容。',
      ...lines
    ].join('\n');
  }

  return [
    'OCR 区域约束（坐标为百分比）：',
    '存在保留区时，只识别保留区内的文字；不存在保留区时识别全图。',
    '排除区内的文字不要纳入识别结果。',
    ...lines
  ].join('\n');
}

module.exports = {
  describeRecognitionRegions,
  filterOcrWordsByRegions,
  normalizeRecognitionRegion,
  normalizeRecognitionRegions,
  textFromOcrWords
};
