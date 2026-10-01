# ProofMate Dual Submission Packages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish the current ProofMate source and produce separate, verified submission ZIPs for the Tmall AI competition and the TextIn xParse practical-value track.

**Architecture:** Keep one shared product source tree and two explicit packaging manifests. Each packager copies only allow-listed files into a staging directory, scans names and text for secrets/internal drafts, creates a ZIP, reopens it, and writes a SHA-256 manifest.

**Tech Stack:** PowerShell 7, Node.js/Vite, Vitest, Git/GitHub, ReportLab/Poppler for the existing PDF.

**Spec:** User confirmation in this task: one shared project, two independent packages, latest source and WorkBuddy development evidence published to GitHub.

## Global Constraints

- Project name: 真源 ProofMate 文档证据审查台.
- TextIn track: TextIn xParse 实用价值赛道.
- WorkBuddy is described as a development tool, not a ProofMate runtime feature.
- Never package or commit API keys, local provider settings, runtime logs, temporary render files, internal Q&A, or demo scripts.
- Each ZIP must be independently reproducible, reopened after creation, content-scanned, timestamped, and hashed.

## Review Focus

- A stale ZIP must not be reported as current.
- The TextIn package must contain xParse call evidence and WorkBuddy development screenshots.
- The Tmall package must not accidentally include TextIn-only internal working files.
- Public screenshots must not expose account information or a mouse pointer.
- Neither package may contain secret-like values or ignored local settings.

---

### Task 1: Dual-package allowlists and validation

**Files:**
- Create: `scripts/package_dual_submissions.ps1`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: existing `submission/`, `submission-textin/`, application source, `dist/`.
- Produces: two ZIPs plus `SHA256SUMS.txt` under `dist-submission/`.

- [ ] Add separate Tmall and TextIn allowlists.
- [ ] Reject forbidden filenames and secret-like text.
- [ ] Reopen each generated ZIP and validate required entries.
- [ ] Keep staging strictly inside `dist-submission/dual-stage/`.

### Task 2: Generate and verify both artifacts

**Files:**
- Create: `dist-submission/真源ProofMate-天猫AI作品包.zip`
- Create: `dist-submission/真源ProofMate-TextIn-xParse实用价值赛道作品包.zip`
- Create: `dist-submission/SHA256SUMS.txt`

**Interfaces:**
- Consumes: Task 1 packager.
- Produces: submission-ready local artifacts.

- [ ] Run the full unit test suite and production build.
- [ ] Generate both ZIPs.
- [ ] Verify required entries, forbidden entries, timestamps, sizes, and SHA-256.

### Task 3: Publish the shared project source

**Files:**
- Modify: repository-tracked source, tests, README-adjacent evidence, and finished submission documents only.

**Interfaces:**
- Consumes: verified working tree and Task 2 evidence.
- Produces: one commit on the confirmed shared repository and an updated `origin/master`.

- [ ] Stage only public, reusable project files.
- [ ] Review the staged diff and scan it for secrets.
- [ ] Commit, push, and verify the remote commit.
