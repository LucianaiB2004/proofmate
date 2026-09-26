# ProofMate Convergent Audit Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace raw-text claim slicing and append-only model findings with a readable, traceable audit pipeline that merges repeated reviews, recalculates evidence health, and converges.

**Architecture:** File extraction remains separate from model analysis. Clean, located source fragments feed OpenVINO candidate review first; confirmed local findings and later Qwen reviews pass through one deterministic merge layer that updates existing claims and derives score from current state. React components render the selected claim's actual evidence and report each review round's delta.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, Playwright, Vite, existing PDF.js/TextIn/OpenVINO/Qwen adapters.

**Spec:** `docs/superpowers/specs/2026-09-26-proofmate-convergent-audit-pipeline.md`

## Global Constraints

- Reuse existing React, OpenVINO, Qwen, PDF.js and TextIn integrations; add no runtime dependency.
- File extraction never claims to be model analysis, and real materials never fall back to demo conclusions.
- Model output without a traceable excerpt stays an unreviewed locator hint and does not count as supporting evidence.
- Only human confirmation can mark a claim `verified`.
- Repeated confirmation and repeated review must be idempotent.
- Preserve backward compatibility for demo cases and saved drafts by supplying defaults for new optional fields.

## Review Focus

- Markdown mixed with HTML tables: clean readable cell text without emitting tags or destroying meaningful numbers (Task 1 tests).
- Two claims from one file: each claim must link only to its own located excerpt, not the entire file evidence record (Task 2 tests).
- Model returns the same claim with punctuation or heading differences: merge into one stable claim (Task 3 tests).
- A verified claim receives new conflicting evidence: reopen it as conflict and include it in the next review scope (Task 4 tests).
- Long evidence on narrow screens: preserve relationship labels and controls while truncating cards and exposing full text (Task 5 browser tests).

---

### Task 1: Readable source cleaning and located fragments

**Files:**
- Create: `src/features/onboarding/cleanExtractedText.ts`
- Create: `src/features/onboarding/cleanExtractedText.test.ts`
- Modify: `src/domain/types.ts`

**Interfaces:**
- Consumes: extracted UTF-8 text plus evidence id and source filename.
- Produces: `cleanExtractedText(text: string): string`, `segmentExtractedText(text: string, source: string, evidenceId: string): SourceFragment[]`; `SourceFragment` contains `id`, `evidenceId`, `source`, `locator`, `text`, and `fingerprint`.

- [ ] **Step 1: Write failing tests for Markdown/HTML cleanup and fragment location**

  Assert that `# 标题`, `## 待审查案例材料`, and `<table><tr><td>测试目标</td></tr></table>` become readable text without `#`, `<table>`, `<td>`; preserve `测试目标`. Assert separate paragraphs produce different locators and fingerprints.

- [ ] **Step 2: Run the focused tests and verify RED**

  Run: `npm test -- --run src/features/onboarding/cleanExtractedText.test.ts`
  Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the cleaner and segmenter**

  Decode common HTML entities, replace block/table tags with boundaries, strip remaining tags and Markdown control syntax, collapse whitespace without losing paragraph boundaries, discard fragments shorter than eight readable characters, and derive deterministic fingerprints from normalized text.

- [ ] **Step 4: Run focused tests and verify GREEN**

  Run the Step 2 command. Expected: all tests PASS.

- [ ] **Step 5: Commit Task 1 files**

  Commit message: `feat: clean and locate extracted source text`

### Task 2: Honest initial dossier without fabricated claims

**Files:**
- Modify: `src/features/onboarding/buildImportedAudit.ts`
- Modify: `src/features/onboarding/buildImportedAudit.test.ts`
- Modify: `src/features/onboarding/ScanSequence.tsx`
- Modify: `src/features/audit/SourceMaterialPanel.tsx`

**Interfaces:**
- Consumes: `segmentExtractedText(...)` from Task 1.
- Produces: an imported `ProjectAudit` whose evidence records contain cleaned content and located fragments, while `claims` stays empty until a model or human creates a traceable claim.

- [ ] **Step 1: Write failing tests for clean imported evidence and zero fabricated claims**

  Assert imported Markdown/HTML stores readable `content`, does not create tag-shaped claims, and exposes fragments with distinct locators. Assert unreadable files retain their extraction error and create no claim.

- [ ] **Step 2: Run import tests and verify RED**

  Run: `npm test -- --run src/features/onboarding/buildImportedAudit.test.ts`
  Expected: FAIL because current code slices six claims.

- [ ] **Step 3: Update imported audit construction and copy**

  Build evidence and fragments only; initialize dimensions from actual extraction metadata; set the trace to “文字提取完成，端侧初审待运行”; update scan copy and the source reader to show cleaned text by default and an explicit raw-text disclosure when raw content differs.

- [ ] **Step 4: Run import and onboarding tests**

  Run: `npm test -- --run src/features/onboarding/buildImportedAudit.test.ts src/features/onboarding/Onboarding.test.tsx src/features/audit/SourceMaterialPanel.test.tsx`
  Expected: all tests PASS.

- [ ] **Step 5: Commit Task 2 files**

  Commit message: `fix: keep extraction separate from claim analysis`

### Task 3: Unified idempotent review merge engine

**Files:**
- Create: `src/domain/reviewMerge.ts`
- Create: `src/domain/reviewMerge.test.ts`
- Modify: `src/domain/types.ts`
- Modify: `src/features/audit/parseLocalReview.ts`
- Modify: `src/features/audit/parseLocalReview.test.ts`

**Interfaces:**
- Consumes: `mergeReviewRound(audit: ProjectAudit, input: ReviewFinding[], options: { origin: 'openvino' | 'qwen'; revision: number }): { audit: ProjectAudit; delta: ReviewDelta }`.
- Produces: `ReviewFinding`, optional `Claim.fingerprint/origin/reviewRevision`, and `ReviewDelta` with `added`, `updated`, `merged`, `resolved`, `unchanged`, `remaining`, and `changedClaimIds`.

- [ ] **Step 1: Write failing merge tests**

  Cover exact duplicates, punctuation/Markdown variants, shared source excerpts, richer risk/repair updates, missing excerpts as unreviewed hints, and the same round applied twice. Assert the second application leaves claim/evidence counts unchanged.

- [ ] **Step 2: Run merge tests and verify RED**

  Run: `npm test -- --run src/domain/reviewMerge.test.ts`
  Expected: FAIL because the merge engine does not exist.

- [ ] **Step 3: Implement normalization, evidence dedupe and review merge**

  Use normalized claim fingerprints and `sourceFingerprint + locator + excerpt` evidence keys. Merge rather than append; preserve richer fields; never promote to verified; return exact delta counts.

- [ ] **Step 4: Make the OpenVINO parser reject markup fragments and emit unified findings**

  Keep the existing structured-section parser, clean every field through Task 1, discard entries without a verifiable statement, and map basis text to a locator hint rather than a supporting relation.

- [ ] **Step 5: Run domain and parser tests**

  Run: `npm test -- --run src/domain/reviewMerge.test.ts src/features/audit/parseLocalReview.test.ts`
  Expected: all tests PASS.

- [ ] **Step 6: Commit Task 3 files**

  Commit message: `feat: merge model reviews into a convergent dossier`

### Task 4: Derived scoring and unresolved review scope

**Files:**
- Modify: `src/domain/audit.ts`
- Modify: `src/domain/audit.test.ts`
- Modify: `src/features/audit/AuditDashboard.tsx`
- Modify: `src/features/audit/AuditDashboard.test.tsx`
- Modify: `src/features/settings/RuntimePanel.tsx`
- Modify: `src/features/settings/RuntimePanel.test.tsx`

**Interfaces:**
- Consumes: Task 3 `mergeReviewRound` and `ReviewDelta`.
- Produces: `deriveAuditDimensions(audit: ProjectAudit): AuditDimensions`, `recalculateAudit(audit: ProjectAudit): ProjectAudit`, and runtime callbacks that apply a review round and display its delta.

- [ ] **Step 1: Write failing derived-score tests**

  Assert score is unchanged by duplicate review, increases only after valid supporting evidence plus human confirmation, falls/reopens when a verified claim receives conflict, and always equals `calculateAuditScore(deriveAuditDimensions(audit))`.

- [ ] **Step 2: Run domain tests and verify RED**

  Run: `npm test -- --run src/domain/audit.test.ts`
  Expected: FAIL because score is currently incremented from stored dimensions.

- [ ] **Step 3: Implement derived dimensions and central recalculation**

  Derive coverage, consistency, freshness and reproducibility from current claims/evidence; treat missing dates as unknown; weight critical/high conflicts more strongly; call recalculation after every dossier mutation.

- [ ] **Step 4: Write failing component tests for review order and convergence**

  Assert real imports explain “提取不是模型分析”; OpenVINO is labeled first-pass; Qwen request input includes only unresolved claims; applying identical findings twice reports unchanged/settled and does not grow the dossier; newly conflicting evidence re-enters scope.

- [ ] **Step 5: Run component tests and verify RED**

  Run: `npm test -- --run src/features/audit/AuditDashboard.test.tsx src/features/settings/RuntimePanel.test.tsx`
  Expected: FAIL on append-only callbacks and whole-evidence cloud input.

- [ ] **Step 6: Integrate the merge engine into dashboard and runtime panel**

  Replace append-only OpenVINO/Qwen handlers with review rounds; build Qwen input from unresolved claims and their evidence; show added/updated/merged/resolved/remaining; disable only the applied change set, and unlock review after new material changes the dossier revision.

- [ ] **Step 7: Run Task 4 tests and verify GREEN**

  Run the Step 2 and Step 5 commands. Expected: all tests PASS.

- [ ] **Step 8: Commit Task 4 files**

  Commit message: `feat: recalculate audit health across review rounds`

### Task 5: Claim-specific, quiet evidence interface

**Files:**
- Modify: `src/features/audit/ClaimList.tsx`
- Create: `src/features/audit/ClaimList.test.tsx`
- Modify: `src/features/audit/EvidenceGraph.tsx`
- Modify: `src/features/audit/EvidenceGraph.test.tsx`
- Modify: `src/features/audit/RiskInspector.tsx`
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes: cleaned claim text, claim origin, and claim-specific evidence ids from Tasks 1–4.
- Produces: two-line claim cards, selected full claim copy, at most four compact relationship cards in a bounded scroll region, and explicit expand/collapse controls for long excerpts.

- [ ] **Step 1: Write failing UI tests for claim-specific evidence and expansion**

  Assert no rendered claim contains Markdown/HTML syntax; changing selection changes evidence titles; a claim without evidence displays the gap; five linked items show four compact cards plus an accessible way to reveal the rest/full excerpt.

- [ ] **Step 2: Run focused UI tests and verify RED**

  Run: `npm test -- --run src/features/audit/ClaimList.test.tsx src/features/audit/EvidenceGraph.test.tsx`
  Expected: FAIL on missing cleaning/origin/expansion behavior.

- [ ] **Step 3: Implement compact cards, selected detail and bounded board layout**

  Keep relationship order support, conflict, unreviewed, unrelated; truncate only visual card copy, not accessible/full content; avoid horizontal overflow at 390 px and desktop clipping.

- [ ] **Step 4: Run focused UI tests and verify GREEN**

  Run the Step 2 command. Expected: all tests PASS.

- [ ] **Step 5: Commit Task 5 files**

  Commit message: `fix: make evidence relationships claim specific and readable`

### Task 6: Full verification with a real PDF and repeated reviews

**Files:**
- Modify: `tests/e2e/demo.spec.ts`
- Modify: `README.md`

**Interfaces:**
- Consumes: the completed pipeline and the existing desktop test PDF.
- Produces: browser regression coverage and accurate user-facing model-order documentation.

- [ ] **Step 1: Write failing browser scenarios**

  Upload a PDF containing Markdown/HTML-like text through “开始审查我的材料”; assert no tag-shaped claims before or after model review, run OpenVINO and accept once, run/accept the same findings again and assert counts stay stable, run Qwen against unresolved claims, verify delta copy/score, switch claims and verify distinct relationship content, and inspect a 390 px viewport.

- [ ] **Step 2: Run the focused browser tests and verify RED before final integration fixes**

  Run: `npx playwright test --grep "convergent real-material review"`
  Expected: FAIL until all browser behavior is wired.

- [ ] **Step 3: Update README with the exact processing order**

  Document extraction → cleaning → OpenVINO first-pass → human confirmation → Qwen unresolved review → merge/recalculate, including that extraction itself is not model analysis.

- [ ] **Step 4: Run all verification gates**

  Run: `npm test`
  Expected: all Vitest suites PASS.

  Run: `npm run build`
  Expected: TypeScript and Vite build PASS.

  Run: `npm run test:e2e`
  Expected: all Playwright scenarios PASS.

  Run: `python -m pytest local-ai/tests -q`
  Expected: all local model tests PASS.

- [ ] **Step 5: Perform final visual inspection**

  With `http://127.0.0.1:4173/`, upload `C:\Users\lucianaib\Desktop\ProofMate-真实案例-挑战者号\01-挑战者号待审查案例.pdf`; inspect claim cards, selected relationships, long evidence expansion, score changes, repeated review convergence and 390 px layout. Record observed results separately from mocked integration tests.

- [ ] **Step 6: Review final diff for secrets, unrelated changes and stale copy**

  Confirm no API key or credential is committed, no unrelated user change is reverted, and all UI copy describes actual model behavior.

- [ ] **Step 7: Commit Task 6 files**

  Commit message: `test: verify convergent real-material review flow`

