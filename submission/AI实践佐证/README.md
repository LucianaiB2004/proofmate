# AI 实践佐证索引

本文件夹用于证明作品中的 AI 能力真实存在且可验证。

1. `prompts.md`：端侧和云端核心提示词及结构化输出约束。
2. `关键代码路径.md`：Qwen 适配器、OpenVINO 服务、状态降级和证据算法的源码位置。
3. `真实百炼联调记录.md`：真实 `qwen-plus` 请求、结构化输出和修复记录（不含密钥）。
4. `OpenVINO实机测试.md`：Qwen3-4B INT4 在 Ryzen 7 5800H 上的真实加载、延迟与内存数据。
3. `测试记录.md`：自动化验证范围与最近一次结果。

作品源码中可重点检查：

- `server/qwenClient.ts`：百炼 Qwen OpenAI-compatible API 适配器；
- `local-ai/app/model_runtime.py`：OpenVINO GenAI 延迟加载与 Qwen3-4B 推理；
- `local-ai/app/main.py`：本地服务 API 与错误状态；
- `src/domain/audit.ts`：透明、确定性的证据评分；
- `src/data/demoProject.ts`：本届原创样例及可核验来源关系。

演示模式不是模拟真实联网状态：它明确显示“尚未连接实时模型”，用于保证初赛评审零配置复现。
