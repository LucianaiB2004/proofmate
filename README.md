# 真源 ProofMate

## 在线体验

[打开 GitHub Pages 云端体验版](https://lucianaib2004.github.io/proofmate/)

云端体验版保留文件上传、TextIn xParse OCR、百炼 Qwen 分析、主张索引、证据关系与人工确认闭环，仅停用依赖本机模型权重的 OpenVINO 步骤。使用者在“模型与 OCR 设置”中填写自己的凭证；凭证只保存在当前页面内存，刷新即清除，不写入浏览器存储、源码或 GitHub。材料会从浏览器直接发送给对应服务商，请勿上传无权处理的敏感材料。

由 **TextIn xParse × Qwen × OpenVINO × 天猫 AI** 共同构成的端云协同可信证据系统。TextIn xParse 负责读取图片和扫描材料，OpenVINO Qwen3-4B INT4 在本地完成隐私优先的初审，百炼 `qwen-plus` 按需复核尚未解决的主张，天猫 AI 串联完整的作品体验。模型发现只有在带有原文摘录、能够回查材料来源并经人工确认后，才会进入主张—证据关系档案。

## 快速开始

```powershell
npm install
npm run dev
```

打开终端显示的地址，点击“开始审查我的材料”上传真实文件，或从案例库选择公开材料练习案例。无需登录即可查看案例；实时云端复核和 OCR 使用用户在设置页填写的凭证。若需解析图片或扫描材料，先安装官方 `xparse-cli`：

```powershell
npm i -g xparse-cli
```

## 案例库

- 校园节能项目：项目原创样例，展示数字冲突与补证闭环。
- 挑战者号发射决策：依据 NASA Rogers Commission 公开调查报告改编。
- 北京空气质量预测：依据 UCI Beijing Multi-Site Air Quality 数据集改编，数据集采用 CC BY 4.0。
- AI 招聘系统审计：依据 NIST AI RMF 与公开使用案例改编。

公开案例用于教学演示，页面会标注来源并链接原始资料，不代表来源机构的原始结论或背书。

## 验证

```powershell
npm test
npm run build
npm run test:e2e
python -m pytest local-ai/tests -q
pwsh -File scripts/package_dual_submissions.ps1 -VerifyOnly
```

## 项目开发过程中使用 WorkBuddy

ProofMate 在开发阶段通过 WorkBuddy 接入项目级 `xparse-parse` Skill。WorkBuddy 用于阅读现有工程、核对 xParse 接入代码、真实解析 NASA O 形环扫描图、检查 Markdown/JSON 输出、协助完成针对性修复与开发文档整理。它是项目开发与验证工具，不是 ProofMate 的运行时依赖；用户直接启动 ProofMate 即可完成材料上传、OCR、端侧初审、云端复核和人工入档。

真实调用记录、开发检查报告与公开截图位于 [`submission-textin/evidence/workbuddy-development/`](submission-textin/evidence/workbuddy-development/) 和 [`submission-textin/evidence/workbuddy-screenshots/`](submission-textin/evidence/workbuddy-screenshots/)。

## 可选 AI 能力

真实材料按固定顺序形成审查闭环：

1. 浏览器读取文本和文本型 PDF；图片或扫描 PDF 通过 TextIn xParse OCR 提取文字。文件提取不是模型分析。
2. 系统清理 Markdown/HTML 控制符，并把正文整理成可定位的材料片段。
3. OpenVINO Qwen3-4B INT4 执行第一遍端侧初审，生成带依据、风险边界和补证建议的候选主张。
4. 用户确认候选后写入档案；重复结果会合并，不会不断追加。
5. 百炼 Qwen 只复核尚未解决的主张及其相关证据。
6. 每轮按新增、更新、合并、解决和剩余数量汇报变化，并从当前证据关系重新计算健康度；没有变化时明确标记为已收敛。

GitHub Pages 云端版跳过第 3 步，首次 Qwen 调用直接从已提取正文生成待人工确认的候选主张；本地完整版仍按上述顺序运行 OpenVINO 初审和 Qwen 复核。

评分是材料审查进度，不代表事实真伪的概率。总分按覆盖度 35%、一致性 25%、时间信息 15%、复核完成度 25% 加权；每条主张再按核心 2、高 1.5、普通 1 加权。支持摘录必须能在上传的原文件中找到，并由人确认关系，否则只是待核对线索，不计分。没有有效支持时，一致性也为 0；时间信息只看支持摘录或同一段落里的日期；人工确认原文关系后计半额复核进度，主张最终审阅完成后计满。页面上的“评分怎么算”可展开查看当前四项数值与公式。云端复核会发送未解决主张和上传原文片段，并在入档前逐字核验摘录来源。

- 百炼 Qwen：点击页面右下角“模型与 OCR 设置”，填写用户自己的 API Key；也可复制 `.env.example` 为 `.env.local`。
- TextIn xParse：设置页可管理用户自己的 App ID 与 Secret Code。图片和没有可用文本层的扫描 PDF 会整份经本机代理提交给 xParse，返回的 OCR Markdown 会继续参与主张与证据核验；默认使用 `--api auto` 免费优先路由，不会自动切换到付费模式。
- OpenVINO：参见 [`local-ai/README.md`](local-ai/README.md)，推荐 Qwen3-4B INT4、CPU 设备。
- PDF：带有可用文本层的普通 PDF 由 PDF.js 在浏览器内解析，不上传原文件；没有可用文本层的扫描 PDF 会转交 TextIn xParse OCR。

## 项目结构

- `src/`：Web 产品与证据领域逻辑；
- `server/`：百炼 Qwen、TextIn xParse 与本机凭证安全代理；
- `local-ai/`：OpenVINO 本地推理服务；
- `tests/e2e/`：Chrome 主流程与移动端测试；
- `submission/`：作品封面、体验说明与 AI 实践佐证。
- `submission-textin/`：TextIn xParse 赛道说明书、真实调用记录与 WorkBuddy 开发过程证据；
- `scripts/package_dual_submissions.ps1`：分别生成并校验天猫 AI 与 TextIn xParse 两个作品包。

输出用于辅助整理与核验，不替代人工学术判断。
