from typing import Any, Protocol

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field, field_validator

from .model_runtime import ModelRuntime


class Runtime(Protocol):
    def status(self) -> dict[str, Any]: ...
    def analyze(self, text: str) -> dict[str, Any]: ...
    def fingerprint(self, text: str) -> list[float]: ...


class TextRequest(BaseModel):
    text: str = Field(max_length=50_000)

    @field_validator("text")
    @classmethod
    def reject_blank_text(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("text must not be blank")
        return value.strip()


def create_app(runtime: Runtime | None = None) -> FastAPI:
    model_runtime = runtime or ModelRuntime()
    app = FastAPI(title="ProofMate Local AI", version="0.1.0")

    @app.get("/health")
    def health() -> dict[str, str]:
        status = model_runtime.status()
        result = {"state": "service_ready", "model_state": status["state"]}
        device_info = getattr(model_runtime, "device_info", None)
        if callable(device_info):
            result.update(device_info())
        return result

    @app.get("/v1/local/model")
    def model() -> dict[str, Any]:
        return model_runtime.status()

    @app.post("/v1/local/analyze")
    def analyze(request: TextRequest) -> dict[str, Any]:
        try:
            return {"state": "service_ready", "result": model_runtime.analyze(request.text)}
        except FileNotFoundError as exc:
            raise HTTPException(status_code=503, detail={"state": "model_unavailable", "message": str(exc)}) from exc
        except Exception as exc:
            raise HTTPException(status_code=503, detail={"state": "inference_failed", "message": str(exc)}) from exc

    @app.post("/v1/local/fingerprint")
    def fingerprint(request: TextRequest) -> dict[str, Any]:
        try:
            return {"state": "service_ready", "fingerprint": model_runtime.fingerprint(request.text)}
        except FileNotFoundError as exc:
            raise HTTPException(status_code=503, detail={"state": "model_unavailable", "message": str(exc)}) from exc
        except Exception as exc:
            raise HTTPException(status_code=503, detail={"state": "inference_failed", "message": str(exc)}) from exc

    return app


app = create_app()
