# ProofMate Local AI

这是“真源 ProofMate”的可选端侧服务。Web Demo 不依赖它也能完整运行；安装模型后，服务使用 OpenVINO GenAI 在本机 CPU 上执行 Qwen3-4B INT4 推理。

## 启动服务

```powershell
python -m pip install -e "local-ai[dev]"
python -m uvicorn app.main:app --app-dir local-ai --host 127.0.0.1 --port 8787
```

健康检查：`http://127.0.0.1:8787/health`

## 可选模型

模型体积为数 GB，下载不会自动发生。先安装 `optimum-intel` 与 `openvino-genai`，再显式运行：

```powershell
python scripts/download_openvino_model.py --accept-download
```

可用 `PROOFMATE_MODEL_PATH` 和 `PROOFMATE_DEVICE` 覆盖默认位置与设备。当前电脑为 AMD CPU，因此默认使用 OpenVINO CPU 后端；不要选择 Intel NPU。
