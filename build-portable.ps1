# AI教辅作图工具 - 一键打包脚本
# 用法: 右键 → 使用 PowerShell 运行

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AI教辅作图工具 - 一键打包" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$ProjectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BuildDir = "C:\tmp\ai-build"
$ReleaseDir = Join-Path $ProjectDir "release"

# 1. 清理
Write-Host "[1/5] 清理..." -ForegroundColor Yellow
Remove-Item -Recurse -Force $BuildDir -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force $ReleaseDir -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $BuildDir -Force | Out-Null
New-Item -ItemType Directory -Path $ReleaseDir -Force | Out-Null

# 2. 复制项目
Write-Host "[2/5] 复制项目到短路径..." -ForegroundColor Yellow
$exclude = @("node_modules", ".git", "release", ".cache", ".vscode", ".claude")
Get-ChildItem -Path $ProjectDir | Where-Object {
    $exclude -notcontains $_.Name
} | ForEach-Object {
    if ($_.PSIsContainer) {
        Copy-Item -Recurse $_.FullName (Join-Path $BuildDir $_.Name) -Force
    } else {
        Copy-Item $_.FullName (Join-Path $BuildDir $_.Name) -Force
    }
}

# 3. 安装依赖
Write-Host "[3/5] 安装依赖（首次需几分钟）..." -ForegroundColor Yellow
Set-Location $BuildDir
$env:ELECTRON_MIRROR = "https://cdn.npmmirror.com/binaries/electron/"
npm install 2>&1 | Out-Null
if (-not (Test-Path "node_modules\electron\dist\electron.exe")) {
    Write-Host "  [!] electron 下载失败，尝试从 GitHub 下载..." -ForegroundColor Red
    $zipUrl = "https://github.com/electron/electron/releases/download/v31.7.7/electron-v31.7.7-win32-x64.zip"
    $zipPath = "$env:TEMP\electron.zip"
    Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath -UseBasicParsing
    Expand-Archive -Path $zipPath -DestinationPath "node_modules\electron\dist" -Force
    Set-Content -Path "node_modules\electron\path.txt" -Value "electron.exe" -NoNewline
    Set-Content -Path "node_modules\electron\dist\version" -Value "31.7.7" -NoNewline
}
Write-Host "  electron 就绪" -ForegroundColor Green

# 4. 构建前端
Write-Host "[4/5] 构建前端..." -ForegroundColor Yellow
npm run build:renderer 2>&1 | Out-Null
Write-Host "  前端构建完成" -ForegroundColor Green

# 5. 打包
Write-Host "[5/5] 打包便携版..." -ForegroundColor Yellow
npx electron-builder --config electron-builder.json --win portable 2>&1 | Tee-Object -Variable buildOutput

# 复制结果
$portableExe = Get-ChildItem -Path "$BuildDir\release" -Filter "*portable*.exe" -ErrorAction SilentlyContinue
if ($portableExe) {
    Copy-Item $portableExe.FullName (Join-Path $ReleaseDir $portableExe.Name)
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  打包成功!" -ForegroundColor Green
    Write-Host "  位置: $ReleaseDir\$($portableExe.Name)" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    explorer $ReleaseDir
} else {
    Write-Host "  [!] 打包可能失败，请检查上方日志" -ForegroundColor Red
}

# 清理
Set-Location $ProjectDir
Remove-Item -Recurse -Force $BuildDir -ErrorAction SilentlyContinue
Write-Host ""
Write-Host "临时文件已清理" -ForegroundColor Gray
Read-Host "按回车退出"
