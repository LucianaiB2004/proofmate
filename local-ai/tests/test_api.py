from fastapi.testclient import TestClient

from app.main import create_app


class MissingRuntime:
    def status(self):
        return {
            "state": "model_unavailable",
            "model": "Qwen3-4B INT4 OpenVINO",
            "device": "CPU",
            "quantization": "INT4",
            "detail": "model path not found",
        }

    def analyze(self, text):
        raise FileNotFoundError("model path not found")

    def fingerprint(self, text):
        raise FileNotFoundError("model path not found")

    def assess_evidence(self, claim, evidence, source):
        raise FileNotFoundError("model path not found")


class ReadyRuntime(MissingRuntime):
    def status(self):
        return {**super().status(), "state": "service_ready", "detail": "model loaded"}

    def analyze(self, text):
        return {"summary": text[:20], "signals": ["local-semantic-pass"]}

    def fingerprint(self, text):
        return [0.1, 0.2, 0.3]

    def assess_evidence(self, claim, evidence, source):
        return {"relation": "support", "excerpt": "模型版本：Qwen3-4B INT4", "reason": "材料直接给出了模型版本", "confidence": 0.91}

    def device_info(self):
        return {"device": "GPU.0", "device_name": "NVIDIA GeForce RTX 3050 Laptop GPU"}


class BrokenRuntime(ReadyRuntime):
    def analyze(self, text):
        raise RuntimeError("backend crashed")


def test_model_endpoint_distinguishes_missing_model():
    client = TestClient(create_app(MissingRuntime()))
    response = client.get("/v1/local/model")
    assert response.status_code == 200
    assert response.json()["state"] == "model_unavailable"


def test_health_is_ready_even_when_optional_model_is_missing():
    client = TestClient(create_app(MissingRuntime()))
    assert client.get("/health").json() == {"state": "service_ready", "model_state": "model_unavailable"}


def test_health_exposes_the_inference_device_when_available():
    client = TestClient(create_app(ReadyRuntime()))
    assert client.get("/health").json() == {
        "state": "service_ready",
        "model_state": "service_ready",
        "device": "GPU.0",
        "device_name": "NVIDIA GeForce RTX 3050 Laptop GPU",
    }


def test_analyze_rejects_empty_text():
    client = TestClient(create_app(ReadyRuntime()))
    response = client.post("/v1/local/analyze", json={"text": "   "})
    assert response.status_code == 422


def test_ready_runtime_returns_local_analysis_and_fingerprint():
    client = TestClient(create_app(ReadyRuntime()))
    assert client.post("/v1/local/analyze", json={"text": "可验证的项目主张"}).json()["state"] == "service_ready"
    assert client.post("/v1/local/fingerprint", json={"text": "证据"}).json()["fingerprint"] == [0.1, 0.2, 0.3]


def test_evidence_endpoint_returns_a_structured_relation():
    client = TestClient(create_app(ReadyRuntime()))
    response = client.post("/v1/local/evidence", json={
        "claim": "部署记录包含模型版本号",
        "evidence": "模型版本：Qwen3-4B INT4",
        "source": "部署清单.md",
    })
    assert response.status_code == 200
    assert response.json() == {
        "state": "service_ready",
        "result": {"relation": "support", "excerpt": "模型版本：Qwen3-4B INT4", "reason": "材料直接给出了模型版本", "confidence": 0.91},
    }


def test_inference_failure_is_distinct_from_missing_model():
    client = TestClient(create_app(BrokenRuntime()))
    response = client.post("/v1/local/analyze", json={"text": "触发推理"})
    assert response.status_code == 503
    assert response.json()["detail"]["state"] == "inference_failed"
