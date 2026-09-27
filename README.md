# 真源 ProofMate

天猫 AI 黑客松高校挑战赛作品：基于 Qwen × OpenVINO 的端云协同可信证据系统。百炼 `qwen-plus` 与 OpenVINO Qwen3-4B INT4 均已完成真实联调；百炼发现只有在带原文摘录和材料来源、并经人工确认后，才会进入主张—证据关系档案。

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
pwsh -File scripts/package_submission.ps1 -VerifyOnly
```

## 可选 AI 能力

真实材料按固定顺序形成审查闭环：

1. 浏览器读取文本和文本型 PDF；图片或扫描 PDF 通过 TextIn xParse OCR 提取文字。文件提取不是模型分析。
2. 系统清理 Markdown/HTML 控制符，并把正文整理成可定位的材料片段。
3. OpenVINO Qwen3-4B INT4 执行第一遍端侧初审，生成带依据、风险边界和补证建议的候选主张。
4. 用户确认候选后写入档案；重复结果会合并，不会不断追加。
5. 百炼 Qwen 只复核尚未解决的主张及其相关证据。
6. 每轮按新增、更新、合并、解决和剩余数量汇报变化，并从当前证据关系重新计算健康度；没有变化时明确标记为已收敛。

评分是材料审查进度，不代表事实真伪的概率。总分按覆盖度 35%、一致性 25%、时间信息 15%、复核完成度 25% 加权；每条主张再按核心 2、高 1.5、普通 1 加权。支持摘录必须能在上传的原文件中找到，并由人确认关系，否则只是待核对线索，不计分。没有有效支持时，一致性也为 0；时间信息只看支持摘录或同一段落里的日期；人工确认原文关系后计半额复核进度，主张最终审阅完成后计满。页面上的“评分怎么算”可展开查看当前四项数值与公式。云端复核会发送未解决主张和上传原文片段，并在入档前逐字核验摘录来源。

- 百炼 Qwen：点击页面右下角“模型与 OCR 设置”，填写用户自己的 API Key；也可复制 `.env.example` 为 `.env.local`。
- TextIn xParse：设置页可管理用户自己的 App ID 与 Secret Code。图片经本机代理交给 xParse，返回的 OCR Markdown 会继续参与主张与证据核验；默认使用 `--api auto` 免费优先路由，不会自动切换到付费模式。
- OpenVINO：参见 [`local-ai/README.md`](local-ai/README.md)，推荐 Qwen3-4B INT4、CPU 设备。
- PDF：正文在浏览器内由 PDF.js 解析，原始文件无需上传。

## 项目结构

- `src/`：Web 产品与证据领域逻辑；
- `server/`：百炼 Qwen、TextIn xParse 与本机凭证安全代理；
- `local-ai/`：OpenVINO 本地推理服务；
- `tests/e2e/`：Chrome 主流程与移动端测试；
- `submission/`：封面、报名文案、演示脚本和 AI 实践佐证。

输出用于辅助整理与核验，不替代人工学术判断。
