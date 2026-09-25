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

    def assess_evidence(self, claim: str, evidence: str, source: str) -> dict[str, Any]:
        pipeline = self._load()
        prompt = (
            "你是真源 ProofMate 的端侧证据核验员。判断候选材料与主张之间的关系。"
            "只允许输出支持、冲突或无关，不得因为出现相同关键词就判为支持。"
            "原文必须逐字摘自材料，不要编造。严格按四行输出：\n"
            "关系：支持/冲突/无关\n原文：材料中的最关键一句\n理由：一句话说明判断依据\n置信度：0到100的整数"
            f"\n/no_think\n\n主张：{claim}\n来源：{source}\n候选材料：{evidence[:12000]}"
        )
        output = pipeline.generate(prompt, max_new_tokens=180, do_sample=False)
        result = re.sub(r"<think>.*?</think>", "", str(output), flags=re.DOTALL).strip()
        fields: dict[str, str] = {}
        for label in ("关系", "原文", "理由", "置信度"):
            match = re.search(rf"{label}[：:]\s*(.+)", result)
            fields[label] = match.group(1).strip() if match else ""
        relation = {"支持": "support", "冲突": "conflict", "无关": "unrelated"}.get(fields["关系"], "unrelated")
        excerpt = fields["原文"]
        if not excerpt or excerpt not in evidence:
            excerpt = next((part.strip() for part in re.split(r"[。！？\n]", evidence) if part.strip()), evidence[:240].strip())
        confidence_match = re.search(r"\d+", fields["置信度"])
        confidence = min(100, max(0, int(confidence_match.group()))) / 100 if confidence_match else 0.5
        return {"relation": relation, "excerpt": excerpt[:300], "reason": fields["理由"] or "端侧模型未提供判断理由。", "confidence": confidence}
