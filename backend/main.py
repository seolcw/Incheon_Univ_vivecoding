"""FastAPI entry point: uvicorn main:app --host 0.0.0.0 --port 8000."""

import logging
import os
from datetime import datetime

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException

if __package__:
    from .errors import ApiError
    from .core.availability import SEOUL
    from .core.routes_rooms import router as rooms_router
    from .core.routes_chat import router as chat_router
else:
    from errors import ApiError
    from core.availability import SEOUL
    from core.routes_rooms import router as rooms_router
    from core.routes_chat import router as chat_router

app = FastAPI(title="빈강 강의실 검색 API", version="0.1.0",
              description="건물·층·시각·최소 여유 시간으로 강의실을 조회합니다.")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip().rstrip("/") for origin in
                   os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(",")
                   if origin.strip()],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)


def error_response(code: str, status: int, message: str):
    return JSONResponse(status_code=status, content={"error": {"code": code, "message": message}})


@app.exception_handler(ApiError)
def api_error_handler(request: Request, error: ApiError):
    return error_response(error.code, error.status, error.message)


@app.exception_handler(RequestValidationError)
def validation_error_handler(request: Request, error: RequestValidationError):
    return error_response("VALIDATION_ERROR", 400, "검색 조건의 형식과 범위를 확인해 주세요.")


@app.exception_handler(HTTPException)
def http_error_handler(request: Request, error: HTTPException):
    code = "NOT_FOUND" if error.status_code == 404 else "VALIDATION_ERROR"
    message = "요청한 API를 찾을 수 없어요." if error.status_code == 404 else "요청을 처리할 수 없어요."
    return error_response(code, error.status_code, message)


@app.exception_handler(Exception)
def unexpected_error_handler(request: Request, error: Exception):
    logging.getLogger(__name__).error("Classroom query failed", exc_info=error)
    return error_response("INTERNAL_ERROR", 500, "강의실 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.")


@app.get("/api/health", tags=["상태"])
def health():
    return {"status": "ok", "storage": os.environ.get("STORAGE", "firestore"),
            "time": datetime.now(SEOUL).isoformat(), "version": "0.1.0"}


app.include_router(rooms_router)
app.include_router(chat_router, tags=["채팅 계약 스텁 - AI 미구현"])
