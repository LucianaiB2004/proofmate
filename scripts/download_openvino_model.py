from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path


MODEL_ID = "Qwen/Qwen3-4B"
OUTPUT = Path("local-ai/models/qwen3-4b-int4")
ESTIMATED_GB = 4.5


def main() -> int:
    parser = argparse.ArgumentParser(description="Download and export the optional ProofMate OpenVINO model.")
    parser.add_argument("--accept-download", action="store_true", help="confirm the multi-gigabyte model download")
    args = parser.parse_args()

    print(f"Model: {MODEL_ID}\nOutput: {OUTPUT}\nEstimated temporary disk requirement: at least {ESTIMATED_GB * 2:.0f} GB")
    if not args.accept_download:
        print("No files changed. Re-run with --accept-download after reviewing the size.")
        return 2
    if shutil.which("optimum-cli") is None:
        print('Missing optimum-cli. Install with: python -m pip install "optimum-intel[openvino]" openvino-genai', file=sys.stderr)
        return 3

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    command = [
        "optimum-cli", "export", "openvino", "--model", MODEL_ID,
        "--task", "text-generation-with-past", "--weight-format", "int4", str(OUTPUT),
    ]
    print("Running:", " ".join(command))
    subprocess.run(command, check=True)
    print("OpenVINO model export complete.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
