# 真源 ProofMate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建并验证一套可直接打包参赛的端云协同可信证据 Web Demo、OpenVINO 本地服务和完整初赛材料。

**Architecture:** React/Vite 在浏览器端承载可独立运行的演示、文件导入、证据图谱和导出；领域逻辑以纯 TypeScript 函数隔离。FastAPI 封装可选的 Qwen3-4B INT4 OpenVINO 本地推理；Vite 开发代理封装可选的百炼 Qwen 调用，任何外部能力缺失时均显式降级。

**Tech Stack:** React 19、TypeScript、Vite、Vitest、Testing Library、FastAPI、Pydantic、OpenVINO GenAI、Playwright 浏览器验证、纯 CSS/SVG。

**Spec:** `docs/superpowers/specs/2026-09-24-proofmate-design.md`

## Global Constraints

- 参赛名称固定为“真源：端云协同可信证据系统”。
- 首屏固定展示“天猫 AI 黑客松作品 · Qwen × OpenVINO”。
- 无 API Key、无本地模型时必须可完整体验样例，且 UI 明示“演示模式”。
- `DASHSCOPE_API_KEY` 只能从服务端环境变量读取，不能进入浏览器包或仓库。
- 原始文件默认仅在浏览器处理；用户未启用云端分析时不得上传。
- 1440×900 与 390×844 均需完成实际浏览器验证。
- 不引入数据库、账号、多人协作或付费依赖。

## Review Focus

- 空文件和完全不支持的文件集合必须给出可恢复错误，不能进入假扫描状态；由 Task 3 的导入测试覆盖。
- 同一证据重复补充必须去重，不能重复提高分数；由 Task 2 的领域测试覆盖。
- 本地服务未启动、模型未下载与推理失败必须呈现不同状态；由 Task 5 的 API 测试覆盖。
- Qwen 密钥缺失或请求超时必须保留端侧结果且不伪造云端成功；由 Task 6 的适配器测试覆盖。
- 移动端证据图谱必须可水平探索且不遮挡主操作；由 Task 7 的浏览器验证覆盖。

---

### Task 1: 工程骨架与视觉令牌

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/styles/tokens.css`
- Create: `src/styles/global.css`
- Create: `src/test/setup.ts`
- Create: `src/App.test.tsx`
- Create: `.gitignore`
- Create: `.env.example`

**Interfaces:**
- Consumes: none.
- Produces: React application root, Vitest environment, CSS design tokens, safe environment template.

- [ ] **Step 1: Write the failing smoke test**

```tsx
it('identifies the competition and technology on first render', () => {
  render(<App />);
  expect(screen.getByText('天猫 AI 黑客松作品 · Qwen × OpenVINO')).toBeVisible();
  expect(screen.getByRole('heading', { name: '每个结论，都能找到它的证据。' })).toBeVisible();
});
```

- [ ] **Step 2: Run the smoke test and verify RED**

Run: `npm test -- src/App.test.tsx`
Expected: FAIL because the application and heading do not exist.

- [ ] **Step 3: Add minimal Vite/React application and design tokens**

Create the listed configuration and application files. `App` renders the fixed eyebrow, heading, one paragraph, and disabled placeholder button. `.env.example` contains only `DASHSCOPE_API_KEY=` and `QWEN_MODEL=qwen-plus`.

- [ ] **Step 4: Verify GREEN and production build**

Run: `npm test -- src/App.test.tsx && npm run build`
Expected: test passes and Vite emits `dist/` without warnings.

- [ ] **Step 5: Commit**

```bash
git add package.json vite.config.ts tsconfig.json index.html src .gitignore .env.example
git commit -m "feat: scaffold ProofMate experience"
```

### Task 2: 证据领域模型与健康度算法

**Files:**
- Create: `src/domain/types.ts`
- Create: `src/domain/audit.ts`
- Create: `src/domain/audit.test.ts`
- Create: `src/data/demoProject.ts`

**Interfaces:**
- Consumes: no UI state.
- Produces: `calculateAuditScore(audit): number`, `linkEvidence(audit, claimId, evidence): ProjectAudit`, `getRiskCounts(audit)` and `demoProject`.

- [ ] **Step 1: Write failing score and deduplication tests**

```ts
it('weights coverage 35, consistency 25, freshness 15 and reproducibility 25 percent', () => {
  expect(calculateAuditScore({ coverage: 80, consistency: 60, freshness: 100, reproducibility: 40 })).toBe(68);
});

it('does not raise the score when the same evidence is linked twice', () => {
  const once = linkEvidence(demoProject, 'claim-energy', demoEvidence);
  const twice = linkEvidence(once, 'claim-energy', demoEvidence);
  expect(twice.score).toBe(once.score);
  expect(twice.evidence.filter(item => item.id === demoEvidence.id)).toHaveLength(1);
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- src/domain/audit.test.ts`
Expected: FAIL because the domain functions are missing.

- [ ] **Step 3: Implement immutable domain functions and a coherent demo dataset**

Implement the exact interfaces from the spec. The demo must include at least 6 claims, 10 evidence items, four risk types, and a score calculated from its dimensions rather than stored as an unrelated literal.

- [ ] **Step 4: Verify GREEN**

Run: `npm test -- src/domain/audit.test.ts`
Expected: all domain tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/domain src/data
git commit -m "feat: model evidence audits and scoring"
```

### Task 3: 样例导入与扫描叙事

**Files:**
- Create: `src/features/onboarding/FileDropzone.tsx`
- Create: `src/features/onboarding/ScanSequence.tsx`
- Create: `src/features/onboarding/importFiles.ts`
- Create: `src/features/onboarding/importFiles.test.ts`
- Create: `src/features/onboarding/Onboarding.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes: `demoProject`.
- Produces: `validateFiles(files): ImportResult`, `FileDropzone`, `ScanSequence`, and `onLoadDemo(ProjectAudit)` callback.

- [ ] **Step 1: Write failing validation and interaction tests**

```ts
it('rejects an empty selection with a recoverable message', () => {
  expect(validateFiles([])).toEqual({ ok: false, message: '请选择至少一个项目文件' });
});

it('rejects a collection containing only unsupported formats', () => {
  expect(validateFiles([fakeFile('archive.exe')])).toMatchObject({ ok: false });
});
```

Component test: clicking “体验示例项目” advances from landing to a scan sequence and finally calls `onLoadDemo` with the demo audit.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- src/features/onboarding`
Expected: FAIL because validation and onboarding components are missing.

- [ ] **Step 3: Implement import validation and an accessible scan sequence**

Support `.pdf,.md,.txt,.csv,.json,.png,.jpg,.jpeg,.webp`; cap each file at 10MB; show three truthful stages: local inventory, privacy inspection, evidence mapping. Demo timing is presentation-only and labeled as a sample replay.

- [ ] **Step 4: Verify GREEN and full suite**

Run: `npm test`
Expected: all tests pass without act warnings.

- [ ] **Step 5: Commit**

```bash
git add src/features/onboarding src/App.tsx src/styles/global.css
git commit -m "feat: add zero-setup audit onboarding"
```

### Task 4: 证据驾驶舱、图谱与补证闭环

**Files:**
- Create: `src/features/audit/AuditDashboard.tsx`
- Create: `src/features/audit/ScoreRing.tsx`
- Create: `src/features/audit/ClaimList.tsx`
- Create: `src/features/audit/EvidenceGraph.tsx`
- Create: `src/features/audit/RiskInspector.tsx`
- Create: `src/features/audit/ProcessingTrace.tsx`
- Create: `src/features/audit/AuditDashboard.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes: `ProjectAudit`, `linkEvidence`, `getRiskCounts`.
- Produces: `AuditDashboard({initialAudit})`, selectable claims, SVG graph, and “补充 30 天对照实验” interaction.

- [ ] **Step 1: Write failing dashboard tests**

Tests assert that the dashboard shows the calculated score, all four risk categories, selects a claim from the list, and raises the score above 80 only once after the evidence action.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- src/features/audit/AuditDashboard.test.tsx`
Expected: FAIL because dashboard components do not exist.

- [ ] **Step 3: Implement the focused components**

Use semantic buttons for claims, an accessible SVG with text alternative for the graph, `aria-live` for score changes, and trace cards that distinguish `device` from `cloud`. Do not add a charting dependency.

- [ ] **Step 4: Verify GREEN and production build**

Run: `npm test && npm run build`
Expected: all tests pass and bundle builds.

- [ ] **Step 5: Commit**

```bash
git add src/features/audit src/App.tsx src/styles/global.css
git commit -m "feat: build the evidence cockpit"
```

### Task 5: OpenVINO 本地推理服务

**Files:**
- Create: `local-ai/pyproject.toml`
- Create: `local-ai/app/__init__.py`
- Create: `local-ai/app/main.py`
- Create: `local-ai/app/config.py`
- Create: `local-ai/app/model_runtime.py`
- Create: `local-ai/tests/test_api.py`
- Create: `local-ai/README.md`
- Create: `scripts/download_openvino_model.py`

**Interfaces:**
- Consumes: `PROOFMATE_MODEL_PATH`, `PROOFMATE_DEVICE` environment variables.
- Produces: `/health`, `/v1/local/model`, `/v1/local/analyze`, `/v1/local/embed`; `ModelRuntime.status()` and `ModelRuntime.analyze(text)`.

- [ ] **Step 1: Write failing FastAPI tests**

```py
def test_model_endpoint_distinguishes_missing_model(client):
    response = client.get('/v1/local/model')
    assert response.status_code == 200
    assert response.json()['state'] == 'model_unavailable'

def test_analyze_rejects_empty_text(client):
    response = client.post('/v1/local/analyze', json={'text': '   '})
    assert response.status_code == 422
```

Add tests for `service_ready`, `model_unavailable`, and `inference_failed` as distinct responses using an injected runtime fake.

- [ ] **Step 2: Run tests and verify RED**

Run: `python -m pytest local-ai/tests -q`
Expected: FAIL because the service modules are missing.

- [ ] **Step 3: Implement lazy OpenVINO GenAI runtime**

Import `openvino_genai` only inside model loading. Default model metadata is `Qwen3-4B INT4 OpenVINO`, device `CPU`, quantization `INT4`. Startup must remain fast when the optional package or model is absent.

- [ ] **Step 4: Add explicit opt-in model download script**

The script prints estimated disk requirements, requires the user to pass `--accept-download`, and exports an OpenVINO-compatible model to `local-ai/models/qwen3-4b-int4`. It must not run during installation or tests.

- [ ] **Step 5: Verify GREEN**

Run: `python -m pytest local-ai/tests -q`
Expected: all API tests pass without downloading a model.

- [ ] **Step 6: Commit**

```bash
git add local-ai scripts/download_openvino_model.py
git commit -m "feat: add optional OpenVINO local intelligence"
```

### Task 6: Qwen 云端适配器、模式状态与导出

**Files:**
- Create: `server/qwenClient.ts`
- Create: `server/qwenClient.test.ts`
- Create: `src/features/settings/RuntimePanel.tsx`
- Create: `src/features/settings/RuntimePanel.test.tsx`
- Create: `src/features/export/buildReport.ts`
- Create: `src/features/export/buildReport.test.ts`
- Modify: `vite.config.ts`
- Modify: `src/features/audit/AuditDashboard.tsx`

**Interfaces:**
- Consumes: `DASHSCOPE_API_KEY`, `QWEN_MODEL`, `ProjectAudit`.
- Produces: `analyzeWithQwen(input, fetchImpl)`, `/api/qwen/analyze`, `RuntimePanel`, `buildMarkdownReport(audit)`.

- [ ] **Step 1: Write failing adapter and export tests**

Assert missing key returns `{state:'provider_not_configured'}`, timeout returns `{state:'provider_timeout'}` without deleting local audit data, generated report includes every critical claim and unresolved risk, and never includes the API key.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- server src/features/settings src/features/export`
Expected: FAIL because adapter, runtime panel and export builder are missing.

- [ ] **Step 3: Implement the minimal safe adapter and report builder**

Use the DashScope OpenAI-compatible endpoint, an abort timeout, structured JSON validation, and server-only environment access. Runtime panel exposes demo/local/cloud state with truthful copy. Export downloads a UTF-8 Markdown blob and offers browser print.

- [ ] **Step 4: Verify GREEN and secret scan**

Run: `npm test && npm run build && rg -n "sk-[A-Za-z0-9]" . -g '!node_modules' -g '!dist'`
Expected: tests/build pass; secret scan returns no matches.

- [ ] **Step 5: Commit**

```bash
git add server src/features/settings src/features/export vite.config.ts src/features/audit/AuditDashboard.tsx
git commit -m "feat: connect optional Qwen analysis and export"
```

### Task 7: 视觉完善、响应式与真实浏览器验证

**Files:**
- Modify: `src/styles/global.css`
- Modify: `src/styles/tokens.css`
- Modify: relevant components under `src/features/`
- Create: `tests/e2e/demo.spec.ts`
- Create: `playwright.config.ts`

**Interfaces:**
- Consumes: completed Web experience.
- Produces: responsive desktop/mobile UI and repeatable critical-path browser test.

- [ ] **Step 1: Write the failing end-to-end test**

Test launches the demo, loads the sample, waits for the cockpit, opens a high-risk claim, adds evidence, verifies score improvement, exports the report, and repeats navigation at 390×844 while asserting no main-page horizontal overflow.

- [ ] **Step 2: Run E2E and verify RED**

Run: `npm run test:e2e`
Expected: FAIL on missing Playwright configuration or incomplete responsive behavior.

- [ ] **Step 3: Complete visual states and responsive layout**

Implement focus-visible styles, reduced motion, loading/error/empty states, mobile graph scroller, sticky mobile action, and print styling. Keep the interface bespoke and avoid dashboard-template appearance.

- [ ] **Step 4: Verify automated and visual behavior**

Run: `npm test && npm run build && npm run test:e2e`
Then inspect 1440×900 and 390×844 in the browser, including landing, scan, cockpit, selected-risk and post-repair states.
Expected: all commands pass and no visual blocker remains.

- [ ] **Step 5: Commit**

```bash
git add src tests playwright.config.ts
git commit -m "feat: polish and verify the competition demo"
```

### Task 8: 初赛材料与可提交作品包

**Files:**
- Create: `submission/体验说明.md`
- Create: `submission/作品介绍.md`
- Create: `submission/AI技术实践说明.md`
- Create: `submission/演示脚本.md`
- Create: `submission/评委问答.md`
- Create: `submission/AI实践佐证/README.md`
- Create: `submission/AI实践佐证/prompts.md`
- Create: `submission/作品展示/README.md`
- Create: `submission/封面.png`
- Create: `scripts/package_submission.ps1`
- Modify: `README.md`

**Interfaces:**
- Consumes: verified product, screenshots, exact build/run commands.
- Produces: official form copy, 1920×1080 cover, evidence pack, judge script, and `dist-submission/真源_参赛者名.zip`.

- [ ] **Step 1: Write the package verification script first**

The script fails unless the cover is exactly 1920×1080, required Markdown files exist, AI evidence contains at least one prompt/code/runtime artifact, ZIP naming is correct, and generated ZIP contains both `作品展示/` and `AI实践佐证/`.

- [ ] **Step 2: Run package verifier and verify RED**

Run: `powershell -File scripts/package_submission.ps1 -VerifyOnly`
Expected: FAIL listing missing deliverables.

- [ ] **Step 3: Create submission copy and evidence**

Keep both form fields within 300 Chinese characters. Document exact Qwen/OpenVINO responsibilities, demo mode limitation, local service setup, and API-key insertion. Include tested commands and no unsupported performance claim.

- [ ] **Step 4: Create and inspect the cover**

Generate a 1920×1080 visual using the app’s red/black/warm-white language, product name, value proposition and an abstract evidence graph. Inspect at full size and thumbnail size; fix illegible text or artifacts.

- [ ] **Step 5: Package and verify**

Run: `powershell -File scripts/package_submission.ps1`
Expected: verifier passes and creates the named ZIP below 10MB where practical; if larger, record the exact size and keep below the form’s accepted limit discovered during final upload rehearsal.

- [ ] **Step 6: Final whole-project verification**

Run: `npm test && npm run build && npm run test:e2e && python -m pytest local-ai/tests -q && powershell -File scripts/package_submission.ps1 -VerifyOnly && git diff --check && git status --short`
Expected: all executable checks pass; status contains only intentional deliverables.

- [ ] **Step 7: Commit**

```bash
git add README.md submission scripts/package_submission.ps1
git commit -m "docs: deliver competition submission package"
```
