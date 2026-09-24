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

    def embed(self, text):
        raise FileNotFoundError("model path not found")


class ReadyRuntime(MissingRuntime):
    def status(self):
        return {**super().status(), "state": "service_ready", "detail": "model loaded"}

    def analyze(self, text):
        return {"summary": text[:20], "signals": ["local-semantic-pass"]}

    def embed(self, text):
        return [0.1, 0.2, 0.3]


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


def test_analyze_rejects_empty_text():
    client = TestClient(create_app(ReadyRuntime()))
    response = client.post("/v1/local/analyze", json={"text": "   "})
    assert response.status_code == 422


def test_ready_runtime_returns_local_analysis_and_embedding():
    client = TestClient(create_app(ReadyRuntime()))
    assert client.post("/v1/local/analyze", json={"text": "可验证的项目主张"}).json()["state"] == "service_ready"
    assert client.post("/v1/local/embed", json={"text": "证据"}).json()["vector"] == [0.1, 0.2, 0.3]


def test_inference_failure_is_distinct_from_missing_model():
    client = TestClient(create_app(BrokenRuntime()))
    response = client.post("/v1/local/analyze", json={"text": "触发推理"})
    assert response.status_code == 503
    assert response.json()["detail"]["state"] == "inference_failed"
