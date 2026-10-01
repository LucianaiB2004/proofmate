param([switch]$VerifyOnly)

$ErrorActionPreference = "Stop"
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$out = Join-Path $root "dist-submission"
$stageBase = Join-Path $out "dual-stage"
$tmallStage = Join-Path $stageBase "tmall"
$textinStage = Join-Path $stageBase "textin"
$tmallZip = Join-Path $out "真源ProofMate-天猫AI作品包.zip"
$textinZip = Join-Path $out "真源ProofMate-TextIn-xParse实用价值赛道作品包.zip"
$hashFile = Join-Path $out "SHA256SUMS.txt"

function Assert-Under([string]$Child, [string]$Parent) {
    $resolvedChild = [IO.Path]::GetFullPath($Child)
    $resolvedParent = [IO.Path]::GetFullPath($Parent).TrimEnd('\') + '\'
    if (-not $resolvedChild.StartsWith($resolvedParent, [StringComparison]::OrdinalIgnoreCase)) {
        throw "拒绝操作目标目录之外的路径: $resolvedChild"
    }
}

function Copy-Required([string]$Source, [string]$Destination) {
    if (-not (Test-Path -LiteralPath $Source)) { throw "缺少打包文件: $Source" }
    $parent = Split-Path -Parent $Destination
    if ($parent) { New-Item -ItemType Directory -Force -Path $parent | Out-Null }
    Copy-Item -LiteralPath $Source -Destination $Destination -Recurse -Force
}

function Copy-ProjectSource([string]$Destination, [switch]$IncludeWorkBuddySkill) {
    New-Item -ItemType Directory -Force -Path $Destination | Out-Null
    $tracked = @(& git -C $root ls-files -- src server tests local-ai/app local-ai/tests)
    if ($LASTEXITCODE -ne 0 -or $tracked.Count -eq 0) { throw '无法读取 Git 跟踪的项目源码清单' }
    foreach ($relative in $tracked) {
        Copy-Required (Join-Path $root $relative) (Join-Path $Destination $relative)
    }
    $distRoot = Join-Path $root 'dist'
    Get-ChildItem -LiteralPath $distRoot -File -Recurse | Where-Object {
        $_.Extension.ToLowerInvariant() -in @('.html', '.js', '.css', '.mjs', '.webp', '.png', '.jpg', '.jpeg')
    } | ForEach-Object {
        $relative = [IO.Path]::GetRelativePath($distRoot, $_.FullName)
        Copy-Required $_.FullName (Join-Path $Destination "dist\$relative")
    }
    $localTarget = Join-Path $Destination 'local-ai'
    @('README.md', 'pyproject.toml') | ForEach-Object {
        Copy-Required (Join-Path $root "local-ai\$_") (Join-Path $localTarget $_)
    }
    $scriptsTarget = Join-Path $Destination 'scripts'
    @('download_openvino_model.py', 'benchmark_openvino.py') | ForEach-Object {
        Copy-Required (Join-Path $root "scripts\$_") (Join-Path $scriptsTarget $_)
    }
    @('README.md', 'package.json', 'package-lock.json', 'vite.config.ts', 'tsconfig.json', 'index.html', 'playwright.config.ts', '.env.example') | ForEach-Object {
        Copy-Required (Join-Path $root $_) (Join-Path $Destination $_)
    }
    if ($IncludeWorkBuddySkill) {
        Copy-Required (Join-Path $root '.codebuddy\skills\xparse-parse') (Join-Path $Destination '.codebuddy\skills\xparse-parse')
        Copy-Required (Join-Path $root 'skills-lock.json') (Join-Path $Destination 'skills-lock.json')
    }
    Get-ChildItem -LiteralPath $Destination -Directory -Recurse | Where-Object {
        $_.Name -in @('__pycache__', '.pytest_cache') -or $_.Name -like '*.egg-info'
    } | Sort-Object FullName -Descending | ForEach-Object {
        Assert-Under $_.FullName $Destination
        Remove-Item -LiteralPath $_.FullName -Recurse -Force
    }
    Get-ChildItem -LiteralPath $Destination -File -Recurse -Filter '*.pyc' | Remove-Item -Force
}

function Test-SecretText([string]$Content) {
    return $Content -match 'sk-[A-Za-z0-9._-]{20,}' -or
        $Content -match '(?i)(x-ti-secret-code|XPARSE_SECRET_CODE)\s*[:=]\s*["'']?[A-Fa-f0-9]{24,}' -or
        $Content -match '(?i)(DASHSCOPE_API_KEY)\s*[:=]\s*["'']?sk-'
}

function Assert-PublicContent([string]$Stage) {
    $forbiddenNames = Get-ChildItem -LiteralPath $Stage -Recurse -Force | Where-Object {
        $_.Name -match '^\.env($|\.(?!example$))' -or $_.Name -eq '.proofmate.local.json' -or
        $_.FullName -match '(\\|/)(node_modules|models?|\.venv|__pycache__|\.pytest_cache|test-results|playwright-report)(\\|/|$)' -or
        $_.Name -match '(评委问答|演示脚本|直接粘贴)'
    }
    if ($forbiddenNames) { throw "发现禁止公开的文件: $($forbiddenNames.FullName -join ', ')" }

    $textExtensions = @('.md', '.txt', '.json', '.ts', '.tsx', '.js', '.mjs', '.ps1', '.py', '.yaml', '.yml', '.toml', '.html', '.css', '.map', '.log', '.xml')
    foreach ($file in Get-ChildItem -LiteralPath $Stage -Recurse -File) {
        if ($textExtensions -notcontains $file.Extension.ToLowerInvariant()) { continue }
        $content = Get-Content -LiteralPath $file.FullName -Raw -Encoding UTF8
        if (Test-SecretText $content) {
            throw "发现疑似明文凭证: $($file.FullName)"
        }
    }
}

function Assert-Zip([string]$Zip, [string[]]$Required) {
    if (-not (Test-Path -LiteralPath $Zip -PathType Leaf)) { throw "ZIP 不存在: $Zip" }
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $archive = [IO.Compression.ZipFile]::OpenRead($Zip)
    try {
        $names = @($archive.Entries | ForEach-Object { $_.FullName.Replace('\', '/') })
        foreach ($entry in $Required) {
            if ($names -notcontains $entry) { throw "$([IO.Path]::GetFileName($Zip)) 缺少: $entry" }
        }
        if ($names | Where-Object { $_ -match '(^|/)(\.env($|\.(?!example$))|\.proofmate\.local\.json$|评委问答|演示脚本|node_modules/|models?/|\.venv/)' }) {
            throw "$([IO.Path]::GetFileName($Zip)) 含禁止条目"
        }
        $textExtensions = @('.md', '.txt', '.json', '.ts', '.tsx', '.js', '.mjs', '.ps1', '.py', '.yaml', '.yml', '.toml', '.html', '.css', '.map', '.log', '.xml')
        foreach ($entry in $archive.Entries) {
            if ($textExtensions -notcontains [IO.Path]::GetExtension($entry.FullName).ToLowerInvariant()) { continue }
            $stream = $entry.Open()
            $reader = [IO.StreamReader]::new($stream, [Text.Encoding]::UTF8, $true)
            try { $content = $reader.ReadToEnd() } finally { $reader.Dispose(); $stream.Dispose() }
            if (Test-SecretText $content) { throw "$([IO.Path]::GetFileName($Zip)) 的条目疑似包含明文凭证: $($entry.FullName)" }
        }
    } finally { $archive.Dispose() }
}

function Assert-HashManifest {
    if (-not (Test-Path -LiteralPath $hashFile -PathType Leaf)) { throw '缺少 SHA256SUMS.txt' }
    $expected = @{}
    foreach ($line in Get-Content -LiteralPath $hashFile -Encoding UTF8) {
        if ($line -notmatch '^([A-F0-9]{64})  (.+\.zip)  ([0-9]+) bytes  ') { throw "SHA256SUMS.txt 格式错误: $line" }
        $expected[$matches[2]] = @{ Hash = $matches[1]; Size = [int64]$matches[3] }
    }
    foreach ($zip in @($tmallZip, $textinZip)) {
        $item = Get-Item -LiteralPath $zip
        $record = $expected[$item.Name]
        if (-not $record) { throw "SHA256SUMS.txt 缺少: $($item.Name)" }
        $actualHash = (Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash
        if ($actualHash -ne $record.Hash -or $item.Length -ne $record.Size) {
            throw "作品包与 SHA256SUMS.txt 不一致: $($item.Name)"
        }
    }
}

$tmallRequired = @(
    '体验说明.md',
    '作品展示/作品介绍.md',
    '作品展示/封面.png',
    '作品展示/应用源码/dist/index.html',
    'AI实践佐证/AI技术实践说明.md',
    'AI实践佐证/真实百炼联调记录.md',
    'AI实践佐证/最终验证记录.md'
)
$textinRequired = @(
    '作品说明书.pdf',
    '作品提交信息.md',
    '最终验证记录.md',
    '开发过程/01-项目需求与技术方案.md',
    '开发过程/02-xParse真实调用记录.md',
    '开发过程/03-开发检查与验证报告.md',
    '开发过程/04-参赛项目说明.md',
    '开发过程/截图/01-真实解析与产物预览.png',
    '开发过程/截图/02-Skill与真实调用记录.png',
    '真实调用证据/03-NASA-O形环风险图表.jpg',
    '真实调用证据/03-NASA-O形环风险图表.md',
    '真实调用证据/03-NASA-O形环风险图表.json',
    '真实调用证据/xparse-run-record.json',
    '项目源码/dist/index.html',
    '项目源码/.codebuddy/skills/xparse-parse/SKILL.md'
)

if ($VerifyOnly) {
    Assert-Zip $tmallZip $tmallRequired
    Assert-Zip $textinZip $textinRequired
    Assert-HashManifest
    Write-Output 'DUAL_SUBMISSION_VERIFY_OK'
    exit 0
}

New-Item -ItemType Directory -Force -Path $out | Out-Null
Assert-Under $stageBase $out
foreach ($path in @($out, $stageBase)) {
    if (Test-Path -LiteralPath $path) {
        $item = Get-Item -LiteralPath $path -Force
        if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw "拒绝使用目录联接作为打包路径: $path" }
    }
}
& npm.cmd run build
if ($LASTEXITCODE -ne 0) { throw '生产构建失败，停止生成作品包' }
if (Test-Path -LiteralPath $stageBase) { Remove-Item -LiteralPath $stageBase -Recurse -Force }
New-Item -ItemType Directory -Force -Path $tmallStage, $textinStage | Out-Null

# 天猫 AI 作品包：延续既有参赛清单，源码使用当前构建结果。
Copy-Required (Join-Path $root 'submission\体验说明.md') (Join-Path $tmallStage '体验说明.md')
Copy-Required (Join-Path $root 'submission\封面.png') (Join-Path $tmallStage '作品展示\封面.png')
Copy-Required (Join-Path $root 'submission\作品介绍.md') (Join-Path $tmallStage '作品展示\作品介绍.md')
@('README.md', '界面截图-首屏.png', '界面截图-案例展示.png', '界面截图-真实材料复核.png', '界面截图-OpenVINO实机.png') | ForEach-Object {
    Copy-Required (Join-Path $root "submission\作品展示\$_") (Join-Path $tmallStage "作品展示\$_")
}
Copy-Required (Join-Path $root 'submission\AI技术实践说明.md') (Join-Path $tmallStage 'AI实践佐证\AI技术实践说明.md')
@('README.md', 'prompts.md', '关键代码路径.md', 'OpenVINO实机测试.md', '真实百炼联调记录.md', '测试记录.md') | ForEach-Object {
    Copy-Required (Join-Path $root "submission\AI实践佐证\$_") (Join-Path $tmallStage "AI实践佐证\$_")
}
Copy-Required (Join-Path $root 'submission-textin\evidence\最终验证记录.md') (Join-Path $tmallStage 'AI实践佐证\最终验证记录.md')
Copy-ProjectSource (Join-Path $tmallStage '作品展示\应用源码')

# TextIn 作品包：突出 xParse 真实调用、WorkBuddy 开发过程和可复现源码。
Copy-Required (Join-Path $root 'submission-textin\参赛材料\真源ProofMate-作品说明书.pdf') (Join-Path $textinStage '作品说明书.pdf')
Copy-Required (Join-Path $root 'submission-textin\作品提交信息.md') (Join-Path $textinStage '作品提交信息.md')
Copy-Required (Join-Path $root 'submission-textin\evidence\最终验证记录.md') (Join-Path $textinStage '最终验证记录.md')
@('01-项目需求与技术方案.md', '02-xParse真实调用记录.md', '03-开发检查与验证报告.md', '04-参赛项目说明.md') | ForEach-Object {
    Copy-Required (Join-Path $root "submission-textin\evidence\workbuddy-development\$_") (Join-Path $textinStage "开发过程\$_")
}
Copy-Required (Join-Path $root 'submission-textin\evidence\workbuddy-screenshots\01-真实解析与产物预览.png') (Join-Path $textinStage '开发过程\截图\01-真实解析与产物预览.png')
Copy-Required (Join-Path $root 'submission-textin\evidence\workbuddy-screenshots\02-Skill与真实调用记录-干净版.png') (Join-Path $textinStage '开发过程\截图\02-Skill与真实调用记录.png')
Copy-Required (Join-Path $root 'submission-textin\evidence\workbuddy-screenshots\截图说明.md') (Join-Path $textinStage '开发过程\截图\截图说明.md')
Copy-Required (Join-Path $root 'ProofMate-真实案例-挑战者号\03-NASA-O形环风险图表.jpg') (Join-Path $textinStage '真实调用证据\03-NASA-O形环风险图表.jpg')
$xparseRoot = Join-Path $root 'submission-textin\evidence\workbuddy-development\xparse-output'
@('03-NASA-O形环风险图表.md', '03-NASA-O形环风险图表.json', 'xparse-run-record.json', '运行记录.md') | ForEach-Object {
    Copy-Required (Join-Path $xparseRoot $_) (Join-Path $textinStage "真实调用证据\$_")
}
Copy-Required (Join-Path $root 'submission-textin\参赛材料\界面截图') (Join-Path $textinStage '产品截图')
Copy-ProjectSource (Join-Path $textinStage '项目源码') -IncludeWorkBuddySkill

Assert-PublicContent $tmallStage
Assert-PublicContent $textinStage
foreach ($zip in @($tmallZip, $textinZip)) { if (Test-Path -LiteralPath $zip) { Remove-Item -LiteralPath $zip -Force } }
Compress-Archive -Path (Join-Path $tmallStage '*') -DestinationPath $tmallZip -CompressionLevel Optimal
Compress-Archive -Path (Join-Path $textinStage '*') -DestinationPath $textinZip -CompressionLevel Optimal
Assert-Zip $tmallZip $tmallRequired
Assert-Zip $textinZip $textinRequired

$hashLines = foreach ($zip in @($tmallZip, $textinZip)) {
    $item = Get-Item -LiteralPath $zip
    $hash = (Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash
    "$hash  $($item.Name)  $($item.Length) bytes  $($item.LastWriteTime.ToString('yyyy-MM-dd HH:mm:ss zzz'))"
}
Set-Content -LiteralPath $hashFile -Encoding UTF8 -Value $hashLines
Assert-HashManifest
Remove-Item -LiteralPath $stageBase -Recurse -Force
Write-Output 'DUAL_SUBMISSION_PACKAGE_OK'
$hashLines | Write-Output
