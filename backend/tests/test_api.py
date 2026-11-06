"""실제 앱 설정과 오류 계약을 확인한다. 검증용 라우트는 테스트 앱에만 둔다."""

from datetime import datetime, timedelta
import os
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

from errors import ApiError
from main import create_app


class ValidationBody(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    max_members: int


class ApiTests(unittest.TestCase):
    def setUp(self):
        with patch.dict(os.environ, {"STORAGE": "memory", "CORS_ORIGINS": " http://localhost:3000, https://demo.example/ "}):
            app = create_app()

        @app.post("/api/_test/validation")
        def validate(body: ValidationBody):
            return body

        @app.get("/api/_test/domain-error")
        def domain_error():
            raise ApiError("MEETUP_FULL", 409, "모임 정원이 찼어요.")

        @app.get("/api/_test/server-error")
        def server_error():
            raise RuntimeError("internal test detail")

        self.client = TestClient(app, raise_server_exceptions=False)
        self.addCleanup(self.client.close)

    def test_health_and_cors(self):
        response = self.client.get("/api/health", headers={"Origin": "http://localhost:3000"})
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(set(body), {"status", "storage", "time", "version"})
        self.assertEqual((body["status"], body["storage"], body["version"]), ("ok", "memory", "0.1.0"))
        self.assertEqual(datetime.fromisoformat(body["time"]).utcoffset(), timedelta(hours=9))
        self.assertEqual(response.headers["access-control-allow-origin"], "http://localhost:3000")
        preflight = self.client.options("/api/health", headers={
            "Origin": "https://demo.example", "Access-Control-Request-Method": "GET",
        })
        self.assertEqual(preflight.status_code, 200)
        self.assertEqual(preflight.headers["access-control-allow-origin"], "https://demo.example")
        denied = self.client.get("/api/health", headers={"Origin": "https://unlisted.example"})
        self.assertNotIn("access-control-allow-origin", denied.headers)

    def test_missing_path_and_validation_share_error_format(self):
        for response, status, code in [
            (self.client.get("/api/missing"), 404, "NOT_FOUND"),
            (self.client.post("/api/_test/validation", json={"maxMembers": "wrong"}), 400, "VALIDATION_ERROR"),
        ]:
            with self.subTest(code=code):
                self.assertEqual(response.status_code, status)
                self.assertEqual(set(response.json()), {"error"})
                self.assertEqual(set(response.json()["error"]), {"code", "message"})
                self.assertEqual(response.json()["error"]["code"], code)

    def test_domain_and_unexpected_errors(self):
        response = self.client.get("/api/_test/domain-error")
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json(), {"error": {"code": "MEETUP_FULL", "message": "모임 정원이 찼어요."}})
        with self.assertLogs("errors", level="ERROR"):
            response = self.client.get("/api/_test/server-error", headers={"Origin": "http://localhost:3000"})
        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json()["error"]["code"], "INTERNAL_ERROR")
        self.assertNotIn("internal test detail", response.text)
        self.assertEqual(response.headers["access-control-allow-origin"], "http://localhost:3000")
