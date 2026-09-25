from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import Callable


MODEL_ID = "OpenVINO/Qwen3-4B-int4-ov"
MODEL_REVISION = "b467368d16b75df14055562fe927ae8e1f15f7ef"
OUTPUT = Path("local-ai/models/qwen3-4b-int4")
ESTIMATED_GB = 4.5


def download_model(output: Path, snapshot_download: Callable[..., object]) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    snapshot_download(MODEL_ID, local_dir=output, revision=MODEL_REVISION)


def main() -> int:
    parser = argparse.ArgumentParser(description="Download and export the optional ProofMate OpenVINO model.")
    parser.add_argument("--accept-download", action="store_true", help="confirm the multi-gigabyte model download")
    args = parser.parse_args()

    print(f"Model: {MODEL_ID}\nOutput: {OUTPUT}\nEstimated temporary disk requirement: at least {ESTIMATED_GB * 2:.0f} GB")
    if not args.accept_download:
        print("No files changed. Re-run with --accept-download after reviewing the size.")
        return 2
    try:
        from huggingface_hub import snapshot_download
    except ImportError:
        print('Missing huggingface_hub. Install with: python -m pip install openvino-genai huggingface-hub', file=sys.stderr)
        return 3

    download_model(OUTPUT, snapshot_download)
    print("Official OpenVINO INT4 model download complete.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
