from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path


SCRIPT = Path(__file__).parents[2] / "scripts" / "benchmark_openvino.py"
SPEC = spec_from_file_location("benchmark_openvino", SCRIPT)
MODULE = module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(MODULE)


class FakeRuntime:
    def analyze(self, text):
        return {"summary": f"已分析：{text}", "signals": ["openvino-local-inference"]}


def test_benchmark_reports_cold_warm_latency_memory_and_output():
    report = MODULE.run_benchmark(FakeRuntime(), "证据材料", sample_rss=lambda: 321.5)
    assert report["cold"]["seconds"] >= 0
    assert report["warm"]["seconds"] >= 0
    assert report["peak_rss_mb"] == 321.5
    assert report["output"] == "已分析：证据材料"
