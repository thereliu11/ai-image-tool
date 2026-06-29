const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { cleanupPaths, removePath } = require('./buildCleanup.cjs');

const ROOT = path.join(__dirname, '..');
const RELEASE_DIR = path.join(ROOT, 'release');
const TEMP_DIR_NAME = `.build-tmp\\ai-tool-release-${process.pid}-${Date.now()}`;
let mappedDrive = null;
let buildRoot = ROOT;
let tempOutput = path.join(ROOT, TEMP_DIR_NAME);

function ensureEmptyDir(targetPath) {
  removePath(targetPath);
  fs.mkdirSync(targetPath, { recursive: true });
}

function copyDeliverables() {
  fs.mkdirSync(RELEASE_DIR, { recursive: true });
  const deliverablePattern = /\.(exe|blockmap)$/i;
  const copied = [];

  for (const name of fs.readdirSync(tempOutput)) {
    const sourcePath = path.join(tempOutput, name);
    const stat = fs.statSync(sourcePath);
    if (!stat.isFile() || !deliverablePattern.test(name)) continue;

    const targetPath = path.join(RELEASE_DIR, name);
    fs.copyFileSync(sourcePath, targetPath);
    copied.push({ name, size: stat.size });
  }

  return copied;
}

function findFreeDriveLetter() {
  for (const letter of 'ZYXWVUTSRQPONMLKJIHGFED'.split('')) {
    if (!fs.existsSync(`${letter}:\\`)) return letter;
  }
  throw new Error('No free drive letter is available for temporary build mapping');
}

function mapProjectToDrive() {
  mappedDrive = findFreeDriveLetter();
  execSync(`subst ${mappedDrive}: "${ROOT}"`, { stdio: 'ignore' });
  buildRoot = `${mappedDrive}:\\`;
  tempOutput = path.join(buildRoot, TEMP_DIR_NAME);
  return buildRoot;
}

function unmapProjectDrive() {
  if (!mappedDrive) return;
  try {
    execSync(`subst ${mappedDrive}: /D`, { stdio: 'ignore' });
  } catch {}
  mappedDrive = null;
}

console.log('========================================');
console.log('  AI Teaching Image Tool - production build');
console.log('========================================\n');

try {
  console.log('[1/4] Preparing clean output directories...');
  ensureEmptyDir(RELEASE_DIR);
  const mappedRoot = mapProjectToDrive();
  ensureEmptyDir(tempOutput);
  console.log(`   release: ${RELEASE_DIR}`);
  console.log(`   mapped:  ${mappedRoot}`);
  console.log(`   temp:    ${tempOutput}\n`);

  console.log('[2/4] Verifying local Electron runtime...');
  const electronVersion = require('../node_modules/electron/package.json').version;
  if (electronVersion !== '31.7.7') {
    throw new Error(`Expected Electron 31.7.7, got ${electronVersion}`);
  }
  const electronDist = path.join(ROOT, 'node_modules', 'electron', 'dist');
  if (!fs.existsSync(path.join(electronDist, 'electron.exe'))) {
    throw new Error(`Electron runtime not found: ${electronDist}`);
  }
  console.log(`   Electron ${electronVersion}`);
  console.log(`   electronDist: ${path.join(buildRoot, 'node_modules', 'electron', 'dist')}\n`);

  console.log('[3/4] Running electron-builder...');
  execSync(`npx electron-builder --config electron-builder.json --x64 --config.directories.output="${tempOutput}"`, {
    cwd: buildRoot,
    stdio: 'inherit',
    timeout: 900000
  });

  console.log('\n[4/4] Copying deliverables to release...');
  const copied = copyDeliverables();
  if (copied.length === 0) {
    throw new Error('electron-builder did not produce any .exe or .blockmap files');
  }

  let total = 0;
  for (const item of copied) {
    total += item.size;
    console.log(`   ${item.name} (${(item.size / 1024 / 1024).toFixed(1)} MB)`);
  }
  console.log(`   Total: ${(total / 1024 / 1024).toFixed(1)} MB`);
} finally {
  console.log('\nCleaning temporary output...');
  const localTempOutput = path.join(ROOT, TEMP_DIR_NAME);
  cleanupPaths([tempOutput], { logger: console });
  unmapProjectDrive();
  cleanupPaths([localTempOutput], { logger: console });
}

console.log('\nBuild completed.');
