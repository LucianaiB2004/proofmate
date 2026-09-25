from pathlib import Path

from app.config import Settings
from app.model_runtime import ModelRuntime


class FakePipeline:
    def __init__(self):
        self.prompt = ""
        self.options = {}

    def generate(self, prompt, **options):
        self.prompt = prompt
        self.options = options
        return "<think>内部推理</think>\n主张：节能数据需要对照组。"


class EvidencePipeline(FakePipeline):
    def generate(self, prompt, **options):
        self.prompt = prompt
        self.options = options
        return "关系：支持\n原文：模型版本：Qwen3-4B INT4\n理由：材料直接给出了部署模型版本\n置信度：91"


def test_analysis_disables_thinking_and_returns_only_final_answer(tmp_path: Path):
    runtime = ModelRuntime(Settings(model_path=tmp_path, device="CPU"))
    pipeline = FakePipeline()
    runtime._pipeline = pipeline

    result = runtime.analyze("七天节能 31%，但没有对照组。")

    assert "/no_think" in pipeline.prompt
    assert pipeline.options == {"max_new_tokens": 420, "do_sample": False}
    assert "核心结论" in pipeline.prompt
    assert "证据依据" in pipeline.prompt
    assert "风险与边界" in pipeline.prompt
    assert "下一步补证" in pipeline.prompt
    assert result["summary"] == "主张：节能数据需要对照组。"


def test_evidence_assessment_parses_relation_excerpt_reason_and_confidence(tmp_path: Path):
    runtime = ModelRuntime(Settings(model_path=tmp_path, device="CPU"))
    pipeline = EvidencePipeline()
    runtime._pipeline = pipeline

    result = runtime.assess_evidence("部署记录包含模型版本号", "模型版本：Qwen3-4B INT4", "部署清单.md")

    assert result == {
        "relation": "support",
        "excerpt": "模型版本：Qwen3-4B INT4",
        "reason": "材料直接给出了部署模型版本",
        "confidence": 0.91,
    }
    assert "只允许输出支持、冲突或无关" in pipeline.prompt
    assert pipeline.options == {"max_new_tokens": 180, "do_sample": False}
