from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path


SCRIPT = Path(__file__).parents[2] / "scripts" / "download_openvino_model.py"
SPEC = spec_from_file_location("download_openvino_model", SCRIPT)
MODULE = module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(MODULE)


def test_uses_official_preconverted_openvino_model():
    assert MODULE.MODEL_ID == "OpenVINO/Qwen3-4B-int4-ov"
    assert MODULE.OUTPUT == Path("local-ai/models/qwen3-4b-int4")


def test_download_delegates_to_snapshot_download(tmp_path):
    calls = []

    def fake_snapshot(model_id, local_dir):
        calls.append((model_id, local_dir))

    target = tmp_path / "model"
    MODULE.download_model(target, fake_snapshot)
    assert calls == [("OpenVINO/Qwen3-4B-int4-ov", target)]
