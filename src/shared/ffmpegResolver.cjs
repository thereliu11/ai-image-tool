function canRunFfmpeg(candidate, execFileSync) {
  if (!candidate) return false;
  try {
    execFileSync(candidate, ['-version'], { timeout: 5000, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function resolveFfmpegPath(options = {}) {
  const execFileSync = options.execFileSync || require('child_process').execFileSync;
  const configuredPath = typeof options.configuredPath === 'string' ? options.configuredPath.trim() : '';
  const bundledPath = options.bundledPath !== undefined ? options.bundledPath : require('ffmpeg-static');

  if (canRunFfmpeg(configuredPath, execFileSync)) {
    return configuredPath;
  }
  if (configuredPath && options.requireConfigured) {
    throw new Error(`指定的 FFmpeg 路径不可用：${configuredPath}`);
  }
  if (canRunFfmpeg(bundledPath, execFileSync)) {
    return bundledPath;
  }
  if (canRunFfmpeg('ffmpeg', execFileSync)) {
    return 'ffmpeg';
  }

  throw new Error('FFmpeg 不可用：内置 ffmpeg 无法运行，系统 PATH 中也没有可用的 ffmpeg。请重新安装依赖或安装 FFmpeg。');
}

module.exports = {
  resolveFfmpegPath
};
