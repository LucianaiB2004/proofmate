from __future__ import annotations

import argparse
from datetime import datetime, timezone
from importlib.metadata import version
import json
import os
import platform
import sys
import threading
import time
from statistics import median
from pathlib import Path
from typing import Callable


def run_benchmark(runtime, text: str, sample_rss: Callable[[], float], warm_runs: int = 3) -> dict:
    samples = [sample_rss()]
    stop = threading.Event()

    def sample() -> None:
        while not stop.wait(0.05):
            samples.append(sample_rss())

    sampler = threading.Thread(target=sample, daemon=True)
    sampler.start()
    try:
        started = time.perf_counter()
        cold = runtime.analyze(text)
        cold_seconds = time.perf_counter() - started
        warm_samples = []
        for _ in range(warm_runs):
            started = time.perf_counter()
            warm = runtime.analyze(text)
            warm_samples.append(round(time.perf_counter() - started, 2))
    finally:
        stop.set()
        sampler.join()
        samples.append(sample_rss())
    return {
        "cold": {"seconds": round(cold_seconds, 2)},
        "warm": {"median_seconds": round(median(warm_samples), 2), "samples_seconds": warm_samples},
        "peak_rss_mb": round(max(samples), 1),
        "output": warm["summary"],
        "signals": warm["signals"],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Benchmark ProofMate OpenVINO inference.")
    parser.add_argument("--model-path", default="local-ai/models/qwen3-4b-int4")
    parser.add_argument("--output", default="local-ai/benchmark-result.json")
    parser.add_argument("--text", default="七天试点数据显示校园能耗下降31%，但没有同周期对照数据。")
    args = parser.parse_args()

    import psutil

    sys.path.insert(0, str(Path(__file__).parents[1] / "local-ai"))
    os.environ["PROOFMATE_MODEL_PATH"] = args.model_path
    os.environ["PROOFMATE_DEVICE"] = "CPU"
    from app.model_runtime import ModelRuntime

    process = psutil.Process()
    report = run_benchmark(ModelRuntime(), args.text, lambda: process.memory_info().rss / 1024 / 1024)
    model_root = Path(args.model_path)
    report.update({
        "model": "OpenVINO/Qwen3-4B-int4-ov",
        "device": "CPU",
        "processor": platform.processor(),
        "python": platform.python_version(),
        "measured_at_utc": datetime.now(timezone.utc).isoformat(),
        "model_revision": "b467368d16b75df14055562fe927ae8e1f15f7ef",
        "versions": {name: version(name) for name in ("openvino", "openvino-genai", "openvino-tokenizers", "psutil")},
        "input": args.text,
        "output_characters": len(report["output"]),
        "model_size_gb": round(sum(item.stat().st_size for item in model_root.rglob("*") if item.is_file()) / 1024**3, 2),
    })
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
