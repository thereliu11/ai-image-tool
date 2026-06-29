const modes = new Set(['single-scroll', 'multi-scroll', 'long-scroll', 'horizontal-switch']);
const transitions = new Set(['none', 'fade', 'slide']);

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function cleanMode(value) {
  return modes.has(value) ? value : 'single-scroll';
}

function cleanTransition(value) {
  return transitions.has(value) ? value : 'none';
}

function getResolution(value) {
  return value === '720p'
    ? { width: 1280, height: 720 }
    : { width: 1920, height: 1080 };
}

function fmt(number) {
  return Number(number.toFixed(3)).toString();
}

function motionExpression(mode, width, height, frames) {
  const size = `${width}x${height}`;
  if (mode === 'long-scroll') {
    return `zoompan=z='1':d=${frames}:x='0':y='if(gte(ih\\,oh)\\,min(ih-oh\\,on*(ih-oh)/${frames})\\,0)':s=${size}:fps=30`;
  }
  if (mode === 'horizontal-switch') {
    return `zoompan=z='1.05':d=${frames}:x='min(iw-iw/zoom\\,on*(iw-iw/zoom)/${frames})':y='ih/2-(ih/zoom/2)':s=${size}:fps=30`;
  }
  if (mode === 'multi-scroll') {
    return `zoompan=z='min(zoom+0.001\\,1.08)':d=${frames}:x='iw/2-(iw/zoom/2)':y='min(ih-ih/zoom\\,on*(ih-ih/zoom)/${frames})':s=${size}:fps=30`;
  }
  return `zoompan=z='min(zoom+0.0008\\,1.06)':d=${frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${size}:fps=30`;
}

function buildVideoFilterGraph(input = {}) {
  const imageCount = Math.max(1, Math.floor(Number(input.imageCount) || 1));
  const durationPerImage = clampNumber(input.durationPerImage, 0.5, 30, 2);
  const mode = cleanMode(input.mode);
  const transition = cleanTransition(input.transition);
  const { width, height } = getResolution(input.resolution);
  const frames = Math.max(15, Math.round(durationPerImage * 30));
  const perImageFilters = [];

  for (let index = 0; index < imageCount; index++) {
    const motion = motionExpression(mode, width, height, frames);
    perImageFilters.push(
      `[${index}:v]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},setsar=1,${motion}[v${index}]`
    );
  }

  if (imageCount === 1) {
    return {
      filter: perImageFilters.join(';'),
      outputLabel: 'v0',
      width,
      height,
      fps: 30,
      durationPerImage,
      mode,
      transition
    };
  }

  if (transition === 'none') {
    const labels = Array.from({ length: imageCount }, (_, index) => `[v${index}]`).join('');
    return {
      filter: `${perImageFilters.join(';')};${labels}concat=n=${imageCount}:v=1:a=0[outv]`,
      outputLabel: 'outv',
      width,
      height,
      fps: 30,
      durationPerImage,
      mode,
      transition
    };
  }

  const transitionDuration = Math.min(0.5, durationPerImage / 3);
  const transitionName = transition === 'slide' ? 'slideleft' : 'fade';
  const xfadeFilters = [];
  let previous = 'v0';
  for (let index = 1; index < imageCount; index++) {
    const output = `xf${index}`;
    const offset = fmt((durationPerImage - transitionDuration) * index);
    xfadeFilters.push(`[${previous}][v${index}]xfade=transition=${transitionName}:duration=${fmt(transitionDuration)}:offset=${offset}[${output}]`);
    previous = output;
  }

  return {
    filter: `${perImageFilters.join(';')};${xfadeFilters.join(';')}`,
    outputLabel: previous,
    width,
    height,
    fps: 30,
    durationPerImage,
    mode,
    transition
  };
}

module.exports = {
  buildVideoFilterGraph
};
