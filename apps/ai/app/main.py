"""
RMSM AI service entrypoint.

Module 001 scope: infrastructure only. No AI/business logic — the
assistant, analysis engine, and scanner inference land starting Module 013.
This file exists to prove the service boots, is configured, and is
reachable for health checks.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings

app = FastAPI(
    title="RMSM AI Service",
    version="0.1.0",
    description="AI Trading Assistant / Analysis Engine microservice",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.app_env == "local" else [],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def liveness() -> dict:
    return {"status": "ok"}


@app.get("/health/ready")
def readiness() -> dict:
    # No external dependencies wired up yet in Module 001 (no DB access
    # from this service by design — see dependency rules in Module 000 docs).
    return {"status": "ok", "checks": {}}
