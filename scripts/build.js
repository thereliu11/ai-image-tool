// AI教辅作图工具 - 构建脚本
// 功能：清理旧 release + 调用 electron-builder + 清理冗余
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TMP_DIR = 'C:\\tmp\\ai-tool-desktop';

console.log('========================================');
console.log('  AI教辅作图工具 - 生产构建');
console.log('========================================\n');

// 1. 清理旧 release 冗余
console.log('[1/3] 清理旧 release...');
const releaseDir = path.join(ROOT, 'release');
if (fs.existsSync(releaseDir)) {
    for (const f of fs.readdirSync(releaseDir)) {
        const fp = path.join(releaseDir, f);
        const stat = fs.statSync(fp);
        if (stat.isDirectory()) {
            fs.rmSync(fp, { recursive: true, force: true });
            console.log('   删除目录: ' + f);
        } else if (!f.endsWith('.exe') && !f.endsWith('.blockmap')) {
            fs.unlinkSync(fp);
            console.log('   删除: ' + f);
        }
    }
}
console.log('');

// 2. 短路径构建（避免长中文路径复制卡死）
console.log('[2/3] 短路径构建...');
fs.rmSync(TMP_DIR, { recursive: true, force: true });
fs.mkdirSync(TMP_DIR, { recursive: true });

const copyDir = (src, dst, exclude) => {
    if (!fs.existsSync(src)) return;
    fs.mkdirSync(dst, { recursive: true });
    for (const e of fs.readdirSync(src, { withFileTypes: true })) {
        if (exclude && exclude.has(e.name)) continue;
        const sp = path.join(src, e.name);
        const dp = path.join(dst, e.name);
        if (e.isDirectory()) copyDir(sp, dp, exclude);
        else { try { fs.copyFileSync(sp, dp); } catch {} }
    }
};

// 用 robocopy 快速复制（排除 node_modules 和大目录）
const robo = (src, dst, opts) => {
    try {
        execSync(`robocopy "${src}" "${dst}" /E /NFL /NDL /NJH /NJS ${opts || ''}`, { timeout: 300000 });
    } catch (e) {
        if (e.status && e.status >= 8) throw e;
    }
};

console.log('   复制项目文件...');
robo(ROOT, TMP_DIR, '/XD node_modules .git .cache .vscode .claude release AI教辅作图工具-win32-x64');

// 复制 node_modules（用 robocopy 加速）
console.log('   复制 node_modules（robocopy 加速）...');
robo(path.join(ROOT, 'node_modules'), path.join(TMP_DIR, 'node_modules'));

// 确保 electron dist 存在（npm install --ignore-scripts 可能缺少）
const elecExe = path.join(TMP_DIR, 'node_modules', 'electron', 'dist', 'electron.exe');
if (!fs.existsSync(elecExe)) {
    console.log('   补充 Electron dist...');
    robo(path.join(ROOT, 'node_modules', 'electron', 'dist'), path.join(TMP_DIR, 'node_modules', 'electron', 'dist'));
}

console.log('   运行 electron-builder...');
try {
    execSync('npx electron-builder --config electron-builder.json', {
        cwd: TMP_DIR,
        stdio: 'inherit',
        timeout: 600000
    });
} catch (e) {
    console.error('\n构建失败: ' + e.message);
    process.exit(1);
}

// 3. 只复制正式交付物回 release
console.log('\n[3/3] 整理 release...');
const tmpRelease = path.join(TMP_DIR, 'release');
if (fs.existsSync(tmpRelease)) {
    // 清理原 release 中的目录
    if (fs.existsSync(releaseDir)) {
        for (const f of fs.readdirSync(releaseDir)) {
            const fp = path.join(releaseDir, f);
            if (fs.statSync(fp).isDirectory()) {
                fs.rmSync(fp, { recursive: true, force: true });
            }
        }
    }

    // 复制正式交付物（只复制 exe 和 blockmap，跳过目录和调试文件）
    const DELIVERABLE = /\.(exe|blockmap)$/i;
    for (const f of fs.readdirSync(tmpRelease)) {
        const src = path.join(tmpRelease, f);
        const stat = fs.statSync(src);
        if (stat.isDirectory()) continue;
        if (!DELIVERABLE.test(f)) continue; // 跳过 builder-debug.yml 等
        fs.copyFileSync(src, path.join(releaseDir, f));
        console.log('   ' + f + ' (' + (stat.size / 1024 / 1024).toFixed(1) + ' MB)');
    }
}

// 清理临时目录
console.log('\n   清理临时目录...');
fs.rmSync(TMP_DIR, { recursive: true, force: true });
console.log('   C:\\tmp\\ai-tool-desktop 已清理');

// 最终报告
console.log('\n========================================');
console.log('  构建完成！release 内容：');
console.log('========================================');
if (fs.existsSync(releaseDir)) {
    let total = 0;
    for (const f of fs.readdirSync(releaseDir)) {
        const fp = path.join(releaseDir, f);
        const stat = fs.statSync(fp);
        if (stat.isFile()) {
            const mb = (stat.size / 1024 / 1024).toFixed(1);
            console.log('  ' + f + '  (' + mb + ' MB)');
            total += stat.size;
        }
    }
    console.log('  总计: ' + (total / 1024 / 1024).toFixed(1) + ' MB');
}
console.log('');
