from __future__ import annotations

import hashlib
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

    def analyze(self, text: str) -> dict[str, Any]:
        pipeline = self._load()
        prompt = (
            "你是真源 ProofMate 的端侧证据分析器。只依据给定文本，"
            "提取一条可验证主张、潜在风险和需要的证据，使用简洁中文回答。\n\n材料：" + text
        )
        output = pipeline.generate(prompt, max_new_tokens=220)
        return {"summary": str(output), "signals": ["openvino-local-inference"]}

    def fingerprint(self, text: str) -> list[float]:
        # Deterministic content fingerprint for deduplication, not a semantic embedding.
        digest = hashlib.sha256(text.encode("utf-8")).digest()
        return [round((byte / 127.5) - 1, 6) for byte in digest]
