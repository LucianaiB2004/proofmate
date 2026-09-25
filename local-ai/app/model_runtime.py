from __future__ import annotations

import hashlib
import re
from pathlib import Path
from typing import Any

from .config import Settings, settings


class ModelRuntime:
    """Lazy OpenVINO GenAI wrapper that keeps the HTTP service usable without a model."""

    def __init__(self, config: Settings = settings):
        self.config = config
        self._pipeline: Any | None = None
        self._load_error: str | None = None

    def _load(self) -> Any:
        if self._pipeline is not None:
            return self._pipeline
        if not Path(self.config.model_path).exists():
            raise FileNotFoundError(f"model path not found: {self.config.model_path}")
        try:
            import openvino_genai  # type: ignore

            self._pipeline = openvino_genai.LLMPipeline(str(self.config.model_path), self.config.device)
            return self._pipeline
        except Exception as exc:
            self._load_error = str(exc)
            raise

    def status(self) -> dict[str, str]:
        base = {
            "model": self.config.model_name,
            "device": self.config.device,
            "quantization": self.config.quantization,
        }
        if not self.config.model_path.exists():
            return {**base, "state": "model_unavailable", "detail": "模型尚未下载；演示模式不受影响。"}
        if self._load_error:
            return {**base, "state": "inference_failed", "detail": self._load_error}
        return {**base, "state": "service_ready", "detail": "模型文件已发现，将在首次请求时加载。"}

    def device_info(self) -> dict[str, str]:
        try:
            import openvino as ov  # type: ignore

            core = ov.Core()
            device = self.config.device
            resolved = device if device in core.available_devices else "CPU"
            return {"device": resolved, "device_name": str(core.get_property(resolved, "FULL_DEVICE_NAME")).strip()}
        except Exception:
            return {"device": self.config.device, "device_name": self.config.device}

    def analyze(self, text: str) -> dict[str, Any]:
        pipeline = self._load()
        prompt = (
            "你是真源 ProofMate 的端侧证据审阅员。只依据给定材料完成一次认真、可执行的审阅，"
            "不要补造材料中没有的事实，也不要展示推理过程。请使用简洁中文，按以下四段输出：\n"
            "【核心结论】提取 1 至 3 条最需要核验的主张，并保留关键数字；\n"
            "【证据依据】指出材料中已经出现的依据，以及它能证明到什么程度；\n"
            "【风险与边界】说明冲突、缺口、时效性或外推风险；\n"
            "【下一步补证】给出 2 至 4 条具体可执行动作，说明需要什么材料。\n"
            "总长度控制在 300 至 500 个中文字符。 /no_think\n\n材料：" + text
        )
        output = pipeline.generate(prompt, max_new_tokens=420, do_sample=False)
        summary = re.sub(r"<think>.*?</think>", "", str(output), flags=re.DOTALL).strip()
        return {"summary": summary, "signals": ["openvino-local-inference"]}

    def fingerprint(self, text: str) -> list[float]:
        # Deterministic content fingerprint for deduplication, not a semantic embedding.
        digest = hashlib.sha256(text.encode("utf-8")).digest()
        return [round((byte / 127.5) - 1, 6) for byte in digest]
