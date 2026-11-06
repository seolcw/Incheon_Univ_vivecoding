r"""실행: .venv\Scripts\python -m uvicorn main:app --port 8000"""

from datetime import datetime, timedelta, timezone
import os
from typing import Literal

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from starlette.exceptions import HTTPException

from errors import (
    ApiError,
    api_error_handler,
    http_error_handler,
    unexpected_error_handler,
    validation_error_handler,
)
from meetup_repo import storage_mode

KST = timezone(timedelta(hours=9), name="Asia/Seoul")
VERSION = "0.1.0"


class HealthResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    status: Literal["ok"]
    storage: Literal["memory", "firestore"]
    time: str
    version: str


def create_app() -> FastAPI:
    application = FastAPI(title="빈강 API", version=VERSION)
    selected_storage = storage_mode()
    origins = [
        value.strip().rstrip("/")
        for value in os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(",")
        if value.strip()
    ]
    application.state.cors_origins = origins
    application.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type"],
    )
    application.add_exception_handler(ApiError, api_error_handler)
    application.add_exception_handler(RequestValidationError, validation_error_handler)
    application.add_exception_handler(HTTPException, http_error_handler)
    application.add_exception_handler(Exception, unexpected_error_handler)

    @application.get("/api/health", response_model=HealthResponse)
    def health() -> HealthResponse:
        # 생존 확인용이며 Firestore 접속 성공을 의미하지 않는다.
        return HealthResponse(
            status="ok", storage=selected_storage,
            time=datetime.now(KST).isoformat(timespec="seconds"), version=VERSION,
        )

    return application


app = create_app()
