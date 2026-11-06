"""API 계약의 공통 오류 응답과 예외 핸들러."""

import logging

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException

logger = logging.getLogger(__name__)


class ApiError(Exception):
    def __init__(self, code: str, status: int, message: str):
        super().__init__(message)
        self.code = code
        self.status = status
        self.message = message


def error_response(code: str, status: int, message: str, headers=None) -> JSONResponse:
    return JSONResponse(
        status_code=status,
        content={"error": {"code": code, "message": message}},
        headers=headers,
    )


async def api_error_handler(request: Request, exc: ApiError) -> JSONResponse:
    return error_response(exc.code, exc.status, exc.message)


async def validation_error_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    # 입력값이나 Pydantic 내부 오류를 그대로 노출하지 않는다.
    return error_response("VALIDATION_ERROR", 400, "입력값의 형식과 필수 항목을 확인해 주세요.")


async def http_error_handler(request: Request, exc: HTTPException) -> JSONResponse:
    if exc.status_code == 404:
        return error_response("NOT_FOUND", 404, "요청한 경로 또는 데이터를 찾을 수 없어요.", exc.headers)
    if exc.status_code == 403:
        return error_response("FORBIDDEN", 403, "이 요청을 수행할 권한이 없어요.", exc.headers)
    if exc.status_code < 500:
        return error_response("VALIDATION_ERROR", 400, "요청 방법과 입력값을 확인해 주세요.", exc.headers)
    return error_response("INTERNAL_ERROR", 500, "서버 오류가 발생했어요. 잠시 후 다시 시도해 주세요.")


async def unexpected_error_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error("처리하지 못한 서버 오류", exc_info=(type(exc), exc, exc.__traceback__))
    response = error_response("INTERNAL_ERROR", 500, "서버 오류가 발생했어요. 잠시 후 다시 시도해 주세요.")
    # ServerErrorMiddleware가 CORS 미들웨어 밖에서 만드는 500 응답에도 적용한다.
    origin = request.headers.get("origin")
    if origin and origin in request.app.state.cors_origins:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Vary"] = "Origin"
    return response
