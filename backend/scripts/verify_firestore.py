r"""실제 Firestore와 HTTP 모임 API를 검증한다. 인증정보/예외 원문은 출력하지 않는다.

backend에서 환경변수 로더 실행 후:
  .venv\Scripts\python -m scripts.verify_firestore
생성한 검증용 모임만 정리하며 기존 모임·demo-m1은 수정하지 않는다.
"""

import argparse
from datetime import datetime, time as day_time, timedelta
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import time
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from uuid import uuid4

from db import get_client
from meetup_time import KST


def main() -> int:
    parser = argparse.ArgumentParser(description="Firestore 실접속·모임 생성/참여·재시작 영속성 검사")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--base-url", help="배포 서버 URL. 지정하면 로컬 서버 시작/재시작을 생략합니다.")
    args = parser.parse_args()
    source = os.environ.get("CAMPUS_SOURCE")
    if os.environ.get("STORAGE") != "firestore" or source not in ("demo", "seed"):
        print("먼저 STORAGE=firestore, CAMPUS_SOURCE=seed 또는 demo를 설정하세요.")
        return 1
    if not os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON"):
        print("인증 JSON 환경변수가 없습니다. 로더를 먼저 실행하세요.")
        return 1

    marker = "verify-" + uuid4().hex
    collection = None
    server = None
    stage = "local_port"
    succeeded = False
    cleaned = True
    base = args.base_url.rstrip("/") if args.base_url else f"http://127.0.0.1:{args.port}"

    def request(path, body=None):
        raw = None if body is None else json.dumps(body).encode("utf-8")
        req = Request(base + path, data=raw, headers={"Content-Type": "application/json"})
        try:
            response = urlopen(req, timeout=25)
        except HTTPError as error:
            # 서버 본문은 일반 오류 형식이어도 진단 출력에 넣지 않는다.
            error.close()
            raise RuntimeError("HTTP request failed") from None
        with response:
            return response.status, json.load(response), response.headers

    def start_server():
        process = subprocess.Popen(
            [sys.executable, "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", str(args.port), "--workers", "1"],
            cwd=Path(__file__).resolve().parents[1],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        try:
            deadline = time.monotonic() + 15
            while time.monotonic() < deadline:
                if process.poll() is not None:
                    raise RuntimeError("Server exited")
                try:
                    status, body, headers = request("/api/health")
                    assert status == 200 and body["storage"] == "firestore"
                    assert headers["X-Campus-Source"] == source
                    return process
                except URLError:
                    time.sleep(0.1)
            raise TimeoutError("Server startup timed out")
        except BaseException:
            process.terminate()
            process.wait(timeout=5)
            raise

    try:
        # 이미 사용 중인 서버에 요청하지 않도록 시작 전 포트를 확인한다.
        if not args.base_url:
            with socket.socket() as probe:
                probe.bind(("127.0.0.1", args.port))

        stage = "firestore_read"
        client = get_client()
        collection = client.collection("meetups")
        assert not collection.document(marker).get(timeout=10, retry=None).exists
        print("PASS: 실제 Firestore 읽기", flush=True)

        stage = "server_start"
        if not args.base_url:
            server = start_server()
        if source == "seed":
            status, rooms, _ = request("/api/rooms?at=2026-11-10T14%3A10%3A00%2B09%3A00")
            assert status == 200 and len(rooms["rooms"]) == 26
            print("PASS: 실제 시간표 시드 26개 / 강의실 API", flush=True)
        next_day = datetime.now(KST).date() + timedelta(days=1)
        start = datetime.combine(next_day, day_time(21), KST)
        stage = "create"
        status, body, _ = request("/api/meetups", {
            "roomId": "eng-304", "title": "연결 검증용 모임", "category": "etc",
            "description": "Firestore 연결 자동 검증 후 정리되는 임시 모임",
            "startAt": start.isoformat(), "endAt": (start + timedelta(minutes=30)).isoformat(),
            "maxMembers": 2, "userId": marker, "nickname": "검증호스트",
        })
        assert status == 201 and body["meetup"]["memberCount"] == 1
        meetup_id = body["meetup"]["id"]
        status, listed, _ = request("/api/meetups?roomId=eng-304")
        assert status == 200 and any(item["id"] == meetup_id for item in listed["meetups"])
        print("PASS: 별도 HTTP 요청에서 생성된 모임 조회", flush=True)
        reference = collection.document(meetup_id)
        saved = reference.get(timeout=10, retry=None).to_dict()
        assert saved["hostId"] == marker and isinstance(saved["startAt"], datetime)
        assert "memberCount" not in saved and "buildingName" not in saved
        print("PASS: 생성 201 / Firestore 실제 쓰기 / Timestamp", flush=True)

        stage = "join"
        status, joined, _ = request(f"/api/meetups/{meetup_id}/join", {"userId": marker + "-guest", "nickname": "검증참가자"})
        assert status == 200 and joined["meetup"]["memberCount"] == 2
        assert len(reference.get(timeout=10, retry=None).to_dict()["members"]) == 2
        print("PASS: 참여 200 / Firestore 인원 1 → 2", flush=True)

        stage = "duplicate_join"
        status, duplicate, _ = request(f"/api/meetups/{meetup_id}/join", {"userId": marker + "-guest", "nickname": "검증참가자"})
        assert status == 200 and duplicate["meetup"]["memberCount"] == 2
        print("PASS: 동일 참가자 중복 참여 시 인원 유지", flush=True)
        stage = "restart" if not args.base_url else "read_back"
        if server is not None:
            server.terminate()
            server.wait(timeout=5)
            server = None
            server = start_server()
        status, persisted, _ = request(f"/api/meetups/{meetup_id}")
        assert status == 200 and persisted == joined
        print("PASS: " + ("배포 서버 재조회" if args.base_url else "서버 재시작") + " 후 모임·참여 인원 유지", flush=True)
        succeeded = True
    except Exception as exc:
        # JSON, 키, SDK 인증 예외 원문, 프로젝트 식별자는 출력하지 않는다.
        print(f"FAIL: stage={stage}, type={type(exc).__name__}", flush=True)
    finally:
        if server is not None:
            server.terminate()
            server.wait(timeout=5)
        if collection is not None:
            try:
                from google.cloud.firestore_v1.base_query import FieldFilter
                for snapshot in collection.where(filter=FieldFilter("hostId", "==", marker)).stream(timeout=10, retry=None):
                    snapshot.reference.delete(timeout=10, retry=None)
                    assert not snapshot.reference.get(timeout=10, retry=None).exists
                print("PASS: 이번 검증용 모임만 정리 / 기존 데이터 유지", flush=True)
            except Exception as exc:
                cleaned = False
                print(f"FAIL: stage=cleanup, type={type(exc).__name__}, verificationId={marker}", flush=True)
    return 0 if succeeded and cleaned else 1


if __name__ == "__main__":
    raise SystemExit(main())
