# OpenVINO 实机测试

- 日期：2026-09-25
- 设备：AMD Ryzen 7 5800H，8 核 16 线程，13.9GB 内存
- 模型：`OpenVINO/Qwen3-4B-int4-ov`
- 模型格式：OpenVINO IR，INT4，2.13GB
- 推理设备：CPU
- Python：3.12.14
- OpenVINO / OpenVINO GenAI：2026.4

## 实测结果

| 指标 | 结果 |
|---|---:|
| 首次加载并分析 | 16.37 秒 |
| 热启动分析 | 6.48 秒 |
| 进程峰值内存 | 4280.3MB |
| FastAPI 健康状态 | `service_ready` |
| 前端代理分析状态 | `service_ready` |

输入为“七天试点数据显示校园能耗下降 31%，但没有同周期对照数据”。端侧模型输出：结论存在，但缺乏同周期对照，无法确认下降是否真实或可推广，并建议补充非试点校园同期能耗数据。

原始机器可读结果保存在 `local-ai/benchmark-result.json`；可使用 `scripts/benchmark_openvino.py` 复测。
