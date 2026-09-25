# 真源 ProofMate

天猫 AI 黑客松高校挑战赛作品：基于 Qwen × OpenVINO 的端云协同可信证据系统。百炼 `qwen-plus` 与 OpenVINO Qwen3-4B INT4 均已完成真实联调。

## 快速开始

```powershell
npm install
npm run dev
```

打开终端显示的地址，点击“体验示例项目”。无需登录、API Key 或本地模型。

## 验证

```powershell
npm test
npm run build
npm run test:e2e
python -m pytest local-ai/tests -q
pwsh -File scripts/package_submission.ps1 -VerifyOnly
```

## 可选 AI 能力

- 百炼 Qwen：复制 `.env.example` 为 `.env.local`，填写 `DASHSCOPE_API_KEY`。
- OpenVINO：参见 [`local-ai/README.md`](local-ai/README.md)，推荐 Qwen3-4B INT4、CPU 设备。
- PDF：正文在浏览器内由 PDF.js 解析，原始文件无需上传。

## 项目结构

- `src/`：Web 产品与证据领域逻辑；
- `server/`：百炼 Qwen 安全代理；
- `local-ai/`：OpenVINO 本地推理服务；
- `tests/e2e/`：Chrome 主流程与移动端测试；
- `submission/`：封面、报名文案、演示脚本和 AI 实践佐证。

输出用于辅助整理与核验，不替代人工学术判断。
