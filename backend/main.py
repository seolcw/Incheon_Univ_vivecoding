r"""실행: .venv\Scripts\python -m uvicorn main:app --port 8000"""

from datetime import datetime, timedelta, timezone
from contextlib import asynccontextmanager
import logging
import os
from typing import Literal

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from starlette.exceptions import HTTPException
from starlette.concurrency import run_in_threadpool

from errors import (
    ApiError,
    api_error_handler,
    http_error_handler,
    unexpected_error_handler,
    validation_error_handler,
)
from campus_gateway import Campus, CoreCampus, DemoCampus
from meetup_repo import MeetupRepo, get_repo, storage_mode
from routers.meetups import router as meetups_router
from scripts.seed_demo import seed_memory

KST = timezone(timedelta(hours=9), name="Asia/Seoul")
VERSION = "0.1.0"


class HealthResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    status: Literal["ok"]
    storage: Literal["memory", "firestore"]
    time: str
    version: str


def create_app(*, repo: MeetupRepo | None = None, campus: Campus | None = None) -> FastAPI:
    selected_storage = storage_mode()
    campus_source = os.environ.setdefault("CAMPUS_SOURCE", "seed").strip().lower()
    if campus_source not in ("seed", "firestore", "demo"):
        raise ValueError("CAMPUS_SOURCE는 seed, firestore 또는 demo여야 합니다.")

    @asynccontextmanager
    async def lifespan(application: FastAPI):
        if campus_source != "demo":
            from core.seed_loader import load_campus
            await run_in_threadpool(load_campus)
        if selected_storage == "memory":
            if application.state.meetup_repo is None:
                application.state.meetup_repo = get_repo()
            seed_memory(application.state.meetup_repo, campus_source=campus_source)
        if campus_source == "demo":
            logging.getLogger(__name__).warning("CAMPUS_SOURCE=demo: 가상 301~304호만 사용하는 모임 API 시연입니다.")
        yield

    application = FastAPI(
        title="빈강 API" + (" · 4개 방 데모" if campus_source == "demo" else ""),
        version=VERSION, lifespan=lifespan,
        description="가상 강의실 301~304호의 모임 API 데모. 실제 시간표/B 로직 연동 전입니다." if campus_source == "demo" else "빈강 API",
    )
    application.state.meetup_repo = repo
    application.state.campus = campus if campus is not None else (DemoCampus() if campus_source == "demo" else CoreCampus())

    @application.middleware("http")
    async def campus_source_header(request, call_next):
        response = await call_next(request)
        response.headers["X-Campus-Source"] = campus_source
        return response
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
        expose_headers=["X-Campus-Source"],
    )
    application.add_exception_handler(ApiError, api_error_handler)
    application.add_exception_handler(RequestValidationError, validation_error_handler)
    application.add_exception_handler(HTTPException, http_error_handler)
    application.add_exception_handler(Exception, unexpected_error_handler)
    application.include_router(meetups_router)
    if campus_source != "demo":
        from core.routes_rooms import router as rooms_router
        application.include_router(rooms_router)
        from core.routes_chat import router as chat_router
        from core.chat_context import ChatContexts
        application.state.chat_contexts = ChatContexts()
        application.include_router(chat_router)

    @application.get("/api/health", response_model=HealthResponse)
    def health() -> HealthResponse:
        # 생존 확인용이며 Firestore 접속 성공을 의미하지 않는다.
        return HealthResponse(
            status="ok", storage=selected_storage,
            time=datetime.now(KST).isoformat(timespec="seconds"), version=VERSION,
        )

    return application


app = create_app()
