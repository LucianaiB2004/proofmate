# 真源 ProofMate

天猫 AI 黑客松高校挑战赛作品：基于 Qwen × OpenVINO 的端云协同可信证据系统。百炼 `qwen-plus` 与 OpenVINO Qwen3-4B INT4 均已完成真实联调；百炼发现只有在带原文摘录和材料来源、并经人工确认后，才会进入主张—证据关系档案。

## 快速开始

```powershell
npm install
npm run dev
```

打开终端显示的地址，点击“体验示例项目”，或从案例库选择公开材料练习案例。无需登录、API Key 或本地模型。若需解析图片或扫描材料，先安装官方 `xparse-cli`：

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
