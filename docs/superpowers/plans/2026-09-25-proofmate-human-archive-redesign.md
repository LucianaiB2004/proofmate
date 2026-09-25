# 真源 ProofMate Human Archive Visual Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Follow superpowers:test-driven-development for each behavior change and superpowers:verification-before-completion before claiming completion.

**Goal:** 把 ProofMate 从通用深色 AI 仪表盘重构成“数字档案室 × 像素仪器”学生研究作品，同时完整保留文件导入、证据审计、补证、导出、百炼 Qwen 和 OpenVINO 实时链路。

**Architecture:** 保留现有 React 单页状态流与领域模型，只重构视图语义和样式。由 `App`、`ScanSequence`、`AuditDashboard` 三个页面状态共享档案视觉令牌；审核分区继续使用现有组件边界，`ScoreRing` 内部改为审核章与证据量尺，运行时保持现有 API 合同并以端云双仪器呈现。三张无文字生成资产仅作渐进增强，所有核心信息和控件均由 HTML/CSS 提供。

**Tech Stack:** React、TypeScript、Vite、Vitest、Testing Library、Playwright、CSS、现有 PDF.js/Node/Python/OpenVINO 服务。

**Spec:** `docs/superpowers/specs/2026-09-25-proofmate-human-archive-redesign.md`

## 全局约束

- 不改变 `ProjectAudit`、评分算法、导入/导出格式和 `/api/qwen/*`、`/api/local/*` 接口合同。
- 不把 API Key、模型文件、虚拟环境、缓存或运行结果写入源码和提交包。
- 中文文本必须使用真实 DOM 文本；生成图片不得包含文字，也不得成为可访问名称的唯一来源。
- 所有纸张纹理和插画必须有纯色/CSS 回退；资源缺失时功能、文字层级和按钮仍完整。
- 在 1440×900 与 390×844 验证无整页横向滚动；长文件名、长模型输出和窄屏操作必须纳入测试。
- 所有扫描、盖章和状态动效必须在 `prefers-reduced-motion: reduce` 下停用。
- 每完成一个任务先运行目标测试，再在最终任务运行全量验证；不得通过放宽断言或隐藏错误让检查通过。

### Task 1: 建立档案视觉语义与首屏骨架

**Files:**
- Modify: `src/App.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/features/onboarding/Onboarding.test.tsx`
- Modify: `src/features/onboarding/FileDropzone.tsx`
- Modify: `src/styles/tokens.css`
- Modify: `src/styles/global.css`

**Step 1: 写失败的首屏语义测试**

在 `src/App.test.tsx` 增加断言，要求首屏可通过可访问文本查询到：

```tsx
expect(screen.getByText(/档案编号/)).toBeInTheDocument();
expect(screen.getByText('学生作品')).toBeInTheDocument();
expect(screen.getByRole('button', { name: '体验示例项目' })).toBeEnabled();
```

在 `src/features/onboarding/Onboarding.test.tsx` 增加长文件名用例：传入超过 80 个字符的文件名，断言完整文件名仍在 DOM，且文件列表拥有 `data-testid="accepted-materials"`，供 E2E 检查溢出。

**Step 2: 运行目标测试确认 RED**

Run: `npm test -- src/App.test.tsx src/features/onboarding/Onboarding.test.tsx`

Expected: FAIL，缺少“档案编号”“学生作品”和新的材料列表测试标识。

**Step 3: 实现首屏档案袋结构**

重写 `App.tsx` 的 landing markup：

- `main.landing-shell` 内使用 `.archive-cover` 双栏布局；
- 左栏增加 `TM-AI-2026 / PM-001` 档案编号、当前参赛年份/作品日期、“学生作品”标签、标题、价值主张；
- 右栏将 `FileDropzone` 放入有可见标题“材料投递口”的区域；
- 保留示例按钮与真实文件选择事件，不改状态机；
- 产品描述强调“AI 发现关系，人审阅并盖章确认”，避免虚构获奖或性能数据。

在 `FileDropzone.tsx` 保留 input、拖拽和错误反馈逻辑，只调整 DOM 分组并给已接收文件容器添加 `data-testid="accepted-materials"`。文件名使用可换行元素，不截断可访问文本。

**Step 4: 建立共享视觉令牌与响应式基础**

在 `tokens.css` 定义并统一使用：

```css
--paper: #eee9de;
--paper-raised: #f8f4ea;
--ink: #171717;
--audit-red: #d63b32;
--instrument-green: #147d68;
--pencil: #74716a;
--line: rgba(23, 23, 23, 0.72);
--radius-control: 4px;
```

在 `global.css` 完成：暖纸背景、硬边框、纸页错位阴影、装订孔/回形针 CSS 装饰、档案标签、盖章式主按钮、投递口裁切虚线。所有装饰伪元素 `pointer-events: none`；`overflow-wrap: anywhere` 用于文件名和运行时文本；全局 `box-sizing: border-box`；390px 断点改为单栏且按钮宽度不溢出。

**Step 5: 运行测试并检查差异**

Run: `npm test -- src/App.test.tsx src/features/onboarding/Onboarding.test.tsx`

Expected: PASS。

Run: `git diff --check`

Expected: 无空白错误。

**Step 6: 提交**

```bash
git add src/App.tsx src/App.test.tsx src/features/onboarding/FileDropzone.tsx src/features/onboarding/Onboarding.test.tsx src/styles/tokens.css src/styles/global.css
git commit -m "feat: turn the landing page into a student archive"
```

### Task 2: 将扫描流程改造成三段像素仪器

**Files:**
- Modify: `src/features/onboarding/Onboarding.test.tsx`
- Modify: `src/features/onboarding/ScanSequence.tsx`
- Modify: `src/styles/global.css`

**Step 1: 写失败的扫描语义测试**

对示例项目和真实材料各渲染一次 `ScanSequence`，断言三个阶段标题均可查询：

```tsx
expect(screen.getByText('材料清点仪')).toBeInTheDocument();
expect(screen.getByText('隐私检查仪')).toBeInTheDocument();
expect(screen.getByText('模型核验仪')).toBeInTheDocument();
```

并保留既有“示例回放/真实材料”差异断言与最终 `onComplete` 行为。

**Step 2: 运行目标测试确认 RED**

Run: `npm test -- src/features/onboarding/Onboarding.test.tsx`

Expected: FAIL，尚无三个仪器标题。

**Step 3: 实现仪器读数 DOM 与状态**

在 `ScanSequence.tsx`：

- 保留定时推进、导入构建和错误处理逻辑；
- 用有序列表呈现三台仪器，每台包含编号、名称、状态灯、短说明与单行进度轨；
- 当前、完成、等待状态通过文字和 `aria-current="step"`/可访问状态共同表达，不只靠颜色；
- 示例使用“示例项目回放中”，真实导入使用“正在核验真实材料”，不得混淆来源。

**Step 4: 添加像素仪器样式与减少动效规则**

在 `global.css` 增加局部深色仪器屏、像素阶梯边、绿色/红色状态灯与扫描线。仅当前步骤启用扫描动效；加入：

```css
@media (prefers-reduced-motion: reduce) {
  .scanner-line,
  .audit-stamp.is-new { animation: none; }
}
```

窄屏上仪器条纵向堆叠，状态文本允许换行。

**Step 5: 运行目标测试并提交**

Run: `npm test -- src/features/onboarding/Onboarding.test.tsx`

Expected: PASS。

```bash
git add src/features/onboarding/Onboarding.test.tsx src/features/onboarding/ScanSequence.tsx src/styles/global.css
git commit -m "feat: render scanning as three pixel instruments"
```

### Task 3: 把驾驶舱重构为研究档案桌

**Files:**
- Modify: `src/features/audit/AuditDashboard.test.tsx`
- Modify: `src/features/audit/AuditDashboard.tsx`
- Modify: `src/features/audit/ScoreRing.tsx`
- Modify: `src/features/audit/ClaimList.tsx`
- Modify: `src/features/audit/EvidenceGraph.tsx`
- Modify: `src/features/audit/RiskInspector.tsx`
- Modify: `src/features/audit/ProcessingTrace.tsx`
- Modify: `src/styles/global.css`

**Step 1: 写失败的档案桌语义测试**

在 `AuditDashboard.test.tsx` 增加：

```tsx
expect(screen.getByText(/项目卷宗/)).toBeInTheDocument();
expect(screen.getByText(/档案编号/)).toBeInTheDocument();
expect(screen.getByRole('img', { name: /证据审核章/ })).toBeInTheDocument();
```

保留现有风险选择、补证、分数更新和导出测试。补证后额外断言 `role="status"` 的“证据闭环”印章出现，确保成功反馈不仅由动画表达。

**Step 2: 运行目标测试确认 RED**

Run: `npm test -- src/features/audit/AuditDashboard.test.tsx`

Expected: FAIL，缺少卷宗元数据与审核章语义。

**Step 3: 重构卷宗抬头和审核章**

在 `AuditDashboard.tsx`：

- 以 `.dossier-header` 展示项目卷宗、由 `audit.id` 派生的稳定档案编号、模式和导出操作；
- 保持风险汇总与所有交互回调不变；
- 补证完成时展示一次 `.audit-stamp.is-new`，DOM 使用 `role="status"`；
- 不把演示状态写成真实模型推理。

在 `ScoreRing.tsx` 保持组件接口和分数/维度数据不变，将圆环 DOM 改成：

- `role="img" aria-label="证据审核章，健康度 …"` 的印章；
- 四条证据量尺，显示维度名、数值和原生 `<meter>` 或等价可访问进度；
- 分数变化仍实时反映补证结果。

**Step 4: 重构四个审计工作区而不改业务行为**

- `ClaimList.tsx`：主张变成有编号、状态批注和选中针脚的索引卡；按钮保持原可访问名称和键盘行为。
- `EvidenceGraph.tsx`：保留 SVG/连接关系与文本替代，把节点改为便签、编号标签和墨线；小屏允许内部图谱区水平滚动，但禁止整页横向滚动。
- `RiskInspector.tsx`：以审稿边栏呈现原始片段、红笔圈注和修复建议；修复按钮逻辑、disabled 状态不变。
- `ProcessingTrace.tsx`：改成归档时间线/处理签条，保留所有真实处理步骤文案。

**Step 5: 完成桌面与移动版布局**

在 `global.css` 用 CSS Grid 构建 1440px 档案桌；390px 改为自然文档流。为长主张、来源 URL、证据摘录应用 `min-width: 0` 和 `overflow-wrap: anywhere`。交互焦点使用清晰红/黑双线，不依赖阴影。

**Step 6: 运行目标测试并提交**

Run: `npm test -- src/features/audit/AuditDashboard.test.tsx`

Expected: PASS，既有交互测试无回归。

```bash
git add src/features/audit/AuditDashboard.test.tsx src/features/audit/AuditDashboard.tsx src/features/audit/ScoreRing.tsx src/features/audit/ClaimList.tsx src/features/audit/EvidenceGraph.tsx src/features/audit/RiskInspector.tsx src/features/audit/ProcessingTrace.tsx src/styles/global.css
git commit -m "feat: reshape the dashboard as a research archive"
```

### Task 4: 将端云运行时改为双仪器并保护长输出

**Files:**
- Modify: `src/features/settings/RuntimePanel.test.tsx`
- Modify: `src/features/settings/RuntimePanel.tsx`
- Modify: `src/styles/global.css`

**Step 1: 写失败的双仪器与长输出测试**

在 `RuntimePanel.test.tsx` 增加可访问标题断言：

```tsx
expect(screen.getByRole('heading', { name: '本地分析仪' })).toBeInTheDocument();
expect(screen.getByRole('heading', { name: '云端复核仪' })).toBeInTheDocument();
```

模拟本地 API 返回超过 500 字符且无空格的摘要，断言完整文本仍出现在 `data-testid="human-review-slip"`，标题为“待人工确认”。保留网络失败、未配置 Key、按钮 busy 状态等原测试。

**Step 2: 运行目标测试确认 RED**

Run: `npm test -- src/features/settings/RuntimePanel.test.tsx`

Expected: FAIL，缺少双仪器标题与纸条标识。

**Step 3: 重构运行时呈现**

在 `RuntimePanel.tsx`：

- 将端侧卡命名为“本地分析仪”，云端卡命名为“云端复核仪”；
- 显示模型名、真实连接状态、模式和原有操作按钮；
- 状态灯同时配文字，失败原因继续显示具体服务状态；
- 所有实时结果进入 `data-testid="human-review-slip"` 的“待人工确认”纸条，不自动写回 `ProjectAudit`；
- 保持 fetch 路径、请求体、返回判断和异常处理不变。

**Step 4: 增加仪器屏和长文本防溢出样式**

在 `global.css` 为双仪器创建局部深色读数区、清晰操作区和纸条结果区；对 `strong`、`p`、`li` 设置 `min-width: 0; overflow-wrap: anywhere; white-space: normal`。390px 使用单列，按钮保持至少 44px 触控高度。

**Step 5: 运行目标测试并提交**

Run: `npm test -- src/features/settings/RuntimePanel.test.tsx`

Expected: PASS。

```bash
git add src/features/settings/RuntimePanel.test.tsx src/features/settings/RuntimePanel.tsx src/styles/global.css
git commit -m "feat: present local and cloud AI as review instruments"
```

### Task 5: 生成并接入三张克制的无文字资产

**Files:**
- Create: `src/assets/archive/paper-fiber.webp`
- Create: `src/assets/archive/evidence-seal.webp`
- Create: `src/assets/archive/pixel-scanner.webp`
- Modify: `src/App.tsx`
- Modify: `src/features/audit/ScoreRing.tsx`
- Modify: `src/features/onboarding/ScanSequence.tsx`
- Modify: `src/styles/global.css`

**Step 1: 记录资源验收基线**

在生成前确认三个目标文件均不存在；若已有文件，先用图像查看工具检查是否为本任务已批准资产，不能盲目覆盖用户内容。资产要求：无文字、无 logo、无人物、无透明棋盘伪背景；最长边不超过 1600px，单文件目标不超过 500KB。

**Step 2: 用 imagegen 分别生成三张资产**

- `paper-fiber.webp`：无缝可平铺、极低对比、暖灰纸纤维、自然轻微污点、正交平光。
- `evidence-seal.webp`：透明背景、不含字形的红色圆形印泥环和局部缺墨，中央留空供 CSS 文字叠加。
- `pixel-scanner.webp`：透明背景、限制色板的小型桌面像素扫描仪，正侧 3/4 视角，不含屏幕文字。

生成后使用图像查看工具逐张检查；若输出带文字或风格失控，仅重生成不合格资产。

**Step 3: 压缩和转换**

使用工作区现有图像工具或系统可用的 ImageMagick/Sharp 将交付物转为 WebP；先探测工具，不新增运行时依赖。记录像素尺寸与文件大小。不得把原始大图或临时中间文件加入 Git。

**Step 4: 渐进增强接入**

- 纸纤维作为 `body`/`.landing-shell` 的低透明度背景层，并保留 `background-color: var(--paper)`；
- 印章纹理作为 `ScoreRing` 审核章的装饰层，真实分数和文字仍在 DOM；
- 扫描仪作为首屏或扫描页角落的 `alt=""` 装饰图，布局不依赖其尺寸；
- 图片请求失败时不隐藏文字、不改变可点击区域、不产生空白主视觉。

**Step 5: 运行构建和目标测试**

Run: `npm test -- src/App.test.tsx src/features/onboarding/Onboarding.test.tsx src/features/audit/AuditDashboard.test.tsx`

Expected: PASS。

Run: `npm run build`

Expected: PASS，Vite 正确打包三张 WebP。

**Step 6: 提交**

```bash
git add src/assets/archive src/App.tsx src/features/audit/ScoreRing.tsx src/features/onboarding/ScanSequence.tsx src/styles/global.css
git commit -m "feat: add restrained archive artwork"
```

### Task 6: 增加端到端视觉语义与响应式回归保护

**Files:**
- Modify: `tests/e2e/demo.spec.ts`
- Modify: `scripts/capture_submission.mjs`

**Step 1: 写失败的 E2E 断言**

在 `tests/e2e/demo.spec.ts` 的现有流程中加入：

- 首屏可见“学生作品”和档案编号；
- 扫描页可见三台仪器名称；
- 驾驶舱可见证据审核章、本地分析仪、云端复核仪；
- 补证后可见“证据闭环”；
- 1440×900 与 390×844 下断言 `document.documentElement.scrollWidth <= document.documentElement.clientWidth`；
- 390px 用例导入超长文件名并验证示例/导入主按钮仍在 viewport 且可点击；
- emulated `reducedMotion: 'reduce'` 下读取扫描线和新印章的 computed `animationName`，断言为 `none`。

**Step 2: 运行 E2E 确认 RED**

Run: `npm run test:e2e`

Expected: 新增断言至少一项失败，证明回归保护有效。

**Step 3: 修正样式和测试等待方式**

只修复真实布局/语义问题；使用可访问定位器和稳定状态等待，不使用任意长 `waitForTimeout` 掩盖竞态。若图谱自身需要横向滚动，断言滚动仅发生在其容器。

**Step 4: 更新截图脚本**

在 `scripts/capture_submission.mjs` 继续复用现有真实流程，捕获：首屏、证据档案桌、补证完成、OpenVINO 实机状态。固定 viewport、等待字体/资源和状态稳定；不把模拟 OpenVINO 截图标成实机结果。

**Step 5: 运行 E2E 并提交**

Run: `npm run test:e2e`

Expected: 全部 PASS，两个 viewport 无整页横向溢出，reduced-motion 生效。

```bash
git add tests/e2e/demo.spec.ts scripts/capture_submission.mjs
git commit -m "test: cover archive visuals and responsive states"
```

### Task 7: 更新比赛封面、展示截图与说明文字

**Files:**
- Modify: `submission/cover-source.html`
- Modify: `submission/封面.png`
- Modify: `submission/作品展示/界面截图-首屏.png`
- Modify: `submission/作品展示/界面截图-证据驾驶舱.png`
- Modify: `submission/作品展示/界面截图-补证完成.png`
- Modify: `submission/作品展示/界面截图-OpenVINO实机.png`
- Modify: `submission/作品展示/README.md`
- Modify: `submission/作品介绍.md`

**Step 1: 同步封面视觉语言**

重写 `cover-source.html` 为暖纸档案封面，使用真实 HTML 中文标题、档案编号、学生作品标签、红色审核章与局部像素仪器；不使用生成文字图。保留产品名“真源 ProofMate”和比赛技术表述“基于天猫 AI、Qwen 与 OpenVINO 的可信证据审计系统”。

**Step 2: 渲染封面和四张截图**

Run: `node scripts/render_cover.mjs`

Expected: `submission/封面.png` 更新成功。

Run: `node scripts/capture_submission.mjs`

Expected: 四张截图均更新，OpenVINO 实机图仅在本地服务真实 ready/分析成功时生成；否则保留上一次已验证实机图并在记录中注明未刷新，绝不伪造。

**Step 3: 人工检查全尺寸和缩略图**

逐张用图像查看工具检查：

- 全尺寸中文无裁切、无错别字、无系统报错；
- 缩略图仍能辨认产品名、审核章和档案结构；
- 首屏、档案桌、补证态、OpenVINO 态为同一视觉系统；
- 图片没有明显生成文字、随机符号或“模板化 AI 发光”残留。

发现问题时回到源 HTML/CSS 修复并重新渲染，不在成品 PNG 上涂改文字。

**Step 4: 更新比赛说明**

在 `作品介绍.md` 与截图 README 说明“AI 发现关系，人审阅并盖章确认”的交互隐喻、三张生成素材仅作为装饰，以及端云结果“待人工确认”的边界。不得增加未验证的奖项、用户量或性能结论。

**Step 5: 提交**

```bash
git add submission/cover-source.html submission/封面.png submission/作品展示 submission/作品介绍.md
git commit -m "docs: refresh competition visuals for the archive identity"
```

### Task 8: 全量验证、独立审查与安全打包

**Files:**
- Modify if needed: `submission/AI实践佐证/测试记录.md`
- Regenerate: `dist-submission/真源_作品包.zip`

**Step 1: 运行完整前端测试与构建**

Run: `npm test`

Expected: 现有 27 项与新增测试全部 PASS；记录最终真实数量，不沿用旧数字。

Run: `npm run build`

Expected: PASS。

Run: `npm run test:e2e`

Expected: 全部 PASS；记录最终真实数量。

**Step 2: 运行 Python/OpenVINO 回归测试**

先从项目文档/现有脚本确认虚拟环境和命令，再运行现有 Python 测试套件；预期原有 9 项与新增项（若有）全部 PASS。若本机 OpenVINO 服务可用，执行一次真实 status 与 analyze smoke test，记录模型名、状态和耗时；不可用时明确标为未复验，不用 mock 冒充。

**Step 3: 执行最终独立审查**

请求独立 reviewer 检查：规范覆盖、交互回归、移动端溢出、资源降级、reduced-motion、演示/真实状态边界、秘密泄露与包内容。主实现者逐项验证有效意见，修复后重跑受影响测试。

**Step 4: 更新测试记录**

只把本轮实际执行的命令、通过数量、日期与仍未验证项写入 `submission/AI实践佐证/测试记录.md`。禁止复制过期数字或把视觉人工检查描述为自动化测试。

**Step 5: 生成并验证提交包**

Run: `powershell -ExecutionPolicy Bypass -File scripts/package_submission.ps1`

Expected: 生成 `dist-submission/真源_作品包.zip`。

使用现有包验证器（或项目记录的等价检查）确认 ZIP：

- 包含构建产物、作品文档、封面和四张展示图；
- 不包含 `.env*`、任何 `sk-` 密钥、本地模型、`.venv`、`node_modules`、缓存、测试报告或临时文件；
- 可从解压后的 README 路径复现启动流程。

最后计算 SHA-256，并记录为本轮新产物的校验值。

**Step 6: 最终差异与仓库状态检查**

Run: `git diff --check`

Expected: 无错误。

Run: `git status --short`

Expected: 仅出现明确决定不提交的构建包/忽略文件，或工作区干净；任何未知修改先调查，禁止覆盖。

**Step 7: 最终提交**

```bash
git add submission/AI实践佐证/测试记录.md
git commit -m "chore: verify the human archive competition build"
```

若文件内容无变化，则不创建空提交。

## 完成定义

- 三个页面状态与六个关键演示状态具有统一的“数字档案室 × 像素仪器”语言。
- 产品第一眼能读出学生研究作品、可信审计和人机责任边界，而不是通用 AI Dashboard。
- 所有原有功能仍可运行，新增语义、响应式、长文本与 reduced-motion 保护通过。
- 三张生成资产无文字、克制、可缺失降级；中文信息全部是可访问 DOM。
- 比赛封面、四张截图、说明、测试证据与最终 ZIP 同步，包内无秘密和大模型。
