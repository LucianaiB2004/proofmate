param(
    [switch]$VerifyOnly,
    [string]$ParticipantName = "参赛者名"
)

$ErrorActionPreference = "Stop"
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$submissionRoot = Join-Path $projectRoot "submission"
$outputRoot = Join-Path $projectRoot "dist-submission"
$stageRoot = Join-Path $outputRoot "stage"
$coverPath = Join-Path $submissionRoot "封面.png"

$requiredFiles = @(
    "体验说明.md",
    "作品介绍.md",
    "AI技术实践说明.md",
    "演示脚本.md",
    "评委问答.md",
    "AI实践佐证\README.md",
    "AI实践佐证\prompts.md",
    "作品展示\README.md",
    "封面.png"
)

$errors = [System.Collections.Generic.List[string]]::new()
foreach ($relativePath in $requiredFiles) {
    $fullPath = Join-Path $submissionRoot $relativePath
    if (-not (Test-Path -LiteralPath $fullPath -PathType Leaf)) {
        $errors.Add("缺少文件: submission\$relativePath")
    }
}

if (Test-Path -LiteralPath $coverPath -PathType Leaf) {
    Add-Type -AssemblyName System.Drawing
    $image = [System.Drawing.Image]::FromFile($coverPath)
    try {
        if ($image.Width -ne 1920 -or $image.Height -ne 1080) {
            $errors.Add("封面尺寸必须为 1920x1080，当前为 $($image.Width)x$($image.Height)")
        }
    } finally {
        $image.Dispose()
    }
}

$evidenceRoot = Join-Path $submissionRoot "AI实践佐证"
if (Test-Path -LiteralPath $evidenceRoot -PathType Container) {
    $evidenceFiles = @(Get-ChildItem -LiteralPath $evidenceRoot -File -Recurse)
    if ($evidenceFiles.Count -lt 2) {
        $errors.Add("AI实践佐证至少需要两项独立材料")
    }
}

if ($errors.Count -gt 0) {
    $errors | ForEach-Object { Write-Error $_ -ErrorAction Continue }
    exit 1
}

if ($VerifyOnly) {
    Write-Output "SUBMISSION_VERIFY_OK"
    exit 0
}

if (-not $stageRoot.StartsWith($outputRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "拒绝清理工作区之外的目录: $stageRoot"
}
if (Test-Path -LiteralPath $stageRoot) {
    Remove-Item -LiteralPath $stageRoot -Recurse -Force
}
New-Item -ItemType Directory -Path $stageRoot -Force | Out-Null

Copy-Item -LiteralPath (Join-Path $submissionRoot "作品展示") -Destination $stageRoot -Recurse
Copy-Item -LiteralPath (Join-Path $submissionRoot "AI实践佐证") -Destination $stageRoot -Recurse
Copy-Item -LiteralPath $coverPath -Destination $stageRoot
@("体验说明.md", "作品介绍.md", "AI技术实践说明.md", "演示脚本.md", "评委问答.md") | ForEach-Object {
    Copy-Item -LiteralPath (Join-Path $submissionRoot $_) -Destination $stageRoot
}

$sourceTarget = Join-Path $stageRoot "作品展示\应用源码"
New-Item -ItemType Directory -Path $sourceTarget -Force | Out-Null
@("src", "server", "local-ai", "scripts") | ForEach-Object {
    Copy-Item -LiteralPath (Join-Path $projectRoot $_) -Destination $sourceTarget -Recurse
}
@("package.json", "package-lock.json", "vite.config.ts", "tsconfig.json", "index.html", ".env.example", "README.md") | ForEach-Object {
    Copy-Item -LiteralPath (Join-Path $projectRoot $_) -Destination $sourceTarget
}

$zipPath = Join-Path $outputRoot "真源_$ParticipantName.zip"
if (Test-Path -LiteralPath $zipPath) { Remove-Item -LiteralPath $zipPath -Force }
Compress-Archive -Path (Join-Path $stageRoot "*") -DestinationPath $zipPath -CompressionLevel Optimal
Remove-Item -LiteralPath $stageRoot -Recurse -Force

$sizeMb = [math]::Round((Get-Item -LiteralPath $zipPath).Length / 1MB, 2)
Write-Output "SUBMISSION_PACKAGE_OK: $zipPath ($sizeMb MB)"
