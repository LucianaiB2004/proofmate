# 02 · xParse 真实调用记录

> 记录对象：`ProofMate-真实案例-挑战者号/03-NASA-O形环风险图表.jpg`
> 调用日期：2026-10-01
> 本记录中的命令、耗时、状态、哈希与解析摘要全部来自真实执行，未做任何模拟或手工替换。

---

## 一、使用的 Skill / Connector

| 项 | 值 |
|---|---|
| Skill 名称 | `xparse-parse` |
| Skill 来源 | `intsig-textin/xparse-skills`（GitHub） |
| Skill 路径 | `.codebuddy/skills/xparse-parse/SKILL.md` |
| 锁定哈希 | `50f86d6bfa6ecee3dcad05164823b7141727e53da660f2ae72e17d10008c7293`（`skills-lock.json`） |
| 执行内核 | 本机 `xparse-cli` **2.5.0**（`C:/Users/lucianaib/AppData/Roaming/npm/xparse-cli`） |
| Connector | 未使用独立 Connector；按 Skill 要求通过 CLI 直接调用 TextIn xParse 服务 |
| 身份档案 | `--profile workbuddy` |
| API 路由 | `--api auto`（免费优先，不自动切换到付费模式） |

Skill 要求的两项前置动作均已执行：

1. 首次调用前创建了 `0600` 权限的 `tmp/xparse-task-context.json`（`schema_version: xparse_task_context.v1`，含 `user_intent` 与 `tool_call_reason`）；
2. 首次调用后，在**独立的 shell 调用**中删除了该临时文件（已确认删除成功）。

---

## 二、实际调用方式

两次调用均为**独立、未被管道包装**的 `xparse-cli` 命令，退出码原样保留。

### 第 1 次 · Markdown 视图

```bash
xparse-cli parse "ProofMate-真实案例-挑战者号/03-NASA-O形环风险图表.jpg" \
  --api auto --profile workbuddy \
  --task-context tmp/xparse-task-context.json \
  --output submission-textin/evidence/workbuddy-development/xparse-output
```

### 第 2 次 · JSON 结构化视图

```bash
xparse-cli parse "ProofMate-真实案例-挑战者号/03-NASA-O形环风险图表.jpg" \
  --api auto --profile workbuddy --view json \
  --output submission-textin/evidence/workbuddy-development/xparse-output
```

### 调用前环境核查

```bash
xparse-cli version                 # → xparse-cli version 2.5.0
xparse-cli auth status --output=json --profile workbuddy
                                   # → {"logged_in":false}（未登录，走免费额度）
xparse-cli quota --output json --profile workbuddy
```

---

## 三、执行时间、耗时与状态

| # | 视图 | 开始时间 (GMT+8) | 结束时间 (GMT+8) | 墙钟耗时 | 退出码 | 状态 |
|---|---|---|---|---|---|---|
| 1 | markdown | 2026-10-01 10:07:53.871 | 2026-10-01 10:07:57.684 | **3,813 ms** | 0 | ✅ success |
| 2 | json | 2026-10-01 10:08:11.847 | 2026-10-01 10:08:16.077 | **4,230 ms** | 0 | ✅ success |

第 2 次调用服务端返回的自计时：

| 服务端字段 | 值 |
|---|---|
| `code` / `message` | `200` / `success` |
| `data.summary.duration_ms` | **1,689 ms** |
| `data.schema_version` | `1.4.0` |
| `data.success_count` | `1` |
| `data.metadata` | `{ filename: "03-NASA-O形环风险图表.jpg", filetype: "image/jpeg", page_count: 1 }` |

两次调用的 `stdout` 与 `stderr` 均为空——因为使用了 `--output`，CLI 把结果写入文件而非终端，没有任何被截断或改写的输出。

> 说明：墙钟耗时包含 Node 侧 `execFile` 启动子进程、CLI 上传文件、服务端解析与落盘的完整链路；服务端 `duration_ms` 只覆盖服务端处理。两者都如实记录，不做取舍。

---

## 四、文件路径与 SHA-256

### 输入

| 项 | 值 |
|---|---|
| 路径 | `ProofMate-真实案例-挑战者号/03-NASA-O形环风险图表.jpg` |
| 大小 | 91,248 字节 |
| SHA-256 | `6c4ce3f20e843c33267c94f66911bf207b191136b3b5d8c668f1ec2d436718aa` |

### 输出

| 项 | 路径 | 大小 | SHA-256 |
|---|---|---|---|
| Markdown | `submission-textin/evidence/workbuddy-development/xparse-output/03-NASA-O形环风险图表.md` | 1,596 字节 | `03b1efaeba4854075db3ea045a4d1fa712dee3e0ce43f6cee45f95dc4a39f2de` |
| JSON | `submission-textin/evidence/workbuddy-development/xparse-output/03-NASA-O形环风险图表.json` | 19,569 字节 | `b3830e4c61fdef6c6e8800e11e7d37cef795a8c9fd5f212cc32b7b3673368cc6` |
| 运行记录（机器可读） | `submission-textin/evidence/workbuddy-development/xparse-output/xparse-run-record.json` | — | — |

### 服务端可追溯标识（第 2 次调用）

| 字段 | 值 |
|---|---|
| `x_request_id` | `9ba4b7ecf55582d9a4f764bd776f8393` |
| `data.file_id` | `f88067767b5d49aa89fa548a5f7a27e8` |
| `data.job_id` | `bb629f842b81482382135085a3cd4e04` |

### 配额消耗（真实账本）

| 时点 | `daily_pages_used` | `daily_pages_remaining` | `authenticated` |
|---|---|---|---|
| 调用前 | 0 | 1000 | false |
| 调用后 | **2** | **998** | false |

两次解析各消耗 1 页，`daily_pages_used` 从 0 变为 2——这是服务端账本对"确实发生了两次真实解析"的独立佐证。配额重置时间 `2026-10-02T00:00:00+08:00`。

---

## 五、真实解析摘要

### Markdown 输出（全文结构）

解析结果保留了原始图表的全部文字层，并按版面顺序还原：

```
# PRINARY CONCEPNS
# 。FIELD JOINT-HIGIEST CONCEPN

EROSION PENETRATION OF PRIIARY SEAL REQUIRES RELIABLE SECONDARY SEAL FOR PRESSURE INTEGRITY

o IGNITION TRANSIENT-(0-600 MS)
0(0-170 IS)HIGH PROBABILITY OF RELLABLE SECONDARY SEAL
0(170-330 MS) REDUCED PRODABILITY OF RELIABLE SECONDARY SEAL
0(330-600 MS) HIGH PROBABILITY OF NO SECONDARY SEAL CAPABILITY
0STEADY STATE-(600 NS-2 MINUTES)
。 IF EROSION PENETRATES PRIMARY O-RING SEAL-HIGH PROBABILITY CF NO SECONDARY SEAL CAPADILITY
BENCH TESTINGSHOHED O-RING NOT CAPABLE OF MAINTATNING CONTACT WITH METAL PARTS GAP OPENING RATE TO NEOP
0BENCH TESTING SHOWED CAPABILITY TO MAINTAIN O-RING CONTACT DURING IHITIAL PHASE (0-170 NS) OF TRANSIENT

Chart 2-1 presented by Thiokol's Roger Boisjoly summarizing primary concerns with the field joint and its O-ring seals on the boosters.
Boisjoly's Chart 2-2 indicating concern about temperature ef-fect on seal actuation time (handwritten).

<table border="1"><tr><td>Joint Primary Concerns SRM 25 ■A Temperature Lower Than Current Data Base<br>
Results in Changing Primary O-Ring Sealing Timing Function<br>■SRM 15A-80° ARC Black Grease Between O-Rings<br>
SRM 15B-110° ARC Black Grease Between O-Rings<br>■Lower O-Ring squeeze due to lower temp.<br>
■Higher O-Ring shore hardness<br>■Thicker grease viscosity<br>■Higher O-Ring pressure actuation time<br>
■If actuation time increases, threshold of secondary seal pressurization capability is approached<br>
■If threshold is reached then secondary seal may not be capable of being pressurized</td></tr></table>
```

### JSON 结构化输出

| 项 | 值 |
|---|---|
| 元素总数 | 14 |
| 元素类型分布 | `Title` × 2、`NarrativeText` × 11、`Table` × 1 |
| 标题树 | 2 个 `level: 1` 标题，均定位到第 1 页 |
| 表格 | 1 个，以 HTML `<table>` 形式保留单元格结构 |
| 页数 | 1 |

### 关于识别质量

这是一张**历史扫描件**（NASA Rogers Commission 调查报告插图），输出中保留了真实的 OCR 误识别字符，例如：

- `PRIMARY` → `PRINARY`、`CONCERNS` → `CONCEPNS`
- `RELIABLE` → `RELLABLE`、`PROBABILITY` → `PRODABILITY`
- `CAPABILITY` → `CAPADILITY`、`SHOWED` → `SHOHED`
- `MAINTAINING` → `MAINTATNING`、`INITIAL` → `IHITIAL`

这些误识别字符被**原样保留**，没有被系统"顺手修正"。这正是 ProofMate 需要的：`rawContent` 字段保存未经清洗的原始提取结果，用户可以在"查看原始提取内容"中对照原图逐字核对；人工确认关系时以原文件为准，而不是以模型改写后的文本为准。

---

## 六、关键信息核验

按要求逐项核验以下内容是否**真实出现在解析输出中**，并引用真实输出原文。

| # | 核验项 | 是否出现 | 真实输出中的原文 |
|---|---|---|---|
| 1 | **O-RING** | ✅ 出现 | `0BENCH TESTING SHOWED CAPABILITY TO MAINTAIN O-RING CONTACT DURING IHITIAL PHASE (0-170 NS) OF TRANSIENT`<br>`。 IF EROSION PENETRATES PRIMARY O-RING SEAL-HIGH PROBABILITY CF NO SECONDARY SEAL CAPADILITY`<br>`BENCH TESTINGSHOHED O-RING NOT CAPABLE OF MAINTATNING CONTACT WITH METAL PARTS GAP OPENING RATE TO NEOP` |
| 2 | **temperature** | ✅ 出现 | `Boisjoly's Chart 2-2 indicating concern about temperature ef-fect on seal actuation time (handwritten).`<br>表格中：`Joint Primary Concerns SRM 25 ■A Temperature Lower Than Current Data Base` |
| 3 | **secondary seal** | ✅ 出现 | `EROSION PENETRATION OF PRIIARY SEAL REQUIRES RELIABLE SECONDARY SEAL FOR PRESSURE INTEGRITY`<br>`0(170-330 MS) REDUCED PRODABILITY OF RELIABLE SECONDARY SEAL`<br>表格中：`If actuation time increases, threshold of secondary seal pressurization capability is approached` |
| 4 | **低温对 O 形环密封时间的影响** | ✅ 出现 | `■A Temperature Lower Than Current Data Base` / `Results in Changing Primary O-Ring Sealing Timing Function`<br>并附三条机理：`■Lower O-Ring squeeze due to lower temp.`、`■Higher O-Ring shore hardness`、`■Thicker grease viscosity`<br>以及 `■Higher O-Ring pressure actuation time`<br>图注：`Boisjoly's Chart 2-2 indicating concern about temperature ef-fect on seal actuation time` |
| 5 | **次级密封能力随时间窗口下降的描述** | ✅ 出现 | 三个时间窗按顺序呈现能力衰减：<br>`0(0-170 IS) HIGH PROBABILITY OF RELLABLE SECONDARY SEAL`<br>`0(170-330 MS) REDUCED PRODABILITY OF RELIABLE SECONDARY SEAL`<br>`0(330-600 MS) HIGH PROBABILITY OF NO SECONDARY SEAL CAPABILITY`<br>稳态段：`。 IF EROSION PENETRATES PRIMARY O-RING SEAL-HIGH PROBABILITY CF NO SECONDARY SEAL CAPADILITY` |

### 对 ProofMate 的意义

这五项恰好构成一条完整的**主张—证据链**：

- 主张：*低温会推迟 O 形环密封动作时间，从而压缩次级密封的可靠时间窗口。*
- 支持原文：`Temperature Lower Than Current Data Base` + `Changing Primary O-Ring Sealing Timing Function`（第 4 项）。
- 量化窗口：`0-170 ms 可靠 → 170-330 ms 降低 → 330-600 ms 高概率失去次级密封`（第 5 项）。
- 实验佐证：`BENCH TESTING SHOWED ... DURING IHITIAL PHASE (0-170 NS) OF TRANSIENT` 与 `BENCH TESTINGSHOHED O-RING NOT CAPABLE OF MAINTATNING CONTACT ...`（第 1 项）。

也就是说，OCR 输出的文本**已经足以支撑**这条主张在 ProofMate 里进入"待人工确认的支持证据"，而不需要任何额外补充。这正是 xParse 在本项目中的实用价值：**把一张不可检索的历史扫描图，变成一条可以被逐字回查的证据。**

---

## 七、命令执行完整性声明

- 两次 `xparse-cli` 调用都是独立执行的，未被 `head` / `tail` / `grep` 等管道包装，退出码原样保留；
- 任务上下文文件的清理在**独立的 shell 调用**中完成，未与解析命令串联；
- 两次调用退出码均为 `0`，`stdout` 与 `stderr` 均为空，无被丢弃的错误信息；
- 未执行任何诊断性 xParse 命令，未做重试（两次调用分别对应"Markdown 视图"和"JSON 视图"两个不同的产出目标，不是对同一动作的重复尝试）；
- 全程未在命令、输出或日志中打印任何 App ID、Secret Code 或 API Key。
