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
| 首次加载并分析（本次样本） | 18.14 秒 |
| 热启动分析（3 次） | 8.75 / 8.43 / 9.09 秒 |
| 热启动中位数 | 8.75 秒 |
| 进程峰值内存（50ms 采样） | 4747.6MB |
| FastAPI 健康状态 | `service_ready` |
| 前端代理分析状态 | `service_ready` |

输入为“七天试点数据显示校园能耗下降 31%，但没有同周期对照数据”。端侧模型输出：结论存在，但缺乏同周期对照，无法确认下降是否真实或可推广，并建议补充非试点校园同期能耗数据。

模型固定到 revision `b467368d16b75df14055562fe927ae8e1f15f7ef`，OpenVINO 2026.4.0、OpenVINO GenAI 2026.4.0.0。以上是本机本次样本，不宣称为普遍性能。原始机器可读结果保存在 `local-ai/benchmark-result.json`；可使用 `scripts/benchmark_openvino.py` 复测。
