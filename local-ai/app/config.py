from dataclasses import dataclass
from os import getenv
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    model_path: Path = Path(getenv("PROOFMATE_MODEL_PATH", "local-ai/models/qwen3-4b-int4"))
    device: str = getenv("PROOFMATE_DEVICE", "CPU")
    model_name: str = "Qwen3-4B INT4 OpenVINO"
    quantization: str = "INT4"


settings = Settings()
